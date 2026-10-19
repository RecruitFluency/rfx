// The coach-only feed: video from athletes whose families turned it on, newest
// first, one at a time. Underclassmen show with the date contact opens; staff save
// them to the watch list until then. No contact details here.
import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, ExternalLink, Play, User } from "lucide-react";
import { api } from "../lib/api";
import { useSession } from "../session";
import { Button, Drawer, ErrorNote, Select, Spinner } from "../components/ui";
import { date } from "../lib/format";

export interface AthleteCard {
  id: string; full_name: string; grad_year: number | null; club: string | null; state: string | null;
  position: string | null; secondary_positions: string[]; measurables: { label: string; value: string; unit: string }[];
  contact: { open: boolean; date: string | null; text: string };
}
interface FeedVideo { id: string; athlete_id: string; kind: string; kind_label: string; url: string; youtube_id: string | null; title: string | null; recorded_on: string | null; notes: string | null; athlete: AthleteCard; watched: boolean; on_board: boolean }
interface FeedResp { videos: FeedVideo[]; total: number; kinds: { key: string; label: string }[]; positions: string[] }

const thisYear = new Date().getFullYear();
const CLASSES = [thisYear + 1, thisYear + 2, thisYear + 3, thisYear + 4];

export function contactLabel(c: AthleteCard["contact"]) {
  return c.open ? "Contact open" : c.date ? `Contact opens ${date(c.date)}` : "Contact date unknown";
}

export function VideoPlayer({ v, autoPlay, onPlay }: { v: { url: string; youtube_id: string | null; title: string | null }; autoPlay?: boolean; onPlay?: () => void }) {
  const [play, setPlay] = useState(!!autoPlay);
  if (!v.youtube_id) {
    return (
      <a href={v.url} target="_blank" rel="noreferrer noopener" onClick={onPlay} className="aspect-video w-full bg-vekt-panel border border-white/[0.08] flex flex-col items-center justify-center gap-3 text-white hover:border-white/30">
        <ExternalLink className="w-6 h-6" /><span className="text-sm">Open video ({new URL(v.url).hostname.replace(/^www\./, "")})</span>
      </a>
    );
  }
  if (play) {
    return <iframe className="aspect-video w-full bg-black" src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?autoplay=1&rel=0&modestbranding=1`} title={v.title ?? "Video"} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />;
  }
  return (
    <button type="button" onClick={() => { setPlay(true); onPlay?.(); }} className="group relative aspect-video w-full bg-vekt-panel overflow-hidden" aria-label={`Play ${v.title ?? "video"}`}>
      <img src={`https://i.ytimg.com/vi/${v.youtube_id}/hqdefault.jpg`} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      <span className="absolute inset-0 flex items-center justify-center"><span className="w-16 h-16 rounded-full bg-black/60 border border-white/40 flex items-center justify-center"><Play className="w-7 h-7 text-white ml-1" /></span></span>
    </button>
  );
}

