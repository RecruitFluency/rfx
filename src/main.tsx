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
import PortalShell from './portal/PortalShell.tsx';
import PortalLogin from './portal/pages/Login.tsx';
import PortalDashboard from './portal/pages/Dashboard.tsx';
import PortalProspects from './portal/pages/Prospects.tsx';
import PortalProspectDetail from './portal/pages/ProspectDetail.tsx';
import PortalProspectForm from './portal/pages/ProspectForm.tsx';
import PortalImport from './portal/pages/Import.tsx';
import PortalInvitations from './portal/pages/Invitations.tsx';
import PortalDepartment from './portal/pages/Department.tsx';
import PortalCompliance from './portal/pages/Compliance.tsx';
import PortalSettings from './portal/pages/Settings.tsx';
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
        <Route path="/portal/login" element={<PortalLogin />} />
        <Route path="/portal" element={<PortalShell />}>
          <Route index element={<PortalDashboard />} />
          <Route path="prospects" element={<PortalProspects />} />
          <Route path="prospects/new" element={<PortalProspectForm />} />
          <Route path="prospects/:id" element={<PortalProspectDetail />} />
          <Route path="prospects/:id/edit" element={<PortalProspectForm />} />
          <Route path="import" element={<PortalImport />} />
          <Route path="invitations" element={<PortalInvitations />} />
          <Route path="department" element={<PortalDepartment />} />
          <Route path="compliance" element={<PortalCompliance />} />
          <Route path="settings" element={<PortalSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
