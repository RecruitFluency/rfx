// One form for the athlete's profile and the club director's evaluation: the
// same positions, systems, hard skills and measurables for every sport, from the
// shared sport catalog, so the two can be compared line by line.
import { Plus, X } from "lucide-react";
import { forPositions, SKILL_LEVELS, type Sport, type SkillLevel } from "../../../supabase/functions/_shared/sports.ts";
import { Field, Input, Select, Textarea } from "./ui";

export interface ProfileValue {
  primary_position?: string | null;
  secondary_positions?: string[];
  systems?: Record<string, string[]>;
  team_systems?: Record<string, string[]>;
  skills?: Record<string, SkillLevel>;
  measurables?: Record<string, string>;
  attributes?: Record<string, string | string[]>;
  marks?: { event: string; mark: string; date?: string; meet?: string }[];
  film_links?: string[];
  intended_major?: string | null;
  team_name?: string | null;
  team_level?: string | null;
  notes?: string | null;
}

export function Chips({ options, value, onChange, label }: { options: string[]; value: string[]; onChange: (v: string[]) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o) : [...value, o])}
            className={`min-h-[40px] px-3 rounded border text-sm transition ${on ? "bg-white text-vekt-black border-white" : "border-white/20 text-white/80 hover:border-white/50"}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function LevelPicker({ value, onChange, label }: { value?: SkillLevel; onChange: (v: SkillLevel | undefined) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-4 border border-white/[0.16] rounded overflow-hidden w-full sm:w-auto sm:min-w-[400px]">
      {SKILL_LEVELS.map((l) => (
        <button key={l.key} type="button" role="radio" aria-checked={value === l.key} title={l.hint}
          onClick={() => onChange(value === l.key ? undefined : l.key)}
          className={`min-h-[40px] px-2 text-[13px] border-l first:border-l-0 border-white/[0.1] ${value === l.key ? "bg-white text-vekt-black" : "text-vekt-grey hover:text-white"}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-white/[0.1] pt-8 mt-10">
      <h2 className="vekt-display text-[26px] sm:text-[30px]">{title}</h2>
      {hint && <p className="text-sm text-vekt-grey mt-2 mb-6 max-w-2xl font-light">{hint}</p>}
      {!hint && <div className="mb-6" />}
      {children}
    </section>
  );
}

