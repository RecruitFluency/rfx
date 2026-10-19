// "Their game": systems against yours, the hard-skills read (athlete vs club
// director) and measurables. All computed by VEKT from the two forms.
import type { Player } from "../lib/types";
import { MatchMark } from "./ui";
import type { Match } from "../lib/types";
import { sportFor } from "../../../supabase/functions/_shared/sports.ts";

const SYSTEM_MARK: Record<string, { m: Match; label: string }> = {
  plays_yours: { m: "strong", label: "Plays your system" },
  comfortable: { m: "match", label: "Says they know it" },
  new_to_them: { m: "gap", label: "New to them" },
  unknown: { m: "not_covered", label: "Not shared yet" },
};
const SKILL_MARK: Record<string, { m: Match; label: string }> = {
  same: { m: "strong", label: "Same read" },
  athlete_higher: { m: "look_closer", label: "Rates self higher" },
  director_higher: { m: "match", label: "Director rates higher" },
  athlete_only: { m: "not_covered", label: "Athlete only" },
  director_only: { m: "not_covered", label: "Director only" },
};
const MEASURE_LABEL: Record<string, string> = { confirmed: "Confirmed by director", differs: "Numbers differ", self_reported: "Self-reported", director_only: "From director" };

function Mark({ m, label }: { m: Match; label: string }) {
  return <span className="inline-flex items-center gap-2"><MatchMark match={m} label={false} /><span className={`font-mono text-[11px] uppercase tracking-[0.1em] ${m === "not_covered" || m === "gap" ? "text-vekt-grey" : "text-white"}`}>{label}</span></span>;
}

export function PlayerGame({ player, first }: { player: Player | null; first: string }) {
  if (!player || (!player.profile && !player.evaluation)) {
    return <p className="text-vekt-grey">{first} and their club director haven't filled in hard skills yet. Their links go out with the invites.</p>;
  }
  const sk = player.skills!;
  const p = player.profile, e = player.evaluation;
  return (
    <div className="flex flex-col gap-12">
      <div className="grid sm:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08]">
        <div className="bg-vekt-black p-6">
          <div className="vekt-label">Positions</div>
          <div className="text-white mt-3">{p?.primary_position ?? e?.primary_position ?? "Not shared"}</div>
          {(p?.secondary_positions?.length ?? 0) > 0 && <div className="text-sm text-vekt-grey mt-1">Also {p!.secondary_positions.join(", ")}</div>}
          {e?.primary_position && <div className="text-xs text-vekt-grey mt-3">Club director: {[e.primary_position, ...e.positions_played].join(", ")}</div>}
        </div>
        <div className="bg-vekt-black p-6">
          <div className="vekt-label">Hard-skills read</div>
          <div className="vekt-display text-[34px] mt-3">{sk.compared ? `${sk.same} of ${sk.compared} the same` : "Waiting"}</div>
          <div className="text-xs text-vekt-grey mt-2">{sk.summary}</div>
        </div>
        <div className="bg-vekt-black p-6">
          <div className="vekt-label">Club team</div>
          <div className="text-white mt-3">{e?.team_name ?? "Not shared"}</div>
          <div className="text-sm text-vekt-grey mt-1">{e?.team_level}</div>
          {p?.film_links?.length ? <a href={p.film_links[0]} target="_blank" rel="noreferrer noopener" className="inline-block mt-3 text-sm text-white underline underline-offset-4">Watch film</a> : null}
        </div>
      </div>

      {player.systems && player.systems.length > 0 && (
        <div>
          <div className="vekt-label mb-3">Your systems</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm text-left">
              <thead><tr>{["", "You run", `${first} knows`, "Club director saw", ""].map((h, i) => <th key={i} className="vekt-label font-normal py-3 pr-6 border-b border-white/[0.1]">{h}</th>)}</tr></thead>
              <tbody>
                {player.systems.map((r) => (
                  <tr key={r.group} className="align-top">
                    <td className="py-4 pr-6 border-b border-white/[0.06] text-white whitespace-nowrap">{r.label}</td>
                    <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80">{r.program.join(", ")}</td>
                    <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80">{r.athlete.join(", ") || <span className="text-vekt-grey">·</span>}</td>
                    <td className="py-4 pr-6 border-b border-white/[0.06] text-white/80">{r.director.join(", ") || <span className="text-vekt-grey">·</span>}</td>
                    <td className="py-4 border-b border-white/[0.06]"><Mark {...SYSTEM_MARK[r.verdict]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sk.rows.length > 0 && (
        <div>
          <div className="vekt-label mb-3">Hard skills, both reads</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm text-left">
              <thead><tr>{["Skill", first, "Club director", ""].map((h, i) => <th key={i} className="vekt-label font-normal py-3 pr-6 border-b border-white/[0.1]">{h}</th>)}</tr></thead>
              <tbody>
                {sk.rows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-3 pr-6 border-b border-white/[0.06] text-white">{r.label}<div className="text-xs text-vekt-grey">{r.set}</div></td>
                    <td className="py-3 pr-6 border-b border-white/[0.06] text-white/85">{r.athlete ?? <span className="text-vekt-grey">·</span>}</td>
                    <td className="py-3 pr-6 border-b border-white/[0.06] text-white/85">{r.director ?? <span className="text-vekt-grey">·</span>}</td>
                    <td className="py-3 border-b border-white/[0.06]"><Mark {...SKILL_MARK[r.verdict]} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(player.measurables?.length ?? 0) > 0 && (
        <div>
          <div className="vekt-label mb-3">Measurables</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 border-t border-l border-white/[0.08]">
            {player.measurables!.map((m) => (
              <div key={m.key} className="p-5 border-r border-b border-white/[0.08]">
                <div className="vekt-label">{m.label}</div>
                <div className="vekt-display text-[30px] mt-2">{m.athlete ?? m.director}<span className="text-[14px] text-vekt-grey ml-1 normal-case">{m.unit !== "time" ? m.unit : ""}</span></div>
                <div className={`font-mono text-[10px] uppercase tracking-[0.1em] mt-2 ${m.status === "confirmed" ? "text-white" : "text-vekt-grey"}`}>{MEASURE_LABEL[m.status]}{m.status === "differs" ? `: ${m.director}` : ""}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(p?.marks?.length ?? 0) > 0 && (
        <div>
          <div className="vekt-label mb-3">Personal bests</div>
          <ul className="text-sm text-white/85 flex flex-col gap-1">{p!.marks.map((m, i) => <li key={i}>{m.event}: <span className="text-white">{m.mark}</span>{m.meet ? ` · ${m.meet}` : ""}{m.date ? ` · ${m.date}` : ""}</li>)}</ul>
        </div>
      )}

      {Object.keys(p?.attributes ?? {}).length > 0 && (
        <div className="text-sm text-white/80">
          {Object.entries(p!.attributes).map(([k, v]) => <span key={k} className="mr-6"><span className="vekt-label mr-2">{sportFor(player.sport)?.attributes.find((a) => a.key === k)?.label ?? k}</span>{Array.isArray(v) ? v.join(", ") : v}</span>)}
        </div>
      )}
      {e?.notes && <p className="text-white/85 font-light max-w-3xl"><span className="vekt-label mr-3">Club director</span>{e.notes}</p>}
    </div>
  );
}
