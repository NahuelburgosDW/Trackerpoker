import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode,
} from 'react';
import type { Player, Tournament, KeyHand } from '@/domain/types';
import type { ImportLog, SheetsMeta } from '@/services/sheets/types';
import {
  fetchSheetData, getDataSource, isSheetsConfigured,
  updatePlayerInSheets, upsertTournamentsInSheets, upsertHandsInSheets, deleteTournamentInSheets,
  logImportInSheets, deriveYears,
} from '@/services/sheets/client';
import { lookupUserBySlug, isRegistryConfigured } from '@/services/registry/client';
import { saveSheetConnection, getSheetConnection } from '@/services/sheets/connectionStorage';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { parsePublicSlug } from '@/lib/routes';
import { EMPTY_PLAYER, playerFromSheetOrUser, requireSheetId } from '@/lib/sheetData';
import { isSheetPermissionError } from '@/lib/sheetErrors';
import { toUserFacingError } from '@/lib/userFacingError';

type ErrorKind = 'sheet-permission' | 'generic' | null;

type AppDataCtx = {
  player: Player;
  tournaments: Tournament[];
  hands: KeyHand[];
  importLogs: ImportLog[];
  meta: SheetsMeta;
  years: number[];
  loading: boolean;
  error: string | null;
  errorKind: ErrorKind;
  source: 'sheets' | 'empty';
  sheetId: string | null;
  viewSlug: string | null;
  isOwnData: boolean;
  refetch: () => Promise<void>;
  updatePlayer: (player: Player) => Promise<void>;
  upsertTournaments: (items: Tournament[]) => Promise<{ found: number; newCount: number; duplicates: number; errors: number }>;
  upsertHands: (items: KeyHand[]) => Promise<{ found: number; newCount: number; duplicates: number; errors: number }>;
  deleteTournament: (id: string) => Promise<void>;
  logImport: (log: Omit<ImportLog, 'id'> & { id?: string }) => Promise<void>;
  getPlayerTournaments: (playerId?: string) => Tournament[];
};

const defaultMeta: SheetsMeta = { connected: false, lastSync: null };
const Ctx = createContext<AppDataCtx | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { path } = useRouter();
  const { user } = useAuth();
  const viewSlug = parsePublicSlug(path);

  const [player, setPlayer] = useState<Player>(EMPTY_PLAYER);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [hands, setHands] = useState<KeyHand[]>([]);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [meta, setMeta] = useState<SheetsMeta>(defaultMeta);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);

  const hasSheetContext = Boolean(viewSlug || user?.pokerSheetId || isSheetsConfigured());
  const source = hasSheetContext && isRegistryConfigured() ? 'sheets' : getDataSource();
  const isOwnData = Boolean(user && (!viewSlug || viewSlug === user.slug));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorKind(null);

    try {
      let activeSheetId: string | undefined;
      let sheetUrl: string | undefined;
      let viewingOwn = true;

      if (viewSlug) {
        if (!isRegistryConfigured()) throw new Error('API no configurada');
        const registryUser = await lookupUserBySlug(viewSlug);
        if (!registryUser?.pokerSheetId) {
          throw new Error(`El perfil "/u/${viewSlug}" no tiene Google Sheet vinculado`);
        }
        activeSheetId = registryUser.pokerSheetId;
        sheetUrl = registryUser.pokerSheetUrl;
        viewingOwn = Boolean(user && user.slug === viewSlug);
      } else if (user?.pokerSheetId) {
        activeSheetId = user.pokerSheetId;
        sheetUrl = user.pokerSheetUrl;
        viewingOwn = true;
      } else if (isSheetsConfigured()) {
        const conn = getSheetConnection();
        activeSheetId = conn?.spreadsheetId;
        sheetUrl = conn?.sheetUrl;
        viewingOwn = Boolean(user);
      }

      if (!activeSheetId) {
        setSheetId(null);
        setPlayer(EMPTY_PLAYER);
        setTournaments([]);
        setHands([]);
        setImportLogs([]);
        setMeta({ connected: false, lastSync: null });
        return;
      }

      setSheetId(activeSheetId);
      if (sheetUrl) saveSheetConnection(activeSheetId, sheetUrl);

      const data = await fetchSheetData(activeSheetId);
      setPlayer(playerFromSheetOrUser(data.player, user, viewSlug));
      setTournaments(data.tournaments);
      // Manos clave: solo visibles para el dueño (nunca en perfil público ajeno)
      setHands(viewingOwn ? (data.hands ?? []) : []);
      setImportLogs(data.importLogs);
      setMeta({ ...data.meta, connected: true });

      if (!data.player && user && !viewSlug) {
        setError('Tu Sheet no tiene perfil — completalo desde Admin → Perfil.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      const kind = isSheetPermissionError(message) ? 'sheet-permission' : 'generic';
      setErrorKind(kind);
      setError(
        kind === 'sheet-permission'
          ? message
          : toUserFacingError(message, 'No se pudieron cargar los datos. Intentá de nuevo más tarde.'),
      );
      setPlayer(playerFromSheetOrUser(null, user, viewSlug));
      setTournaments([]);
      setHands([]);
      setImportLogs([]);
      setMeta({ connected: false, lastSync: null });
    } finally {
      setLoading(false);
    }
  }, [viewSlug, user]);

  useEffect(() => {
    load();
  }, [load]);

  const years = useMemo(() => deriveYears(tournaments), [tournaments]);

  const getPlayerTournaments = useCallback(
    (playerId?: string) => {
      const id = playerId ?? player.id;
      const owned = tournaments.filter((t) => t.playerId === id);
      return owned.length > 0 ? owned : tournaments;
    },
    [tournaments, player.id],
  );

  const updatePlayer = useCallback(async (next: Player) => {
    const id = requireSheetId(sheetId);
    const saved = await updatePlayerInSheets(next, id);
    setPlayer(saved);
  }, [sheetId]);

  const upsertTournaments = useCallback(async (items: Tournament[]) => {
    const id = requireSheetId(sheetId);
    const result = await upsertTournamentsInSheets(items, id);
    await load();
    return result;
  }, [sheetId, load]);

  const upsertHands = useCallback(async (items: KeyHand[]) => {
    const id = requireSheetId(sheetId);
    const result = await upsertHandsInSheets(items, id);
    await load();
    return result;
  }, [sheetId, load]);

  const deleteTournament = useCallback(async (tournamentId: string) => {
    const id = requireSheetId(sheetId);
    await deleteTournamentInSheets(tournamentId, id);
    await load();
  }, [sheetId, load]);

  const logImport = useCallback(async (log: Omit<ImportLog, 'id'> & { id?: string }) => {
    const id = requireSheetId(sheetId);
    await logImportInSheets(log, id);
    await load();
  }, [sheetId, load]);

  const value = useMemo(
    () => ({
      player, tournaments, hands, importLogs, meta, years, loading, error, errorKind, source, sheetId, viewSlug, isOwnData,
      refetch: load, updatePlayer, upsertTournaments, upsertHands, deleteTournament, logImport, getPlayerTournaments,
    }),
    [player, tournaments, hands, importLogs, meta, years, loading, error, errorKind, source, sheetId, viewSlug, isOwnData, load, updatePlayer, upsertTournaments, upsertHands, deleteTournament, logImport, getPlayerTournaments],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
