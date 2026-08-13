const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/spreadsheets',
].join(' ');

let scriptLoaded = false;

function loadGoogleScript(): Promise<void> {
  if (scriptLoaded && window.google?.accounts?.oauth2) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      const check = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(check);
          scriptLoaded = true;
          resolve();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
    document.head.appendChild(script);
  });
}

export function getGoogleClientId(): string | undefined {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
}

export function isGoogleConfigured(): boolean {
  return Boolean(getGoogleClientId()?.trim());
}

export type GoogleUserInfo = {
  sub: string;
  email: string;
  name: string;
  picture?: string;
};

export async function requestGoogleAccessToken(): Promise<{ token: string; expiresIn: number }> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Falta VITE_GOOGLE_CLIENT_ID en .env');
  }

  await loadGoogleScript();

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }
        if (!response.access_token) {
          reject(new Error('No se recibió token de acceso'));
          return;
        }
        resolve({
          token: response.access_token,
          expiresIn: response.expires_in ?? 3600,
        });
      },
    });
    client.requestAccessToken();
  });
}

export async function fetchGoogleUserInfo(token: string): Promise<GoogleUserInfo> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudo obtener info de Google');
  const json = await res.json();
  return {
    sub: json.sub,
    email: json.email,
    name: json.name ?? json.email,
    picture: json.picture,
  };
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              expires_in?: number;
              error?: string;
              error_description?: string;
            }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}
