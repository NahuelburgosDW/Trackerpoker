import express from 'express';
import { config, isServerConfigured } from './config.js';
import {
  countUsers, findBySlug, linkPokerSheet, login, registerAccount,
  resetPasswordWithRecovery, rotateRecoveryCode,
} from './lib/users-repository.js';
import { buildSheetUrl, parseSpreadsheetId } from './lib/password.js';
import { getServiceAccountEmail } from './lib/sheets-client.js';
import { validatePassword, MAX_TOURNAMENTS_PER_IMPORT } from './lib/validation.js';
import {
  deletePokerTournament, fetchPokerSheetData, initializePokerSheet, logPokerImport,
  updatePokerPlayer, upsertPokerHands, upsertPokerTournaments, verifyPokerSheetWriteAccess,
} from './lib/poker-sheet.js';

const app = express();

const CORS_ORIGINS = new Set([
  'https://tracker-two-rose.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...config.frontendOrigins.filter((o) => /^https?:\/\//i.test(o)),
]);

// CORS manual (preflight inclusive) — evita que Express responda OPTIONS sin headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json({ limit: '25mb' }));

app.get('/api/health', async (_req, res) => {
  if (!isServerConfigured()) {
    console.error('Health: backend sin MASTER_SHEET_ID o credenciales Google');
    res.status(503).json({
      ok: false,
      error: 'Servicio temporalmente no disponible',
    });
    return;
  }

  try {
    const usersCount = await countUsers();
    res.json({
      ok: true,
      registry: true,
      usersTab: true,
      usersCount,
      version: 3,
      backend: 'express',
      serviceAccountEmail: getServiceAccountEmail(),
    });
  } catch (err) {
    console.error('Health: error Sheet maestro', err);
    res.status(500).json({
      ok: false,
      error: 'Servicio temporalmente no disponible',
    });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, slug } = req.body as { email?: string; password?: string; slug?: string };
    if (!email || !password || !slug) {
      res.status(400).json({ ok: false, error: 'Email, contraseña y usuario son obligatorios' });
      return;
    }
    const { user, recoveryCode } = await registerAccount(email, password, slug);
    res.json({ ok: true, user, recoveryCode });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'Error al registrar' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body as { identifier?: string; password?: string };
    if (!identifier?.trim() || !password) {
      res.status(400).json({ ok: false, error: 'Usuario y contraseña son obligatorios' });
      return;
    }
    validatePassword(password);
    const user = await login(identifier, password);
    res.json({ ok: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al iniciar sesión';
    const status = message.includes('contraseña') && !message.includes('incorrectos') ? 400 : 401;
    res.status(status).json({ ok: false, error: message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { identifier, recoveryCode, newPassword } = req.body as {
      identifier?: string; recoveryCode?: string; newPassword?: string;
    };
    if (!identifier?.trim() || !recoveryCode || !newPassword) {
      res.status(400).json({ ok: false, error: 'Usuario, código de recuperación y nueva contraseña son obligatorios' });
      return;
    }
    const user = await resetPasswordWithRecovery(identifier, recoveryCode, newPassword);
    res.json({ ok: true, user });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'Error al restablecer contraseña' });
  }
});

app.post('/api/auth/recovery-code', async (req, res) => {
  try {
    const { userId, password } = req.body as { userId?: string; password?: string };
    if (!userId || !password) {
      res.status(400).json({ ok: false, error: 'Usuario y contraseña son obligatorios' });
      return;
    }
    const recoveryCode = await rotateRecoveryCode(userId, password);
    res.json({ ok: true, recoveryCode });
  } catch (err) {
    res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'Error al generar código' });
  }
});

app.patch('/api/users/:userId/sheet', async (req, res) => {
  try {
    const { userId } = req.params;
    const { pokerSheetUrl } = req.body as { pokerSheetUrl?: string };
    if (!pokerSheetUrl) {
      res.status(400).json({ ok: false, error: 'Falta el link del Google Sheet' });
      return;
    }
    const pokerSheetId = parseSpreadsheetId(pokerSheetUrl);
    if (!pokerSheetId) {
      res.status(400).json({ ok: false, error: 'Link del Google Sheet inválido' });
      return;
    }
    const user = await linkPokerSheet(userId, pokerSheetId, buildSheetUrl(pokerSheetId));
    await initializePokerSheet(pokerSheetId, user.slug, user.displayName);
    res.json({ ok: true, user });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al vincular Sheet';
    const status = message.includes('Sin permiso') ? 403 : 400;
    res.status(status).json({ ok: false, error: message });
  }
});