export default function Feed() {
  const { program, me } = useSession();
  const [filters, setFilters] = useState<{ grad_years: number[]; position: string; kind: string }>({ grad_years: [], position: "", kind: "" });
  const [data, setData] = useState<FeedResp | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null); setError(null);
    api<FeedResp>("feed", { program_id: program!.id, ...filters }).then(setData).catch((e) => setError(e.message));
    scroller.current?.scrollTo({ top: 0 });
  }, [program?.id, filters]);

  const loadMore = async () => {
    if (!data) return;
    setMore(true);
    try { const next = await api<FeedResp>("feed", { program_id: program!.id, ...filters, offset: data.videos.length }); setData({ ...data, videos: [...data.videos, ...next.videos] }); }
    finally { setMore(false); }
  };
  const toggleWatch = async (v: FeedVideo) => {
    await api(v.watched ? "watch_remove" : "watch_add", { program_id: program!.id, athlete_id: v.athlete_id });
    setData((d) => d && { ...d, videos: d.videos.map((x) => (x.athlete_id === v.athlete_id ? { ...x, watched: !v.watched } : x)) });
  };

  return (
    <div className="-mt-4">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <div className="vekt-label mb-2">Coach-only · families opted in</div>
          <h1 className="vekt-display text-[40px] sm:text-[52px]">Film feed</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {CLASSES.map((y) => {
            const on = filters.grad_years.includes(y);
            return <button key={y} type="button" aria-pressed={on} onClick={() => setFilters((f) => ({ ...f, grad_years: on ? f.grad_years.filter((x) => x !== y) : [...f.grad_years, y] }))}
              className={`min-h-[40px] px-3 rounded border text-sm ${on ? "bg-white text-vekt-black border-white" : "border-white/20 text-white/80 hover:border-white/50"}`}>{y}</button>;
          })}
          <Select className="!w-auto !min-h-[40px]" aria-label="Position" value={filters.position} onChange={(e) => setFilters((f) => ({ ...f, position: e.target.value }))}>
            <option value="">All positions</option>{data?.positions.map((p) => <option key={p}>{p}</option>)}
          </Select>
          <Select className="!w-auto !min-h-[40px]" aria-label="Video type" value={filters.kind} onChange={(e) => setFilters((f) => ({ ...f, kind: e.target.value }))}>
            <option value="">All video</option>{data?.kinds.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </Select>
        </div>
      </div>

      {error ? <ErrorNote message={error} /> : !data ? <Spinner /> : !data.videos.length ? (
        <p className="text-vekt-grey py-16 text-center">No film matches yet. Families add video and turn on the feed from their VEKT profile.</p>
      ) : (
        <div ref={scroller} className="max-w-[760px] mx-auto h-[calc(100vh-220px)] min-h-[520px] overflow-y-auto snap-y snap-mandatory border border-white/[0.08] rounded">
          {data.videos.map((v) => (
            <article key={v.id} className="snap-start min-h-full flex flex-col justify-center gap-5 p-4 sm:p-6 border-b border-white/[0.08]">
              <VideoPlayer v={v} onPlay={() => { api("film_play", { program_id: program!.id, athlete_id: v.athlete_id }).catch(() => undefined); }} />
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3">
                    <h2 className="vekt-display text-[30px] sm:text-[36px]">{v.athlete.full_name}</h2>
                    <span className="font-mono text-[12px] uppercase tracking-[0.1em] text-vekt-grey">Class of {v.athlete.grad_year ?? "?"}</span>
                  </div>
                  <div className="text-sm text-white/80 mt-1">{[v.athlete.position, v.athlete.club, v.athlete.state].filter(Boolean).join(" · ")}</div>
                  <div className="text-xs text-vekt-grey mt-2">{v.kind_label}{v.title ? ` · ${v.title}` : ""}{v.notes ? ` · ${v.notes}` : ""}{v.recorded_on ? ` · ${date(v.recorded_on)}` : ""}</div>
                </div>
                <div className={`font-mono text-[11px] uppercase tracking-[0.1em] px-2 py-1 rounded border ${v.athlete.contact.open ? "border-white text-white" : "border-white/20 text-vekt-grey"}`}>{contactLabel(v.athlete.contact)}</div>
              </div>
              {v.athlete.measurables.length > 0 && (
                <div className="flex flex-wrap gap-2">{v.athlete.measurables.map((m) => <span key={m.label} className="border border-white/15 rounded px-2 py-1 text-xs text-white/80"><span className="text-vekt-grey mr-1">{m.label}</span>{m.value}{m.unit !== "time" ? ` ${m.unit}` : ""}</span>)}</div>
              )}
              <div className="flex flex-wrap gap-3">
                {me?.can.write && <Button onClick={() => toggleWatch(v)}>{v.watched ? <><BookmarkCheck className="w-4 h-4" /> On your watch list</> : <><Bookmark className="w-4 h-4" /> Add to watch list</>}</Button>}
                <Button variant="ghost" onClick={() => setOpen(v.athlete_id)}><User className="w-4 h-4" /> Full profile</Button>
                {v.on_board && <span className="text-xs text-vekt-grey self-center">Already on your board</span>}
              </div>
            </article>
          ))}
          {data.videos.length < data.total && (
            <div className="snap-start p-8 flex justify-center"><Button onClick={loadMore} loading={more}>Load more film</Button></div>
          )}
        </div>
      )}
      <AthleteDrawer athleteId={open} onClose={() => setOpen(null)} />
    </div>
  );
}

export function AthleteDrawer({ athleteId, onClose }: { athleteId: string | null; onClose: () => void }) {
  const { program } = useSession();
  const [d, setD] = useState<any>(null);
  useEffect(() => {
    setD(null);
    if (athleteId) api("athlete_card", { program_id: program!.id, athlete_id: athleteId }).then(setD).catch(() => setD({ error: true }));
  }, [athleteId, program?.id]);
  const p = d?.profile ?? {};
  return (
    <Drawer open={!!athleteId} onClose={onClose} title={d?.athlete?.full_name ?? "Profile"}>
      {!d ? <Spinner /> : d.error ? <ErrorNote message="This profile isn't available." /> : (
        <div className="flex flex-col gap-6">
          <div className="text-sm text-white/80">{[`Class of ${d.athlete.grad_year ?? "?"}`, d.athlete.position, d.athlete.club, d.athlete.state].filter(Boolean).join(" · ")}</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-white">{contactLabel(d.athlete.contact)}</div>
          {d.athlete.contact && !d.athlete.contact.open && <p className="text-xs text-vekt-grey">Watch film and save them now. Don't contact them before this date; VEKT will show the invite button when it opens.</p>}
          {Object.keys(p.systems ?? {}).length > 0 && <div><div className="vekt-label mb-2">Systems they know</div><p className="text-sm text-white/85">{Object.values(p.systems as Record<string, string[]>).flat().join(", ")}</p></div>}
          {d.athlete.measurables.length > 0 && <div><div className="vekt-label mb-2">Numbers (self-reported)</div><p className="text-sm text-white/85">{d.athlete.measurables.map((m: any) => `${m.label} ${m.value}${m.unit !== "time" ? " " + m.unit : ""}`).join(" · ")}</p></div>}
          <div className="flex flex-col gap-5">
            {d.videos.map((v: any, i: number) => <div key={i}><div className="vekt-label mb-2">{v.kind.replace(/_/g, " ")}{v.title ? ` · ${v.title}` : ""}</div><VideoPlayer v={v} /></div>)}
          </div>
        </div>
      )}
    </Drawer>
  );
}
