import { NavLink, Outlet } from 'react-router-dom';
import { Activity, History, LayoutDashboard, Settings, Users, UserCog } from 'lucide-react';
import { useFamily } from '../contexts/FamilyContext';
import { isDemo } from '../lib/supabase';
import { ReminderBanner } from './ReminderBanner';
import { Suspense } from 'react';
import { Spinner } from './ui';

export function Layout() {
  const { family, selectedId } = useFamily();
  const nav = [
    { to: '/', label: 'Family', icon: Users, end: true },
    ...(selectedId
      ? [
          { to: `/member/${selectedId}`, label: 'Dashboard', icon: LayoutDashboard, end: true },
          { to: `/member/${selectedId}/history`, label: 'History', icon: History, end: false },
        ]
      : []),
    { to: '/profiles', label: 'Profiles', icon: UserCog, end: false },
    { to: '/settings', label: 'Settings', icon: Settings, end: false },
  ];

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors ${
      isActive ? 'bg-primary-soft text-ink' : 'text-muted hover:bg-subtle hover:text-ink'
    }`;

  return (
    <div className="min-h-screen lg:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line/60 bg-surface p-4 lg:block print:hidden">
        <Brand name={family?.name} />
        <nav aria-label="Main" className="mt-6">
          <ul className="space-y-1">
            {nav.map((n) => (
              <li key={n.label}>
                <NavLink to={n.to} end={n.end} className={linkCls}>
                  <n.icon className="h-5 w-5" aria-hidden />
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 border-b border-line/60 bg-surface/95 px-4 py-3 backdrop-blur lg:hidden print:hidden">
          <Brand name={family?.name} />
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-10 lg:pt-8 print:p-0">
          {isDemo && (
            <p className="mb-4 rounded-xl border border-warn/40 bg-warn-soft px-3 py-2 text-sm text-ink print:hidden">
              <strong>Demo mode:</strong> Supabase is not configured, so sample data is stored only in this browser. See
              the README to connect a database.
            </p>
          )}
          <div className="print:hidden">
            <ReminderBanner />
          </div>
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>

        {/* Mobile bottom navigation */}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line/60 bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden"
        >
          <ul className="flex">
            {nav.map((n) => (
              <li key={n.label} className="flex-1">
                <NavLink
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                      isActive ? 'text-primary' : 'text-muted'
                    }`
                  }
                >
                  <n.icon className="h-6 w-6" aria-hidden />
                  {n.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function Brand({ name }: { name?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-xl bg-accent p-2 text-white dark:text-canvas">
        <Activity className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-bold leading-tight">Family Health Track</p>
        {name && <p className="truncate text-sm text-muted">{name}</p>}
      </div>
    </div>
  );
}
