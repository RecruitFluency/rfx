// Player pipeline: every player in the column for where they stand right now.
import { useState } from "react";
import { clubApi, type ClubAthlete, type StageKey } from "../lib/clubApi";
import { useLoad, useSession } from "../session";
import { ErrorNote, PageHeader, Segmented, Spinner } from "../components/ui";
import { StatusDrawer } from "./StatusDrawer";
import { consentNote } from "./parts";

export default function Pipeline() {
  const { club } = useSession();
  const { data, error, loading, reload } = useLoad(() => clubApi<{ stages: { key: StageKey; label: string }[]; athletes: ClubAthlete[] }>("pipeline"), []);
  const [year, setYear] = useState("all");
  const [open, setOpen] = useState<ClubAthlete | null>(null);
  if (loading && !data) return <Spinner />;
  if (error || !data) return <ErrorNote message={error || "Couldn't load."} />;
  const years = [...new Set(data.athletes.map((a) => a.grad_year).filter(Boolean))].sort() as number[];
  const shown = data.athletes.filter((a) => year === "all" || String(a.grad_year) === year);
  return (
    <div>
      <PageHeader eyebrow={club?.club.name} title="Player pipeline" subtitle="Always see where everyone stands. Click a player to record a commitment."
        actions={<Segmented label="Class" value={year} onChange={setYear} options={[{ value: "all", label: "All" }, ...years.map((y) => ({ value: String(y), label: String(y) }))]} />} />
      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <div className="grid grid-cols-7 gap-2 min-w-[1040px]">
          {data.stages.map((st) => {
            const col = shown.filter((a) => a.stage === st.key);
            return (
              <section key={st.key} className="bg-vekt-panel border border-white/[0.08] rounded flex flex-col min-h-[360px] min-w-0">
                <header className="px-3 py-3 border-b border-white/[0.08] flex items-baseline justify-between gap-2">
                  <span className="vekt-label">{st.label}</span><span className="font-mono text-[12px] text-white">{col.length}</span>
                </header>
                <div className="p-2 flex flex-col gap-2">
                  {col.map((a) => (
                    <button key={a.id} onClick={() => setOpen(a)} className="text-left border border-white/[0.1] hover:border-white/40 rounded p-3">
                      <div className="text-sm text-white">{a.full_name}</div>
                      <div className="text-xs text-vekt-grey mt-0.5">{[a.grad_year, a.position].filter(Boolean).join(" · ")}</div>
                      {a.stage === "committed" ? <div className="text-xs text-white mt-2">{a.committed_program}{a.committed_division ? ` · ${a.committed_division}` : ""}</div>
                        : a.on_vekt && a.programs_engaged > 0 ? <div className="text-xs text-white/80 mt-2">{a.programs_engaged} {a.programs_engaged === 1 ? "program" : "programs"}{a.interested ? ` · ${a.interested} Interested` : ""}</div>
                        : a.pending_parent ? <div className="text-xs text-vekt-grey mt-2">Waiting on family</div> : null}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-vekt-grey mt-4">{consentNote} Players marked not pursuing college are on Roster & export.</p>
      <StatusDrawer athlete={open} onClose={() => setOpen(null)} onSaved={reload} />
    </div>
  );
}
