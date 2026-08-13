export function parsePublicSlug(path: string): string | null {
  const match = path.match(/^\/u\/([^/]+)/);
  return match ? match[1] : null;
}

export function isRegisterPage(path: string) {
  return path === '/' || path === '/register';
}

export function isAuthPage(path: string) {
  return isRegisterPage(path) || path === '/login' || path === '/forgot-password';
}

export function isOwnProfile(path: string, slug: string | undefined) {
  const publicSlug = parsePublicSlug(path);
  if (!publicSlug || !slug) return false;
  return publicSlug === slug;
}
