const SHEET_ID_KEY = 'pokertracker_sheet_id';
const SHEET_URL_KEY = 'pokertracker_sheet_url';
const TOKEN_KEY = 'pokertracker_google_token';
const TOKEN_EXP_KEY = 'pokertracker_google_token_exp';

export type SheetConnection = {
  spreadsheetId: string;
  sheetUrl: string;
  accessToken: string | null;
  tokenExpiresAt: number | null;
};

export function getSheetConnection(): SheetConnection | null {
  const spreadsheetId = localStorage.getItem(SHEET_ID_KEY);
  if (!spreadsheetId) return null;

  const token = localStorage.getItem(TOKEN_KEY);
  const exp = localStorage.getItem(TOKEN_EXP_KEY);

  return {
    spreadsheetId,
    sheetUrl: localStorage.getItem(SHEET_URL_KEY) ?? buildUrl(spreadsheetId),
    accessToken: token,
    tokenExpiresAt: exp ? parseInt(exp, 10) : null,
  };
}

export function saveSheetConnection(spreadsheetId: string, sheetUrl: string) {
  localStorage.setItem(SHEET_ID_KEY, spreadsheetId);
  localStorage.setItem(SHEET_URL_KEY, sheetUrl);
}

export function saveAccessToken(token: string, expiresInSeconds: number) {
  const expiresAt = Date.now() + expiresInSeconds * 1000 - 60_000; // 1 min buffer
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXP_KEY, String(expiresAt));
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXP_KEY);
}

export function disconnectSheet() {
  localStorage.removeItem(SHEET_ID_KEY);
  localStorage.removeItem(SHEET_URL_KEY);
  clearAccessToken();
}

export function isTokenValid(conn: SheetConnection | null): boolean {
  if (!conn?.accessToken || !conn.tokenExpiresAt) return false;
  return Date.now() < conn.tokenExpiresAt;
}

function buildUrl(id: string) {
  return `https://docs.google.com/spreadsheets/d/${id}/edit`;
}
