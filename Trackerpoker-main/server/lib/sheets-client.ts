import { readFileSync } from 'node:fs';
import { google } from 'googleapis';
import { config } from '../config.js';

let sheetsApi: ReturnType<typeof google.sheets> | null = null;
let serviceAccountEmail: string | null = null;

export function getServiceAccountEmail(): string {
  if (serviceAccountEmail) return serviceAccountEmail;
  const raw = readFileSync(config.googleCredentialsPath, 'utf8');
  serviceAccountEmail = (JSON.parse(raw) as { client_email: string }).client_email;
  return serviceAccountEmail!;
}

export function getSheetsClient() {
  if (sheetsApi) return sheetsApi;

  const raw = readFileSync(config.googleCredentialsPath, 'utf8');
  const credentials = JSON.parse(raw) as {
    client_email: string;
    private_key: string;
  };

  serviceAccountEmail = credentials.client_email;

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsApi = google.sheets({ version: 'v4', auth });
  return sheetsApi;
}

export async function getSheetValues(spreadsheetId: string, range: string) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return res.data.values ?? [];
}

export async function appendSheetRow(spreadsheetId: string, range: string, values: unknown[]) {
  return appendSheetRows(spreadsheetId, range, [values]);
}

export async function appendSheetRows(
  spreadsheetId: string,
  range: string,
  values: unknown[][],
  valueInputOption: 'USER_ENTERED' | 'RAW' = 'USER_ENTERED',
) {
  if (values.length === 0) return;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption,
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values },
  });
}

export async function updateSheetRange(spreadsheetId: string, range: string, values: unknown[][]) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

export async function clearSheetRange(spreadsheetId: string, range: string) {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range,
  });
}

export async function protectEntireTab(
  spreadsheetId: string,
  tabName: string,
  description: string,
) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties,sheets.protectedRanges',
  });

  const tab = meta.data.sheets?.find((s) => s.properties?.title === tabName);
  const sheetId = tab?.properties?.sheetId;
  if (sheetId == null) return;

  const alreadyLocked = (tab.protectedRanges ?? []).some((range) => {
    const r = range.range;
    if (!r || r.sheetId !== sheetId || range.warningOnly) return false;
    return r.startRowIndex == null
      && r.startColumnIndex == null
      && r.endRowIndex == null
      && r.endColumnIndex == null;
  });
  if (alreadyLocked) return;

  const protectedRange = {
    description,
    warningOnly: false as const,
    range: { sheetId },
    editors: {
      users: [getServiceAccountEmail()],
      domainUsersCanEdit: false,
    },
  };

  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addProtectedRange: { protectedRange } }],
      },
    });
  } catch (err) {
    try {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addProtectedRange: {
              protectedRange: {
                ...protectedRange,
                editors: { domainUsersCanEdit: false },
              },
            },
          }],
        },
      });
    } catch (retryErr) {
      console.warn('No se pudo bloquear la pestaña', tabName, retryErr instanceof Error ? retryErr.message : retryErr);
      void err;
    }
  }
}

export async function ensureSheetTabs(spreadsheetId: string, tabNames: string[]) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  });
  const existing = new Set(
    (meta.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean),
  );
  const toAdd = tabNames.filter((t) => !existing.has(t));
  if (toAdd.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: toAdd.map((title) => ({ addSheet: { properties: { title } } })),
    },
  });
}

// Master sheet helpers
export async function getValues(range: string) {
  return getSheetValues(config.masterSheetId, range);
}

export async function appendRow(range: string, values: unknown[]) {
  return appendSheetRow(config.masterSheetId, range, values);
}

export async function updateRange(range: string, values: unknown[][]) {
  return updateSheetRange(config.masterSheetId, range, values);
}

function permissionHint(): string {
  const email = getServiceAccountEmail();
  return `No agregaste ${email} como Editor. Andá a Compartir → Agregar personas → pegá ese email → Editor → Enviar.`;
}

export function wrapSheetError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('403') || msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
    return new Error(permissionHint());
  }
  return err instanceof Error ? err : new Error(msg);
}