export function ProfileForm({ sport, value, onChange, mode, name }: {
  sport: Sport; value: ProfileValue; onChange: (v: ProfileValue) => void; mode: "athlete" | "club"; name: string;
}) {
  const set = <K extends keyof ProfileValue>(k: K, v: ProfileValue[K]) => onChange({ ...value, [k]: v });
  const secondary = value.secondary_positions ?? [];
  const applicable = forPositions(sport, [value.primary_position, ...secondary]);
  const you = mode === "athlete";
  const positionLabels = sport.positions.map((p) => p.label);

  return (
    <div>
      {mode === "club" && (
        <Section title="Your team">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Team"><Input value={value.team_name ?? ""} onChange={(e) => set("team_name", e.target.value)} placeholder="Lakeshore FC U17" /></Field>
            <Field label="League or level"><Input value={value.team_level ?? ""} onChange={(e) => set("team_level", e.target.value)} placeholder="MLS NEXT, ECNL, Varsity..." /></Field>
          </div>
        </Section>
      )}

      <Section title={sport.positionLabel === "Position" ? "Positions" : sport.positionLabel}
        hint={you ? "Your main one first. Add others you've played and would play in college." : `Where ${name} plays for you, and anywhere else you've used them.`}>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label={you ? "Main" : "Main for your team"}>
            <Select value={value.primary_position ?? ""} onChange={(e) => onChange({ ...value, primary_position: e.target.value || null, secondary_positions: secondary.filter((x) => x !== e.target.value) })}>
              <option value="">Choose</option>
              {positionLabels.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
        </div>
        <div className="mt-5">
          <div className="vekt-label mb-3">Also</div>
          <Chips label="Other positions" options={positionLabels.filter((p) => p !== value.primary_position)} value={secondary} onChange={(v) => set("secondary_positions", v.slice(0, 3))} />
        </div>
      </Section>

      {sport.systems.length > 0 && (
        <Section title={you ? "Systems you're comfortable in" : `Systems ${name} has played in`}
          hint={you ? "Pick every one you've actually played in and feel at home in. Coaches check this against their own system." : "Only the ones you've seen them play in, for you or elsewhere."}>
          <div className="flex flex-col gap-6">
            {sport.systems.map((g) => (
              <div key={g.key}>
                <div className="vekt-label mb-3">{g.label}</div>
                <Chips label={g.label} options={g.options} value={value.systems?.[g.key] ?? []} onChange={(v) => set("systems", { ...value.systems, [g.key]: v })} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {mode === "club" && sport.systems.length > 0 && (
        <Section title="What your team runs" hint="Saved for your other athletes, so you only fill it in once.">
          <div className="flex flex-col gap-6">
            {sport.systems.map((g) => (
              <div key={g.key}>
                <div className="vekt-label mb-3">{g.label}</div>
                <Chips label={`Team ${g.label}`} options={g.options} value={value.team_systems?.[g.key] ?? []} onChange={(v) => set("team_systems", { ...value.team_systems, [g.key]: v })} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Hard skills"
        hint={you ? "Be honest. Your club director rates the same skills, and coaches trust a profile where the two match. No numbers, just words." : `Your honest read. ${name} won't see it, and coaches value a director who calls it straight.`}>
        <div className="flex flex-wrap gap-x-6 gap-y-1 mb-6 text-xs text-vekt-grey">
          {SKILL_LEVELS.map((l) => <span key={l.key}><span className="text-white">{l.label}</span>: {l.hint.toLowerCase()}</span>)}
        </div>
        {applicable.skills.map((set_) => (
          <div key={set_.label} className="mb-8">
            <div className="vekt-label mb-3">{set_.label}</div>
            <div className="flex flex-col">
              {set_.skills.map((s) => (
                <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6 py-3 border-b border-white/[0.06]">
                  <span className="text-white text-[15px]">{s.label}</span>
                  <LevelPicker label={s.label} value={value.skills?.[s.key]} onChange={(lv) => {
                    const next = { ...value.skills }; if (lv) next[s.key] = lv; else delete next[s.key]; set("skills", next);
                  }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>

      {applicable.measurables.length > 0 && (
        <Section title={you ? "Your numbers" : "Numbers you've seen measured"}
          hint={you ? "Only numbers you've actually been measured at, and when you can, at a combine or camp. Leave blank what you don't know." : "Only what you've seen measured. Matching numbers show as confirmed by you."}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {applicable.measurables.map((m) => (
              <Field key={m.key} label={`${m.label}${m.unit && m.unit !== "time" ? ` (${m.unit})` : ""}`} hint={m.unit === "time" ? "e.g. 6:45.2" : m.key === "height" ? "inches, e.g. 72" : undefined}>
                <Input inputMode="decimal" value={value.measurables?.[m.key] ?? ""} onChange={(e) => set("measurables", { ...value.measurables, [m.key]: e.target.value })} />
              </Field>
            ))}
          </div>
        </Section>
      )}

      {you && applicable.attributes.length > 0 && (
        <Section title="A few more details">
          <div className="flex flex-col gap-6">
            {applicable.attributes.map((a) => (
              <div key={a.key}>
                <div className="vekt-label mb-3">{a.label}</div>
                {a.multi
                  ? <Chips label={a.label} options={a.options} value={(value.attributes?.[a.key] as string[]) ?? []} onChange={(v) => set("attributes", { ...value.attributes, [a.key]: v })} />
                  : <Chips label={a.label} options={a.options} value={value.attributes?.[a.key] ? [value.attributes[a.key] as string] : []} onChange={(v) => set("attributes", { ...value.attributes, [a.key]: v[v.length - 1] ?? "" })} />}
              </div>
            ))}
          </div>
        </Section>
      )}

      {you && sport.events?.length ? (
        <Section title="Personal bests" hint="Your best marks from real meets or competitions.">
          <div className="flex flex-col gap-3">
            {(value.marks ?? []).map((m, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-[1.4fr_1fr_1fr_1.4fr_auto] gap-3 items-end">
                <Field label="Event"><Select value={m.event} onChange={(e) => set("marks", (value.marks ?? []).map((x, j) => (j === i ? { ...x, event: e.target.value } : x)))}>
                  <option value="">Choose</option>{sport.events!.map((ev) => <option key={ev.key} value={ev.key}>{ev.label}</option>)}
                </Select></Field>
                <Field label="Mark"><Input value={m.mark} onChange={(e) => set("marks", (value.marks ?? []).map((x, j) => (j === i ? { ...x, mark: e.target.value } : x)))} placeholder="48.92" /></Field>
                <Field label="Date"><Input type="date" value={m.date ?? ""} onChange={(e) => set("marks", (value.marks ?? []).map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} /></Field>
                <Field label="Meet"><Input value={m.meet ?? ""} onChange={(e) => set("marks", (value.marks ?? []).map((x, j) => (j === i ? { ...x, meet: e.target.value } : x)))} /></Field>
                <button type="button" aria-label="Remove" className="min-h-[44px] px-2 text-vekt-grey hover:text-white" onClick={() => set("marks", (value.marks ?? []).filter((_, j) => j !== i))}><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" className="self-start inline-flex items-center gap-2 text-sm text-white" onClick={() => set("marks", [...(value.marks ?? []), { event: "", mark: "" }])}><Plus className="w-4 h-4" /> Add a mark</button>
          </div>
        </Section>
      ) : null}

      {you ? (
        <Section title="Film and school">
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Film link" hint="Hudl, YouTube or similar. Starts with https://"><Input type="url" value={value.film_links?.[0] ?? ""} onChange={(e) => set("film_links", e.target.value ? [e.target.value, ...(value.film_links ?? []).slice(1)] : (value.film_links ?? []).slice(1))} /></Field>
            <Field label="Second film link (optional)"><Input type="url" value={value.film_links?.[1] ?? ""} onChange={(e) => set("film_links", [value.film_links?.[0] ?? "", e.target.value].filter(Boolean))} /></Field>
            <Field label="What you'd like to study"><Input value={value.intended_major ?? ""} onChange={(e) => set("intended_major", e.target.value)} /></Field>
          </div>
        </Section>
      ) : (
        <Section title="Anything a college coach should know about their game">
          <Textarea value={value.notes ?? ""} onChange={(e) => set("notes", e.target.value)} maxLength={600} placeholder="Where they've improved, where they're still growing." />
        </Section>
      )}
    </div>
  );
}
