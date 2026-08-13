/** Parse numbers from Google Sheets (supports 0.25 and locale 0,25 / -8,53). */
export function parseSheetNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let raw = String(value ?? '').trim().replace(/\$/g, '');
  if (!raw) return 0;

  const negative = raw.startsWith('-');
  if (negative) raw = raw.slice(1).trim();

  let n = 0;
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(raw)) {
    // 1.234,56
    n = Number.parseFloat(raw.replace(/\./g, '').replace(',', '.')) || 0;
  } else if (/^\d+,\d+$/.test(raw)) {
    // 8,53
    n = Number.parseFloat(raw.replace(',', '.')) || 0;
  } else {
    // 8.53 or 1,234 or 5120
    n = Number.parseFloat(raw.replace(/,/g, '')) || 0;
  }

  return negative ? -n : n;
}
