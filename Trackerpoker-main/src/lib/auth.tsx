import {
  createContext, useCallback, useContext, useEffect, useState, type ReactNode,
} from 'react';
import type { RegistryUser } from '@/services/registry/types';
import {
  loginUser, registerAccount, linkPokerSheet, slugify, profilePath, needsSheetConnection,
} from '@/services/registry/client';
import { saveSheetConnection, disconnectSheet } from '@/services/sheets/connectionStorage';
import { parseSpreadsheetId, buildSheetUrl } from '@/services/sheets/parseUrl';

const SESSION_KEY = 'pokertracker_user_session';

export type UserSession = RegistryUser;

type AuthCtx = {
  user: UserSession | null;
  isAuthenticated: boolean;
  loading: boolean;
  registerAccount: (email: string, password: string, username: string) => Promise<{ user: UserSession; recoveryCode: string }>;
  login: (identifier: string, password: string) => Promise<UserSession>;
  linkPokerSheet: (pokerSheetUrl: string) => Promise<UserSession>;
  logout: () => void;
  needsSheet: boolean;
};

const Ctx = createContext<AuthCtx | null>(null);

function loadSession(): UserSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as UserSession : null;
  } catch {
    return null;
  }
}

function saveSession(user: UserSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  if (user.pokerSheetId) {
    saveSheetConnection(user.pokerSheetId, user.pokerSheetUrl || buildSheetUrl(user.pokerSheetId));
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(() => loadSession());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.pokerSheetId) {
      saveSheetConnection(user.pokerSheetId, user.pokerSheetUrl || buildSheetUrl(user.pokerSheetId));
    }
  }, [user]);

  const registerAccountFn = useCallback(async (email: string, password: string, username: string) => {
    setLoading(true);
    try {
      const slug = slugify(username);
      if (!slug) throw new Error('Usuario inválido (solo letras, números y guiones)');

      const { user: registered, recoveryCode } = await registerAccount({ email, password, slug });
      saveSession(registered);
      setUser(registered);
      return { user: registered, recoveryCode };
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setLoading(true);
    try {
      const loggedIn = await loginUser(identifier, password);
      saveSession(loggedIn);
      setUser(loggedIn);
      return loggedIn;
    } finally {
      setLoading(false);
    }
  }, []);

  const linkPokerSheetFn = useCallback(async (pokerSheetUrl: string) => {
    if (!user) throw new Error('No hay sesión activa');
    setLoading(true);
    try {
      const pokerSheetId = parseSpreadsheetId(pokerSheetUrl);
      if (!pokerSheetId) throw new Error('Link del Google Sheet inválido');

      const updated = await linkPokerSheet({
        userId: user.id,
        pokerSheetId,
        pokerSheetUrl: buildSheetUrl(pokerSheetId),
      });

      saveSession(updated);
      setUser(updated);
      return updated;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    disconnectSheet();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{
      user,
      isAuthenticated: Boolean(user),
      loading,
      registerAccount: registerAccountFn,
      login,
      linkPokerSheet: linkPokerSheetFn,
      logout,
      needsSheet: needsSheetConnection(user),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function isProtectedAdminPath(path: string) {
  return path.startsWith('/admin');
}

export { profilePath, needsSheetConnection };
