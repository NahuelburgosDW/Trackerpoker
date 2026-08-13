export type RegistryUser = {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  pokerSheetId: string;
  pokerSheetUrl: string;
  createdAt: string;
  hasRecoveryCode: boolean;
};

export type UserRow = Omit<RegistryUser, 'hasRecoveryCode'> & {
  passwordHash: string;
  recoveryCode: string;
};

export const USERS_TAB = 'Users';
export const USER_HEADERS = [
  'id', 'email', 'displayName', 'passwordEnc', 'slug', 'pokerSheetId', 'pokerSheetUrl', 'createdAt', 'recoveryCode',
] as const;
