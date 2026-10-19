import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { SessionProvider } from "./session";
import Shell from "./Shell";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Recruits from "./pages/Recruits";
import RecruitDetail from "./pages/RecruitDetail";
import RecruitForm from "./pages/RecruitForm";
import FitRead from "./pages/FitRead";
import SideBySide, { SideBySideList } from "./pages/SideBySide";
import Activity from "./pages/Activity";
import ProgramPage from "./pages/Program";
import Department from "./pages/Department";
import Compliance from "./pages/Compliance";
import AthleteProfile from "./pages/public/AthleteProfile";
import ClubEval from "./pages/public/ClubEval";
import Join from "./pages/public/Join";
import Parent from "./pages/public/Parent";
import Me from "./pages/public/Me";
import Feed from "./pages/Feed";
import WatchList from "./pages/WatchList";
import Roster from "./pages/Roster";
import { Spinner } from "./components/ui";
import ClubShell from "./club/ClubShell";
import Health from "./club/Health";
import Pipeline from "./club/Pipeline";
import Engagement from "./club/Engagement";
import Funnel from "./club/Funnel";
import Commitments from "./club/Commitments";
import Research from "./club/Research";
import ClubRoster from "./club/ClubRoster";

// The spreadsheet reader is large; load it only on the import page.
const Import = lazy(() => import("./pages/Import"));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/athlete/:token" element={<AthleteProfile />} />
          <Route path="/club/:token" element={<ClubEval />} />
          <Route path="/join" element={<Join />} />
          <Route path="/parent/:token" element={<Parent />} />
          <Route path="/me/:token" element={<Me />} />
          <Route path="/director" element={<ClubShell />}>
            <Route index element={<Health />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="engagement" element={<Engagement />} />
            <Route path="funnel" element={<Funnel />} />
            <Route path="commitments" element={<Commitments />} />
            <Route path="research" element={<Research />} />
            <Route path="roster" element={<ClubRoster />} />
            <Route path="*" element={<p className="text-vekt-grey">Page not found.</p>} />
          </Route>
          <Route element={<Shell />}>
            <Route index element={<Overview />} />
            <Route path="recruits" element={<Recruits />} />
            <Route path="recruits/new" element={<RecruitForm />} />
            <Route path="recruits/import" element={<Suspense fallback={<Spinner />}><Import /></Suspense>} />
            <Route path="recruits/:id" element={<RecruitDetail />} />
            <Route path="recruits/:id/edit" element={<RecruitForm />} />
            <Route path="recruits/:id/fit-read" element={<FitRead />} />
            <Route path="feed" element={<Feed />} />
            <Route path="watch" element={<WatchList />} />
            <Route path="roster" element={<Roster />} />
            <Route path="side-by-side" element={<SideBySideList />} />
            <Route path="side-by-side/:id" element={<SideBySide />} />
            <Route path="activity" element={<Activity />} />
            <Route path="program" element={<ProgramPage />} />
            <Route path="department" element={<Department />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="*" element={<p className="text-vekt-grey">Page not found.</p>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  </React.StrictMode>,
);
