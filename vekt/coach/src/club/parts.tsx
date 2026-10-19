// Small pieces shared by the club pages.
import { Badge, type Tone } from "../components/ui";
import type { StageKey } from "../lib/clubApi";

const stageTone: Record<StageKey, Tone> = {
  not_on_vekt: "neutral", profile: "neutral", seen: "progress", invited: "progress", read: "progress", interested: "done", committed: "done",
};
export function ClubStage({ stage, label }: { stage: StageKey; label: string }) {
  return <Badge tone={stageTone[stage]}>{label}</Badge>;
}

/** Plain horizontal bar, white on grey. Counts only, never percentages. */
export function Bar({ value, max, label, sub }: { value: number; max: number; label: string; sub?: string }) {
  const w = max > 0 ? Math.max(value ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="grid grid-cols-[6rem_1fr_auto] sm:grid-cols-[9.5rem_1fr_auto] items-center gap-3">
      <span className="text-sm text-white/85 truncate">{label}</span>
      <span className="block h-3 bg-white/[0.06] rounded-sm overflow-hidden"><span className="block h-full bg-white" style={{ width: `${w}%` }} /></span>
      <span className="font-mono text-[12px] text-white min-w-[3rem] text-right whitespace-nowrap">{value}{sub ? <span className="text-vekt-grey"> {sub}</span> : null}</span>
    </div>
  );
}

export const consentNote = "College engagement shows only for athletes whose family said yes to sharing it with the club. Everyone else shows as on VEKT or not.";
