export type RegistryUser = {
  id: string;
  email: string;
  displayName: string;
  slug: string;
  pokerSheetId: string;
  pokerSheetUrl: string;
  createdAt: string;
  hasRecoveryCode?: boolean;
};

export type RegisterAccountPayload = {
  email: string;
  password: string;
  slug: string;
};

export type RegisterAccountResult = {
  user: RegistryUser;
  recoveryCode: string;
};

export type LinkPokerSheetPayload = {
  userId: string;
  pokerSheetId: string;
  pokerSheetUrl: string;
};
