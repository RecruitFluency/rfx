// Video links by kind (highlight, every touch, half game, full game, or the
// sport's own kinds). YouTube, Hudl and Vimeo only; video stays where it lives.
import { Plus, X } from "lucide-react";
import { videoKinds, videoLink, type Sport } from "../../../supabase/functions/_shared/sports.ts";
import { Field, Input, Select } from "./ui";
import { Section } from "./ProfileForm";

export interface VideoValue { kind: string; url: string; title?: string | null; recorded_on?: string | null; notes?: string | null }

export function VideoLinks({ sport, value, onChange }: { sport: Sport; value: VideoValue[]; onChange: (v: VideoValue[]) => void }) {
  const kinds = videoKinds(sport);
  const set = (i: number, patch: Partial<VideoValue>) => onChange(value.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <Section title="Video" hint="Paste YouTube, Hudl or Vimeo links. Coaches watch highlights first, but they decide on unedited film, so add a full or half game when you can.">
      <ul className="flex flex-wrap gap-x-6 gap-y-1 mb-6 text-xs text-vekt-grey">{kinds.map((k) => <li key={k.key}><span className="text-white">{k.label}</span>: {k.hint.toLowerCase()}</li>)}</ul>
      <div className="flex flex-col gap-5">
        {value.map((v, i) => {
          const bad = v.url.trim() !== "" && !videoLink(v.url).ok;
          return (
            <div key={i} className="grid sm:grid-cols-[1fr_2fr_auto] gap-3 items-end border-b border-white/[0.06] pb-5">
              <Field label="Type"><Select value={v.kind} onChange={(e) => set(i, { kind: e.target.value })}>{kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}</Select></Field>
              <Field label="Link" hint={bad ? "Use a https:// link from YouTube, Hudl or Vimeo." : undefined}><Input type="url" value={v.url} onChange={(e) => set(i, { url: e.target.value })} placeholder="https://youtube.com/watch?v=..." /></Field>
              <button type="button" aria-label="Remove video" className="min-h-[44px] px-2 text-vekt-grey hover:text-white" onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="w-4 h-4" /></button>
              <Field label="Title (optional)"><Input value={v.title ?? ""} onChange={(e) => set(i, { title: e.target.value })} placeholder="vs. Metro United" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Date"><Input type="date" value={v.recorded_on ?? ""} onChange={(e) => set(i, { recorded_on: e.target.value })} /></Field>
                <Field label="Your number and color"><Input value={v.notes ?? ""} onChange={(e) => set(i, { notes: e.target.value })} placeholder="#4, white" /></Field>
              </div>
            </div>
          );
        })}
        {value.length < 12 && <button type="button" className="self-start inline-flex items-center gap-2 text-sm text-white" onClick={() => onChange([...value, { kind: kinds[0].key, url: "" }])}><Plus className="w-4 h-4" /> Add a video</button>}
      </div>
    </Section>
  );
}
