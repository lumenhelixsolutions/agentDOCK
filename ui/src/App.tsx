import { lazy, Suspense, useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import HootUnlock from "./components/HootUnlock";
import { AppBootShell, PageShell } from "./components/AppShell";
import { api } from "./lib/api";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ScanPage = lazy(() => import("./pages/ScanPage"));
const ProfilesPage = lazy(() => import("./pages/ProfilesPage"));
const MemoryPage = lazy(() => import("./pages/MemoryPage"));
const TerminalPage = lazy(() => import("./pages/TerminalPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const StackBuilder = lazy(() => import("./pages/StackBuilder"));
const ModulesPage = lazy(() => import("./pages/ModulesPage"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const LaunchCenterPage = lazy(() => import("./pages/LaunchCenterPage"));

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [needsUnlock, setNeedsUnlock] = useState(false);

  useEffect(() => {
    api
      .getAuthStatus()
      .then((s) => {
        if (s.enabled && !s.authenticated && !s.loopback) setNeedsUnlock(true);
        setAuthReady(true);
      })
      .catch(() => setAuthReady(true));
  }, []);

  if (!authReady) return <AppBootShell />;
  if (needsUnlock) {
    return <HootUnlock onUnlocked={() => setNeedsUnlock(false)} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageShell />}>
              <Dashboard />
            </Suspense>
          }
        />
        <Route path="/profiles" element={<Suspense fallback={<PageShell />}><ProfilesPage /></Suspense>} />
        <Route path="/launch" element={<Suspense fallback={<PageShell />}><LaunchCenterPage /></Suspense>} />
        <Route path="/terminal" element={<Suspense fallback={<PageShell />}><TerminalPage /></Suspense>} />
        <Route path="/memory" element={<Suspense fallback={<PageShell />}><MemoryPage /></Suspense>} />
        <Route path="/activity" element={<Suspense fallback={<PageShell />}><ActivityPage /></Suspense>} />
        <Route path="/scan" element={<Suspense fallback={<PageShell />}><ScanPage /></Suspense>} />
        <Route path="/builder" element={<Suspense fallback={<PageShell />}><StackBuilder /></Suspense>} />
        <Route path="/modules" element={<Suspense fallback={<PageShell />}><ModulesPage /></Suspense>} />
        <Route path="/skills" element={<Navigate to="/modules" replace />} />
        <Route path="/settings" element={<Suspense fallback={<PageShell />}><SettingsPage /></Suspense>} />
      </Route>
    </Routes>
  );
}