export function isSheetPermissionError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /no agregaste|sin permiso|403|permission|PERMISSION_DENIED|compartí el sheet|serviceaccount\.com/i.test(message);
}
