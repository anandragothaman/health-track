import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FamilyProvider, useFamily } from './contexts/FamilyContext';
import { Layout } from './components/Layout';
import { ErrorBox, Spinner } from './components/ui';
import { LoginPage } from './pages/LoginPage';

const FamilySetupPage = lazy(() => import('./pages/FamilySetupPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const FamilyOverviewPage = lazy(() => import('./pages/FamilyOverviewPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BpFormPage = lazy(() => import('./pages/BpFormPage'));
const GlucoseFormPage = lazy(() => import('./pages/GlucoseFormPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const ProfilesPage = lazy(() => import('./pages/ProfilesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

function Gate() {
  const { user, loading, recovery } = useAuth();
  const family = useFamily();

  if (loading) return <Spinner />;
  if (recovery) return <ResetPasswordPage />;
  if (!user) return <LoginPage />;
  if (family.loading && !family.family) return <Spinner label="Loading your family…" />;
  if (family.error)
    return (
      <div className="mx-auto max-w-lg p-6">
        <ErrorBox message={family.error} onRetry={family.reload} />
      </div>
    );
  if (!family.family) return <FamilySetupPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<FamilyOverviewPage />} />
        <Route path="member/:memberId" element={<DashboardPage />} />
        <Route path="member/:memberId/bp/new" element={<BpFormPage />} />
        <Route path="member/:memberId/bp/:readingId/edit" element={<BpFormPage />} />
        <Route path="member/:memberId/glucose/new" element={<GlucoseFormPage />} />
        <Route path="member/:memberId/glucose/:readingId/edit" element={<GlucoseFormPage />} />
        <Route path="member/:memberId/history" element={<HistoryPage />} />
        <Route path="member/:memberId/report" element={<ReportPage />} />
        <Route path="profiles" element={<ProfilesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <FamilyProvider>
        <HashRouter>
          <Suspense fallback={<Spinner />}>
            <Gate />
          </Suspense>
        </HashRouter>
      </FamilyProvider>
    </AuthProvider>
  );
}
