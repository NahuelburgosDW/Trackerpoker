import { RouterProvider, useRouter } from '@/lib/router';
import { AuthProvider, useAuth, isProtectedAdminPath, profilePath, needsSheetConnection } from '@/lib/auth';
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
import { ConnectSheetStep } from '@/pages/ConnectSheetStep';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminImport } from '@/pages/admin/AdminImport';
import { AdminTournaments } from '@/pages/admin/AdminTournaments';
import { AdminProfile } from '@/pages/admin/AdminProfile';
import { HandsPage } from '@/pages/HandsPage';
import { DataStatusBar } from '@/components/ui/DataStatusBar';
import {
  parsePublicSlug, isAuthPage, isLoginPage, isRegisterPage, isConnectSheetPage,
} from '@/lib/routes';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

function AppShell() {
  const { path, navigate } = useRouter();
  const { isAuthenticated, user, needsSheet } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdminArea = path.startsWith('/admin');
  const publicSlug = parsePublicSlug(path);
  const showAdminLayout = isAdminArea && isAuthenticated && !needsSheet;
  const mustConnectSheet = Boolean(isAuthenticated && user && needsSheet);

  useEffect(() => {
    if (path === '/login') {
      navigate('/');
      return;
    }

    // Sin Sheet vinculado: solo /connect-sheet o /register (código de recuperación)
    if (mustConnectSheet) {
      if (!isConnectSheetPage(path) && !isRegisterPage(path)) {
        navigate('/connect-sheet');
      }
      return;
    }

    if (isConnectSheetPage(path)) {
      if (!isAuthenticated) {
        navigate('/');
        return;
      }
      if (user && !needsSheetConnection(user)) {
        navigate(profilePath(user.slug));
      }
      return;
    }

    if (isLoginPage(path) && isAuthenticated && user) {
      navigate(profilePath(user.slug));
      return;
    }
    if (isRegisterPage(path) && isAuthenticated && user) {
      navigate(profilePath(user.slug));
      return;
    }
    if (isProtectedAdminPath(path) && !isAuthenticated) {
      navigate('/');
      return;
    }
    if (path === '/hands' && !isAuthenticated) {
      navigate('/');
      return;
    }
    if (path === '/forgot-password' && isAuthenticated && user) {
      navigate(profilePath(user.slug));
    }
  }, [path, isAuthenticated, user, mustConnectSheet, navigate]);

  // Gate duro: sin link de Sheet no se renderiza el resto de la app
  // /register se permite solo para mostrar el código de recuperación
  if (mustConnectSheet && user) {
    if (isRegisterPage(path)) {
      return (
        <div className="flex min-h-screen flex-col bg-ink-900">
          <Topbar variant="login" />
          <RegisterPage />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col bg-ink-900">
        <Topbar variant="login" />
        <ConnectSheetStep
          username={user.slug}
          onDone={() => navigate(profilePath(user.slug))}
        />
      </div>
    );
  }

  if (isAuthPage(path)) {
    return (
      <div className="flex min-h-screen flex-col bg-ink-900">
        <Topbar variant="login" />
        {isLoginPage(path) ? (
          <LoginPage />
        ) : path === '/forgot-password' ? (
          <ForgotPasswordPage />
        ) : isConnectSheetPage(path) ? (
          <LoginPage />
        ) : (
          <RegisterPage />
        )}
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
  const { isAuthenticated, needsSheet } = useAuth();
  const { loading } = useAppData();

  const publicSlug = parsePublicSlug(path);

  // Defensa extra: nunca renderizar rutas de app sin Sheet
  if (isAuthenticated && needsSheet) return null;

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
