/** Extrae el ID del spreadsheet desde un link compartido de Google Sheets */
export function parseSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // URL completa: .../spreadsheets/d/SHEET_ID/...
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (urlMatch) return urlMatch[1];

  // Solo el ID (44 chars aprox)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

export function buildSheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
}
