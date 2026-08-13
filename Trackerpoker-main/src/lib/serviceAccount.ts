export const SERVICE_ACCOUNT_EMAIL = 'trackerpoker@optical-forest-435100-p3.iam.gserviceaccount.com';

export function missingServiceAccountMessage(email = SERVICE_ACCOUNT_EMAIL): string {
  return `No agregaste ${email} como Editor en tu Google Sheet. Andá a Compartir → Agregar personas → pegá ese email → Editor → Enviar.`;
}
