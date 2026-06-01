import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/shared/LoadingState';

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const HistoryPage = lazy(() => import('@/pages/History').then((m) => ({ default: m.HistoryPage })));
const Diagnose = lazy(() => import('@/pages/Diagnose'));
const SettingsPage = lazy(() => import('@/pages/Settings'));

// Tool category bundles (lazy)
const N = lazy(() => import('@/pages/network'));
const D = lazy(() => import('@/pages/dns'));
const DOM = lazy(() => import('@/pages/domain'));
const E = lazy(() => import('@/pages/email'));
const T = lazy(() => import('@/pages/tls'));
const W = lazy(() => import('@/pages/web'));
const S = lazy(() => import('@/pages/security'));
const U = lazy(() => import('@/pages/utilities'));
const DATA = lazy(() => import('@/pages/data'));

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<LoadingState />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="/history" element={<Suspense fallback={<LoadingState />}><HistoryPage /></Suspense>} />
        <Route path="/diagnose" element={<Suspense fallback={<LoadingState />}><Diagnose /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<LoadingState />}><SettingsPage /></Suspense>} />

        <Route path="/network/*" element={<Suspense fallback={<LoadingState />}><N /></Suspense>} />
        <Route path="/dns/*" element={<Suspense fallback={<LoadingState />}><D /></Suspense>} />
        <Route path="/domain/*" element={<Suspense fallback={<LoadingState />}><DOM /></Suspense>} />
        <Route path="/email/*" element={<Suspense fallback={<LoadingState />}><E /></Suspense>} />
        <Route path="/tls/*" element={<Suspense fallback={<LoadingState />}><T /></Suspense>} />
        <Route path="/web/*" element={<Suspense fallback={<LoadingState />}><W /></Suspense>} />
        <Route path="/security/*" element={<Suspense fallback={<LoadingState />}><S /></Suspense>} />
        <Route path="/utils/*" element={<Suspense fallback={<LoadingState />}><U /></Suspense>} />
        <Route path="/data/*" element={<Suspense fallback={<LoadingState />}><DATA /></Suspense>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