app.get('/api/users/by-slug/:slug', async (req, res) => {
  try {
    const user = await findBySlug(req.params.slug);
    res.json({ ok: true, user: user ? {
      id: user.id,
      email: user.email,
      displayName: user.displayName || user.slug,
      slug: user.slug,
      pokerSheetId: user.pokerSheetId,
      pokerSheetUrl: user.pokerSheetUrl,
      createdAt: user.createdAt,
    } : null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Error en lookup' });
  }
});

app.get('/api/poker-sheets/:sheetId/data', async (req, res) => {
  try {
    const data = await fetchPokerSheetData(req.params.sheetId);
    res.json({ ok: true, data });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Error leyendo Sheet' });
  }
});

app.post('/api/poker-sheets/:sheetId/check-access', async (req, res) => {
  try {
    const result = await verifyPokerSheetWriteAccess(req.params.sheetId);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Sin permiso de escritura' });
  }
});

app.post('/api/poker-sheets/:sheetId/init', async (req, res) => {
  try {
    const { slug, displayName } = req.body as { slug?: string; displayName?: string };
    if (!slug) {
      res.status(400).json({ ok: false, error: 'Falta slug' });
      return;
    }
    const player = await initializePokerSheet(req.params.sheetId, slug, displayName);
    res.json({ ok: true, player });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Error inicializando Sheet' });
  }
});

app.put('/api/poker-sheets/:sheetId/player', async (req, res) => {
  try {
    const player = await updatePokerPlayer(req.params.sheetId, req.body);
    res.json({ ok: true, player });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Error actualizando perfil' });
  }
});

app.post('/api/poker-sheets/:sheetId/tournaments', async (req, res) => {
  try {
    const { tournaments } = req.body as { tournaments?: unknown[] };
    if (!Array.isArray(tournaments)) {
      res.status(400).json({ ok: false, error: 'Se esperaba un array de torneos' });
      return;
    }
    if (tournaments.length === 0) {
      res.json({ ok: true, result: { found: 0, newCount: 0, duplicates: 0, errors: 0 } });
      return;
    }
    if (tournaments.length > MAX_TOURNAMENTS_PER_IMPORT) {
      res.status(400).json({ ok: false, error: `Máximo ${MAX_TOURNAMENTS_PER_IMPORT} torneos por importación` });
      return;
    }
    const result = await upsertPokerTournaments(req.params.sheetId, tournaments as never[]);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Error guardando torneos' });
  }
});

app.post('/api/poker-sheets/:sheetId/hands', async (req, res) => {
  try {
    const { hands } = req.body as { hands?: unknown[] };
    if (!Array.isArray(hands)) {
      res.status(400).json({ ok: false, error: 'Se esperaba un array de manos' });
      return;
    }
    if (hands.length > 2000) {
      res.status(400).json({ ok: false, error: 'Máximo 2000 manos por importación' });
      return;
    }
    const result = await upsertPokerHands(req.params.sheetId, hands as never[]);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Error guardando manos' });
  }
});

app.delete('/api/poker-sheets/:sheetId/tournaments/:id', async (req, res) => {
  try {
    await deletePokerTournament(req.params.sheetId, req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Error eliminando torneo' });
  }
});

app.post('/api/poker-sheets/:sheetId/import-log', async (req, res) => {
  try {
    await logPokerImport(req.params.sheetId, req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(403).json({ ok: false, error: err instanceof Error ? err.message : 'Error guardando import log' });
  }
});

app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  const e = err as { type?: string; status?: number; message?: string };
  if (e?.type === 'entity.too.large' || e?.status === 413) {
    res.status(413).json({
      ok: false,
      error: 'Payload demasiado grande. Importá menos archivos a la vez o reiniciá el servidor.',
    });
    return;
  }
  next(err);
});

app.listen(config.port, () => {
  console.log(`PokerTracker API → puerto ${config.port}`);
  console.log(`CORS origins: ${(corsOptions.origin as string[]).join(', ')}`);
  if (!isServerConfigured()) {
    console.warn(
      '⚠️  Configurá MASTER_SHEET_ID y GOOGLE_SERVICE_ACCOUNT_JSON (o GOOGLE_APPLICATION_CREDENTIALS)',
    );
  }
});
