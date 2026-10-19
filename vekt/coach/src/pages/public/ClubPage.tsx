// A club's public VEKT page: where its players committed, by level and class, and its
// Founding VEKT teams. Names appear only for families who opted in (first name, last initial).
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { publicApi } from "../../lib/publicApi";
import { ErrorNote, Spinner } from "../../components/ui";
import { ShareButton } from "../../components/ShareButton";
import { Bar } from "../../club/parts";
import { PublicFrame } from "./PublicFrame";

export interface PageData {
  club: { name: string; state: string | null; sports: string[] };
  on_vekt: number; committed: number;
  by_level: Record<string, number>; by_year: Record<string, number>;
  named: { name: string; grad_year: number | null; program: string; level: string | null }[];
  founding_teams: string[];
}
const LEVELS = ["D1", "D2", "D3", "NAIA", "NJCAA", "Other"];

export function ClubPageBody({ d }: { d: PageData }) {
  const levels = Object.entries(d.by_level).sort((a, b) => LEVELS.indexOf(a[0]) - LEVELS.indexOf(b[0]));
  const years = Object.entries(d.by_year).sort((a, b) => b[0].localeCompare(a[0]));
  const max = Math.max(1, ...levels.map(([, n]) => n));
  return (
    <div className="flex flex-col gap-12">
      <div className="grid grid-cols-2 gap-8 border border-white/[0.12] rounded p-6">
        <div><div className="vekt-label mb-2">Commitments</div><div className="vekt-display text-[48px]">{d.committed}</div></div>
        <div><div className="vekt-label mb-2">Players on VEKT</div><div className="vekt-display text-[48px]">{d.on_vekt}</div></div>
      </div>
      {d.founding_teams.length > 0 && (
        <section>
          <div className="vekt-label mb-3">Founding VEKT teams</div>
          <div className="flex flex-wrap gap-2">{d.founding_teams.map((t) => <span key={t} className="border border-white/40 rounded px-3 py-1.5 text-sm text-white">{t}</span>)}</div>
          <p className="text-xs text-vekt-grey mt-3">Teams where three or more families built their VEKT profiles.</p>
        </section>
      )}
      {levels.length > 0 && (
        <section>
          <div className="vekt-label mb-4">Where they committed, by level</div>
          <div className="flex flex-col gap-3">{levels.map(([l, n]) => <Bar key={l} label={l} value={n} max={max} />)}</div>
          {years.length > 0 && <p className="text-sm text-vekt-grey mt-4">By class: {years.map(([y, n]) => `${y} · ${n}`).join("   ")}</p>}
        </section>
      )}
      {d.named.length > 0 && (
        <section>
          <div className="vekt-label mb-3">Commitments shared by families</div>
          <ul className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {d.named.map((n, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <span className="text-white">{n.name}<span className="text-vekt-grey text-sm"> · Class of {n.grad_year ?? "?"}</span></span>
                <span className="text-sm text-white/85">{n.program}{n.level ? ` · ${n.level}` : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="text-xs text-vekt-grey">Commitments are reported by the club and its families. VEKT doesn't verify offers or scholarships.</p>
    </div>
  );
}

export default function ClubPage() {
  const { slug = "" } = useParams();
  const [d, setD] = useState<PageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { publicApi<PageData>("club_page", "", { slug }).then(setD).catch((e) => setError(e.message)); }, [slug]);
  if (error) return <PublicFrame><ErrorNote message={error} /></PublicFrame>;
  if (!d) return <PublicFrame><Spinner /></PublicFrame>;
  return (
    <PublicFrame footer="VEKT is a recruiting fit tool. VEKT never promises an offer, a roster spot or a scholarship.">
      <div className="vekt-label mb-4">{[d.club.state, d.club.sports.map((x) => x.replace(/_/g, " ")).join(", ")].filter(Boolean).join(" · ") || "Club"}</div>
      <h1 className="vekt-display text-[44px] sm:text-[64px] mb-10">{d.club.name}</h1>
      <ClubPageBody d={d} />
      <div className="mt-12 pt-8 border-t border-white/[0.1] flex flex-wrap items-center gap-4">
        <Link to="/join" className="inline-flex items-center min-h-[44px] px-5 rounded bg-vekt-green text-vekt-black text-sm font-medium">Start your free profile</Link>
        <ShareButton url={window.location.href} title={`${d.club.name} on VEKT`} text={`${d.club.name}'s college placement record on VEKT:`} label="Share this page" />
      </div>
    </PublicFrame>
  );
}
