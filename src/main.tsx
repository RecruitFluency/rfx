import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './app/AppShell.tsx';
import CommandCenter from './app/pages/CommandCenter.tsx';
import SyncEngine from './app/pages/SyncEngine.tsx';
import ReviewQueue from './app/pages/ReviewQueue.tsx';
import Coaches from './app/pages/Coaches.tsx';
import CoachNew from './app/pages/CoachNew.tsx';
import CoachProfile from './app/pages/CoachProfile.tsx';
import Export from './app/pages/Export.tsx';
import DataHealth from './app/pages/DataHealth.tsx';
import Tracker from './app/pages/Tracker.tsx';
import Insights from './app/pages/Insights.tsx';
import Programs from './app/pages/Programs.tsx';
import ProgramProfile from './app/pages/ProgramProfile.tsx';
import Setup from './app/pages/Setup.tsx';
import Guide from './app/pages/Guide.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="sync" element={<SyncEngine />} />
          <Route path="review" element={<ReviewQueue />} />
          <Route path="coaches" element={<Coaches />} />
          <Route path="coaches/new" element={<CoachNew />} />
          <Route path="coaches/:id" element={<CoachProfile />} />
          <Route path="tracker" element={<Tracker />} />
          <Route path="insights" element={<Insights />} />
          <Route path="health" element={<DataHealth />} />
          <Route path="export" element={<Export />} />
          <Route path="programs" element={<Programs />} />
          <Route path="programs/:id" element={<ProgramProfile />} />
          <Route path="guide" element={<Guide />} />
          <Route path="setup" element={<Setup />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
