import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 3001),
  masterSheetId: process.env.MASTER_SHEET_ID || '',
  googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  authSalt: process.env.AUTH_SALT || 'pokertracker-dev-salt-change-me',
};

export function isServerConfigured() {
  return Boolean(config.masterSheetId && config.googleCredentialsPath);
}
