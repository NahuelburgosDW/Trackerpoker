import { useState } from 'react';
import { RouterProvider, useRouter } from '@/lib/router';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { ProfilePage } from '@/pages/ProfilePage';
import { ResultsPage } from '@/pages/ResultsPage';
import { StatisticsPage } from '@/pages/StatisticsPage';
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminImport } from '@/pages/admin/AdminImport';
import { AdminTournaments } from '@/pages/admin/AdminTournaments';
import { AdminProfile } from '@/pages/admin/AdminProfile';
import { YEARS } from '@/data/mock';
import { X } from 'lucide-react';

function AppShell() {
  const { path } = useRouter();
  const [year, setYear] = useState(YEARS[YEARS.length - 1]);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = path.startsWith('/admin');
  const SidebarComp = isAdmin ? AdminSidebar : Sidebar;

  return (
    <div className="flex h-screen overflow-hidden bg-ink-900">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-ink-700/60 bg-ink-850 md:block">
        <SidebarComp onNavigate={() => setMobileOpen(false)} />
      </aside>

      {/* Mobile drawer */}
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

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar year={year} onYear={setYear} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
            <Routes year={year} />
          </div>
        </main>
      </div>
    </div>
  );
}

function Routes({ year }: { year: number }) {
  const { path } = useRouter();

  if (path === '/') return <ProfilePage />;
  if (path === '/results') return <ResultsPage />;
  if (path === '/statistics') return <StatisticsPage />;
  if (path === '/admin') return <AdminDashboard />;
  if (path === '/admin/import') return <AdminImport />;
  if (path === '/admin/tournaments') return <AdminTournaments />;
  if (path === '/admin/profile') return <AdminProfile />;

  // fallback
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="font-display text-2xl font-semibold mb-2">Page not found</h2>
      <p className="text-ink-300">The page you're looking for doesn't exist.</p>
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <AppShell />
    </RouterProvider>
  );
}
