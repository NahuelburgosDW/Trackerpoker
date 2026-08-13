import { RouterProvider, useRouter } from '@/lib/router';
import { AuthProvider, useAuth, isProtectedAdminPath, profilePath } from '@/lib/auth';
import { AppDataProvider, useAppData } from '@/hooks/useAppData';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { ProfilePage } from '@/pages/ProfilePage';
import { ResultsPage } from '@/pages/ResultsPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminImport } from '@/pages/admin/AdminImport';
import { AdminTournaments } from '@/pages/admin/AdminTournaments';
import { AdminProfile } from '@/pages/admin/AdminProfile';
import { HandsPage } from '@/pages/HandsPage';
import { DataStatusBar } from '@/components/ui/DataStatusBar';
import { parsePublicSlug, isAuthPage, isRegisterPage } from '@/lib/routes';
import { needsSheetConnection } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

function AppShell() {
  const { path, navigate } = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminArea = path.startsWith('/admin');
  const authPage = isAuthPage(path);
  const publicSlug = parsePublicSlug(path);
  const showAdminLayout = isAdminArea && isAuthenticated;

  useEffect(() => {
    if (path === '/register') {
      navigate('/');
      return;
    }
    if (isRegisterPage(path) && isAuthenticated && user && !needsSheetConnection(user)) {
      navigate(profilePath(user.slug));
      return;
    }
    if (isProtectedAdminPath(path) && !isAuthenticated) {
      navigate('/login');
    }
    if (path === '/hands' && !isAuthenticated) {
      navigate('/login');
    }
    if (path === '/login' && isAuthenticated && user && !needsSheetConnection(user)) {
      navigate(profilePath(user.slug));
    }
    if (path === '/forgot-password' && isAuthenticated && user && !needsSheetConnection(user)) {
      navigate(profilePath(user.slug));
    }
  }, [path, isAuthenticated, user, navigate]);

  if (authPage) {
    return (
      <div className="flex min-h-screen flex-col bg-ink-900">
        <Topbar variant="login" />
        {path === '/login' ? <LoginPage /> : path === '/forgot-password' ? <ForgotPasswordPage /> : <RegisterPage />}
      </div>
    );
  }

  const SidebarComp = showAdminLayout ? AdminSidebar : Sidebar;

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900">
      <aside className="hidden w-64 flex-shrink-0 border-r border-ink-700/60 bg-ink-850 md:block">
        <SidebarComp onNavigate={() => setMobileOpen(false)} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-ink-700/60 bg-ink-850 animate-fade-up">
            <button onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 grid h-8 w-8 place-items-center rounded-lg text-ink-300 hover:text-white hover:bg-ink-700 transition z-10">
              <X className="h-4 w-4" />
            </button>
            <SidebarComp onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar onMenu={() => setMobileOpen(true)} variant={showAdminLayout ? 'admin' : 'public'} publicSlug={publicSlug} />
        <DataStatusBar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <Routes />
          </div>
        </main>
      </div>
    </div>
  );
}

function Routes() {
  const { path } = useRouter();
  const { isAuthenticated } = useAuth();
  const { loading } = useAppData();

  const publicSlug = parsePublicSlug(path);

  if (loading && !isAuthPage(path)) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
        <p className="text-sm text-ink-300">Cargando perfil...</p>
      </div>
    );
  }

  if (publicSlug && path === `/u/${publicSlug}`) return <ProfilePage />;
  if (path === '/results') return <ResultsPage />;
  if (path === '/statistics') return <StatisticsPage />;
  if (path === '/hands') {
    if (!isAuthenticated) return null;
    return <HandsPage />;
  }

  if (isProtectedAdminPath(path) && !isAuthenticated) return null;

  if (path === '/admin') return <AdminDashboard />;
  if (path === '/admin/import') return <AdminImport />;
  if (path === '/admin/tournaments') return <AdminTournaments />;
  if (path === '/admin/profile') return <AdminProfile />;

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="font-display text-2xl font-semibold mb-2">Página no encontrada</h2>
      <p className="text-ink-300">La ruta que buscás no existe.</p>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <AppDataProvider>
          <AppShell />
        </AppDataProvider>
      </AuthProvider>
    </RouterProvider>
  );
}
