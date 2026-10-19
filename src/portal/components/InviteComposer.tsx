// Invite composer: choose channels and recipients, add a personal note,
// preview exactly what each person will receive (server dry run, so every
// pre-send rule is applied), then send.
import { useEffect, useMemo, useState } from 'react';
import { Button, Drawer, ErrorNote, Field, Input, Segmented, Textarea, Toggle, Badge } from './ui';
import * as api from '../lib/api';
import type { QueueResult } from '../lib/types';
import { formatDate, recipientLabel } from '../lib/format';

type ChannelChoice = 'sms' | 'email' | 'both';

export default function InviteComposer({ open, onClose, prospectIds, prospectLabel, onSent }: {
  open: boolean;
  onClose: () => void;
  prospectIds: string[];
  prospectLabel: string;
  onSent: (result: QueueResult) => void;
}) {
  const [channel, setChannel] = useState<ChannelChoice>('both');
  const [includeAthlete, setIncludeAthlete] = useState(true);
  const [includeClub, setIncludeClub] = useState(true);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState<'now' | 'later'>('now');
  const [scheduledFor, setScheduledFor] = useState('');
  const [preview, setPreview] = useState<QueueResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(0);

  const channels = useMemo(() => (channel === 'both' ? ['sms', 'email'] : [channel]) as ('sms' | 'email')[], [channel]);
  const scheduleIso = when === 'later' && scheduledFor ? new Date(scheduledFor).toISOString() : null;
  const opts = useMemo(() => ({
    prospectIds, channels, includeAthlete, includeClub, personalNote: note, scheduledFor: scheduleIso,
  }), [prospectIds, channels, includeAthlete, includeClub, note, scheduleIso]);

  // Live preview: re-run the server dry run whenever the options settle.
  useEffect(() => {
    if (!open || prospectIds.length === 0 || (!includeAthlete && !includeClub)) { setPreview(null); return; }
    let cancelled = false;
    setPreviewing(true);
    const t = setTimeout(() => {
      api.queueInvitations({ ...opts, dryRun: true })
        .then((r) => { if (!cancelled) { setPreview(r); setError(null); } })
        .catch((e) => { if (!cancelled) { setPreview(null); setError(e.message); } })
        .finally(() => { if (!cancelled) setPreviewing(false); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, opts, prospectIds.length, includeAthlete, includeClub]);

  useEffect(() => { if (open) { setExpanded(0); setError(null); } }, [open]);

  async function send() {
    setSending(true);
    setError(null);
    try {
      const result = await api.queueInvitations(opts);
      onSent(result);
      onClose();
      setNote('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  const sendable = preview?.queued ?? 0;
  const blocked = preview?.results.filter((r) => r.reason) ?? [];
  const ready = preview?.results.filter((r) => !r.reason) ?? [];

  return (
    <Drawer open={open} onClose={onClose} title="Send invitations"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-vekt-grey">
            {previewing ? 'Checking…' : preview ? `${sendable} message${sendable === 1 ? '' : 's'} ready${blocked.length ? ` · ${blocked.length} blocked` : ''}` : ''}
          </span>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={send} loading={sending} disabled={!preview || sendable === 0 || previewing}>
              {when === 'later' ? 'Schedule' : 'Send'} {sendable > 0 ? sendable : ''} {sendable === 1 ? 'invitation' : 'invitations'}
            </Button>
          </div>
        </div>
      }>
      <div className="flex flex-col gap-8">
        <div>
          <div className="vekt-label mb-2">To</div>
          <div className="text-white">{prospectLabel}</div>
        </div>

        <Field label="Send by">
          <Segmented label="Channel" value={channel} onChange={setChannel}
            options={[{ value: 'both', label: 'Text + email' }, { value: 'sms', label: 'Text' }, { value: 'email', label: 'Email' }]} />
        </Field>

        <div className="flex flex-col gap-4">
          <span className="vekt-label">Recipients</span>
          <Toggle checked={includeAthlete} onChange={setIncludeAthlete} label="The athlete"
            hint="Athletes under 18 need a parent/guardian contact; the parent gets a copy and gives consent first." />
          <Toggle checked={includeClub} onChange={setIncludeClub} label="Their club coach / director"
            hint="Invited to give their confidential read on the athlete. You never see what they said, only VEKT's overall read." />
        </div>

        <Field label="Personal note (optional)" hint={`${note.length}/280 · Added to the approved VEKT message. You can't change the opt-out wording.`}>
          <Textarea maxLength={280} value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Great to see you play at the showcase this weekend." />
        </Field>

        <Field label="When">
          <div className="flex flex-wrap items-center gap-4">
            <Segmented label="When" value={when} onChange={setWhen}
              options={[{ value: 'now', label: 'Now' }, { value: 'later', label: 'Schedule' }]} />
            {when === 'later' && (
              <Input type="datetime-local" className="max-w-[240px]" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
            )}
          </div>
          <span className="text-xs text-vekt-grey">Texts only go out 9am–8pm in the recipient's time zone; anything outside that waits for the next morning.</span>
        </Field>

        {error && <ErrorNote message={error} />}

        {preview && (
          <div className="flex flex-col gap-3">
            <span className="vekt-label">Preview · exactly what each person receives</span>
            {ready.map((r, i) => (
              <div key={`r${i}`} className="border border-white/[0.1] rounded">
                <button type="button" onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-left">
                  <span className="text-sm text-white">{r.recipient_name}
                    <span className="text-vekt-grey"> · {recipientLabel[r.recipient_type]} · {r.channel === 'sms' ? 'Text' : 'Email'}</span>
                  </span>
                  <span className="text-xs text-vekt-grey">
                    {r.status === 'pending_approval' ? 'Needs compliance approval' : new Date(r.scheduled_for) > new Date(Date.now() + 60000) ? `Sends ${formatDate(r.scheduled_for, true)}` : 'Sends now'}
                  </span>
                </button>
                {expanded === i && (
                  <div className="px-4 pb-4">
                    <div className="text-xs text-vekt-grey mb-2">To {r.to}</div>
                    {r.subject && <div className="text-sm text-white mb-2">Subject: {r.subject}</div>}
                    <pre className="whitespace-pre-wrap font-geist text-sm text-white/90 bg-vekt-panel rounded p-4">{r.body}</pre>
                  </div>
                )}
              </div>
            ))}
            {blocked.length > 0 && (
              <div className="border border-dashed border-white/30 rounded p-4 flex flex-col gap-2">
                <span className="vekt-label">Won't be sent</span>
                {blocked.map((r, i) => (
                  <div key={`b${i}`} className="text-sm flex flex-wrap gap-x-2">
                    <span className="text-white">{r.recipient_name}</span>
                    <span className="text-vekt-grey">({recipientLabel[r.recipient_type]}, {r.channel === 'sms' ? 'text' : 'email'})</span>
                    <Badge tone="warn">{r.reason}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Drawer>
  );
}
