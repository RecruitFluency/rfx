// The director turns the club's public page on, picks its address and shares it.
import { useEffect, useState } from "react";
import { clubApi } from "../lib/clubApi";
import { useLoad, useSession } from "../session";
import { Button, ErrorNote, Field, Input, Panel, PanelTitle, Toggle } from "../components/ui";
import { ShareButton } from "../components/ShareButton";
import type { PageData } from "../pages/public/ClubPage";

export function PublicPagePanel() {
  const { club } = useSession();
  const canEdit = club?.account.role === "director";
  const { data, reload } = useLoad(() => clubApi<{ slug: string; saved_slug: string | null; public_page: boolean; preview: PageData }>("page_get"), []);
  const [slug, setSlug] = useState("");
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (data) { setSlug(data.slug); setOn(data.public_page); } }, [data]);
  if (!data) return null;
  const url = `${window.location.origin}/c/${data.saved_slug ?? data.slug}`;
  const save = async () => {
    setBusy(true); setError(null);
    try { await clubApi("page_save", { slug, public_page: on }); reload(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const p = data.preview;
  return (
    <Panel className="mt-8">
      <PanelTitle>Public club page</PanelTitle>
      <div className="p-6 flex flex-col gap-5">
        <p className="text-sm text-white/85 max-w-2xl">A page you can share with families and recruits: your commitments by level and class ({p.committed} so far), your Founding VEKT teams ({p.founding_teams.length ? p.founding_teams.join(", ") : "none yet: a team needs 3 families on VEKT"}), and names only for the {p.named.length} {p.named.length === 1 ? "family" : "families"} who opted in.</p>
        {canEdit && (
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
            <Field label="Page address" hint={`${window.location.origin}/c/…`}><Input value={slug} onChange={(e) => setSlug(e.target.value)} /></Field>
            <div className="pb-2"><Toggle checked={on} onChange={setOn} label="Page is public" /></div>
          </div>
        )}
        {error && <ErrorNote message={error} />}
        <div className="flex flex-wrap items-center gap-3">
          {canEdit && <Button onClick={save} loading={busy}>Save</Button>}
          {data.public_page && <>
            <a className="text-sm text-white underline underline-offset-4" href={url} target="_blank" rel="noreferrer">View page</a>
            <ShareButton url={url} title={`${club?.club.name} on VEKT`} text={`${club?.club.name}'s college placement record on VEKT:`} label="Share page" />
          </>}
        </div>
      </div>
    </Panel>
  );
}
