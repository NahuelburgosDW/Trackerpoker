export function parsePublicSlug(path: string): string | null {
  const match = path.match(/^\/u\/([^/]+)/);
  return match ? match[1] : null;
}

export function isRegisterPage(path: string) {
  return path === '/register';
}

export function isLoginPage(path: string) {
  return path === '/' || path === '/login';
}

export function isConnectSheetPage(path: string) {
  return path === '/connect-sheet';
}

export function isAuthPage(path: string) {
  return isLoginPage(path)
    || isRegisterPage(path)
    || isConnectSheetPage(path)
    || path === '/forgot-password';
}

export function isOwnProfile(path: string, slug: string | undefined) {
  const publicSlug = parsePublicSlug(path);
  if (!publicSlug || !slug) return false;
  return publicSlug === slug;
}
