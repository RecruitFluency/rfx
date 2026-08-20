import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

/*
 * The marketing page is the common entry point, so the authenticated app —
 * along with its heavy dependencies (supabase-js, xlsx) — is code-split out.
 * Without this every visitor downloads the whole dashboard to read a landing page.
 */
const AppShell = lazy(() => import('./app/AppShell.tsx'));
const CommandCenter = lazy(() => import('./app/pages/CommandCenter.tsx'));
const SyncEngine = lazy(() => import('./app/pages/SyncEngine.tsx'));
const ReviewQueue = lazy(() => import('./app/pages/ReviewQueue.tsx'));
const Coaches = lazy(() => import('./app/pages/Coaches.tsx'));
const CoachProfile = lazy(() => import('./app/pages/CoachProfile.tsx'));
const Programs = lazy(() => import('./app/pages/Programs.tsx'));
const ProgramProfile = lazy(() => import('./app/pages/ProgramProfile.tsx'));
const Setup = lazy(() => import('./app/pages/Setup.tsx'));

function AppFallback() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-0">
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-paper-3">Loading…</span>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route
          path="/app"
          element={
            <Suspense fallback={<AppFallback />}>
              <AppShell />
            </Suspense>
          }
        >
          <Route index element={<CommandCenter />} />
          <Route path="sync" element={<SyncEngine />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="coaches" element={<Coaches />} />
          <Route path="coaches/:id" element={<CoachProfile />} />
          <Route path="programs" element={<Programs />} />
          <Route path="programs/:id" element={<ProgramProfile />} />
          <Route path="setup" element={<Setup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
