import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import AppShell from './app/AppShell.tsx';
import CommandCenter from './app/pages/CommandCenter.tsx';
import Briefing from './app/pages/Briefing.tsx';
import SyncEngine from './app/pages/SyncEngine.tsx';
import ReviewQueue from './app/pages/ReviewQueue.tsx';
import Coaches from './app/pages/Coaches.tsx';
import CoachProfile from './app/pages/CoachProfile.tsx';
import Programs from './app/pages/Programs.tsx';
import ProgramProfile from './app/pages/ProgramProfile.tsx';
import Setup from './app/pages/Setup.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="briefing" element={<Briefing />} />
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
  </StrictMode>
);
