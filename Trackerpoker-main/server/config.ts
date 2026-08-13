import 'dotenv/config';

function splitOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export const config = {
  port: Number(process.env.PORT || 3001),
  masterSheetId: process.env.MASTER_SHEET_ID || '',
  /** Path local al JSON (dev). En Railway preferí GOOGLE_SERVICE_ACCOUNT_JSON. */
  googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  /** Contenido completo del JSON de la service account (Railway). */
  googleServiceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '',
  authSalt: process.env.AUTH_SALT || 'pokertracker-dev-salt-change-me',
  /** Orígenes permitidos del frontend (coma-separados). Vacío = solo localhost en CORS. */
  frontendOrigins: splitOrigins(process.env.FRONTEND_URL),
};

export function isServerConfigured() {
  return Boolean(
    config.masterSheetId
    && (config.googleServiceAccountJson || config.googleCredentialsPath),
  );
}
