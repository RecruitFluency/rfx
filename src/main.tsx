import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppShell from './app/AppShell.tsx';
import CommandCenter from './app/pages/CommandCenter.tsx';
import SyncEngine from './app/pages/SyncEngine.tsx';
import ReviewQueue from './app/pages/ReviewQueue.tsx';
import Coaches from './app/pages/Coaches.tsx';
import CoachProfile from './app/pages/CoachProfile.tsx';
import Programs from './app/pages/Programs.tsx';
import ProgramProfile from './app/pages/ProgramProfile.tsx';
import Setup from './app/pages/Setup.tsx';
import './index.css';

// The site root is the Lake Nona deck, which is a static file copied into
// public/ by decks/orlando-lake-nona/bundle.py. Vercel serves real files
// before it consults rewrites, so "/" always resolves to this SPA shell and a
// rewrite could never reach the deck - the redirect has to happen here.
function DeckRedirect() {
  window.location.replace('/lake-nona/');
  return null;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeckRedirect />} />
        <Route path="/app" element={<AppShell />}>
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
  </StrictMode>
);
