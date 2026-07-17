import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud, FileSpreadsheet, CheckCircle2, ShieldAlert } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { ParsedFile, parseVendorFile } from '../../lib/excel';
import {
  createBatch, hasBaseline, listBatches, listSports, multisportReady, processBatch, uploadStagingRows,
} from '../../lib/api';
import { SyncBatch, SyncStats } from '../../lib/types';
import { Card, PageHeader, Spinner, ErrorBox, StatusPill, EmptyState, formatDateTime } from '../components/ui';
import NotConnected from '../components/NotConnected';

type Stage =
  | { kind: 'idle' }
  | { kind: 'parsing'; fileName: string }
  | { kind: 'preview'; fileName: string; parsed: ParsedFile }
  | { kind: 'uploading'; fileName: string; uploaded: number; total: number }
  | { kind: 'processing'; fileName: string }
  | { kind: 'done'; fileName: string; stats: SyncStats };

export default function SyncEngine() {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [baseline, setBaseline] = useState<boolean | null>(null);
  const [batches, setBatches] = useState<SyncBatch[]>([]);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [sport, setSport] = useState('');
  const [knownSports, setKnownSports] = useState<string[]>([]);
  const [multisport, setMultisport] = useState<boolean | null>(null);

  const refresh = useCallback(() => {
    if (!isConfigured) return;
    listBatches().then(setBatches).catch(() => undefined);
    listSports().then(setKnownSports).catch(() => undefined);
    multisportReady().then(setMultisport).catch(() => setMultisport(false));
  }, []);

  useEffect(refresh, [refresh]);

  // The baseline question is per-sport: the first women's soccer file is a
  // baseline for women's soccer even if other sports are already loaded.
  useEffect(() => {
    if (!isConfigured) return;
    setBaseline(null);
    hasBaseline(sport || undefined).then(setBaseline).catch((e) => setError((e as Error).message));
  }, [sport]);

  if (!isConfigured) return <NotConnected feature="the Monthly Sync engine" />;

  async function handleFile(f: File) {
    setError('');
    setStage({ kind: 'parsing', fileName: f.name });
    try {
      const parsed = await parseVendorFile(f);
      // If every row in the file names the same sport, preselect it.
      const sportsInFile = [...new Set(parsed.rows.map((r) => r.sport?.trim()).filter(Boolean))] as string[];
      if (sportsInFile.length === 1) setSport(sportsInFile[0]);
      setStage({ kind: 'preview', fileName: f.name, parsed });
    } catch (e) {
      setError((e as Error).message);
      setStage({ kind: 'idle' });
    }
  }

  async function runSync(parsed: ParsedFile, fileName: string) {
    setError('');
    try {
      const isBaseline = baseline === false;
      setStage({ kind: 'uploading', fileName, uploaded: 0, total: parsed.totalRows });
      const batch = await createBatch(fileName, isBaseline, parsed.totalRows, sport.trim() || undefined);
      await uploadStagingRows(batch.id, parsed.rows, (uploaded) =>
        setStage({ kind: 'uploading', fileName, uploaded, total: parsed.totalRows })
      );
      setStage({ kind: 'processing', fileName });
      const stats = await processBatch(batch.id);
      setStage({ kind: 'done', fileName, stats });

      refresh();
    } catch (e) {
      setError(`Sync failed: ${(e as Error).message}`);
      setStage({ kind: 'idle' });
    }
  }

  const statRow = (stats: SyncStats) => [
    ['Added', stats.added],
    ['Updated', stats.updated],
    ['Moved schools', stats.moved],
    ['Departed', stats.departed],
    ['Reinstated', stats.reinstated],
    ['Unchanged', stats.unchanged],
  ] as [string, number | undefined][];

  return (
    <div>
      <PageHeader
        title="Monthly Sync"
        subtitle={
          baseline === false
            ? 'No baseline loaded yet — your first upload becomes the master list.'
            : 'Drop this month\'s vendor file and the engine will work out exactly what changed.'
        }
      />

      {error && <div className="mb-6"><ErrorBox message={error} /></div>}

      {(stage.kind === 'idle' || stage.kind === 'parsing') && (
        <label
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-16 px-6 cursor-pointer transition-colors ${
            dragOver ? 'border-[#FF0000] bg-[#FF0000]/5' : 'border-[#2a2a2a] hover:border-[#FF0000]/50 bg-[#161616]'
          }`}
        >
          <UploadCloud className="w-10 h-10 text-[#FF0000]" />
          {stage.kind === 'parsing' ? (
            <div className="text-gray-300">Reading {stage.fileName}…</div>
          ) : (
            <>
              <div className="text-gray-200 font-medium">
                Drag & drop {baseline === false ? 'your baseline file' : "this month's file"} here
              </div>
              <div className="text-gray-500 text-sm">.xlsx, .xls, or .csv — or click to browse</div>
            </>
          )}
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />
        </label>
      )}

      {stage.kind === 'preview' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="w-6 h-6 text-[#FF0000]" />
            <div>
              <div className="font-semibold">{stage.fileName}</div>
              <div className="text-sm text-gray-500">
                {stage.parsed.totalRows.toLocaleString()} data rows ·{' '}
                {baseline === false ? 'will be loaded as your baseline master list' : 'will be compared against the master list'}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4 text-sm">
            <div className="bg-[#1f1f1f] rounded-lg p-4">
              <div className="text-gray-400 mb-2 font-medium">Recognized columns</div>
              <div className="flex flex-wrap gap-1.5">
                {stage.parsed.mappedColumns.map((c) => (
                  <span key={c.field} className="bg-green-900/30 text-green-400 border border-green-800 rounded px-2 py-0.5 text-xs">
                    {c.header} → {c.field.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
            <div className="bg-[#1f1f1f] rounded-lg p-4">
              <div className="text-gray-400 mb-2 font-medium">Ignored columns</div>
              {stage.parsed.unmappedColumns.length === 0 ? (
                <div className="text-gray-600 text-xs">None — every column was recognized.</div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {stage.parsed.unmappedColumns.map((h) => (
                    <span key={h} className="bg-[#2a2a2a] text-gray-400 rounded px-2 py-0.5 text-xs">{h}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#1f1f1f] rounded-lg p-4 mb-4 text-sm">
            <label className="text-gray-400 font-medium block mb-2" htmlFor="sync-sport">
              Which sport does this file cover?
            </label>
            <input
              id="sync-sport"
              list="sync-sport-options"
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              placeholder="All sports (leave blank)"
              disabled={multisport === false}
              className="w-full max-w-sm bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000]/60 disabled:opacity-50"
            />
            <datalist id="sync-sport-options">
              {[...new Set([...knownSports, ...stage.parsed.rows.map((r) => r.sport ?? '').filter(Boolean)])].map(
                (s) => <option key={s} value={s} />
              )}
            </datalist>
            <p className="text-xs text-gray-500 mt-2">
              {sport.trim()
                ? `Only ${sport.trim()} coaches can be marked departed by this file — every other sport is untouched.`
                : 'Blank means the file covers your entire database: any active coach missing from it counts as departed.'}
            </p>
            {multisport === false && (
              <p className="text-xs text-amber-400 mt-2">
                Per-sport syncing needs a one-time database update: run{' '}
                <code className="bg-black px-1.5 py-0.5 rounded">supabase/migrations/0002_multisport.sql</code> in the
                Supabase SQL editor. Until then, every file is treated as covering all sports.
              </p>
            )}
          </div>

          {stage.parsed.missingIdCount > 0 && (
            <div className="flex items-center gap-2 text-amber-400 text-sm mb-4">
              <ShieldAlert className="w-4 h-4" />
              {stage.parsed.missingIdCount} row{stage.parsed.missingIdCount === 1 ? '' : 's'} have no unique ID — they'll be sent to the review queue, not applied automatically.
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => runSync(stage.parsed, stage.fileName)}
              className="bg-[#FF0000] hover:bg-[#CC0000] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              {baseline === false ? 'Load baseline' : 'Run monthly sync'}
            </button>
            <button
              onClick={() => setStage({ kind: 'idle' })}
              className="bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 rounded-lg px-5 py-2.5 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {(stage.kind === 'uploading' || stage.kind === 'processing') && (
        <Card className="p-8 text-center">
          <div className="font-semibold mb-2">
            {stage.kind === 'uploading' ? 'Uploading rows to the database…' : 'Comparing against the master list…'}
          </div>
          {stage.kind === 'uploading' ? (
            <>
              <div className="w-full bg-[#1f1f1f] rounded-full h-2.5 my-4 overflow-hidden">
                <div
                  className="bg-[#FF0000] h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.round((stage.uploaded / Math.max(stage.total, 1)) * 100)}%` }}
                />
              </div>
              <div className="text-sm text-gray-500">
                {stage.uploaded.toLocaleString()} / {stage.total.toLocaleString()} rows
              </div>
            </>
          ) : (
            <Spinner label="The sync engine is figuring out who was hired, moved, or departed…" />
          )}
        </Card>
      )}

      {stage.kind === 'done' && (
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <div className="font-semibold">Sync complete — {stage.fileName}</div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {statRow(stage.stats).map(([label, v]) => (
              <div key={label} className="bg-[#1f1f1f] rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{(v ?? 0).toLocaleString()}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
          {(stage.stats.queued_for_review ?? 0) > 0 ? (
            <div className="flex items-center justify-between bg-amber-900/20 border border-amber-800 rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-4 h-4" />
                {stage.stats.queued_for_review} suspicious change{stage.stats.queued_for_review === 1 ? '' : 's'} paused for your approval
                {stage.stats.mass_departure_flagged ? ' — including a mass disappearance that looks like a bad vendor file.' : '.'}
              </div>
              <Link to="/app/review" className="text-[#FF6666] hover:text-white font-medium whitespace-nowrap ml-4">
                Review now →
              </Link>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Everything applied cleanly — no review needed.</div>
          )}
          <button
            onClick={() => setStage({ kind: 'idle' })}
            className="mt-4 bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-[#2a2a2a] text-gray-300 rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Upload another file
          </button>
        </Card>
      )}

      {/* Sync history */}
      <h2 className="font-semibold mt-10 mb-4">Sync History</h2>
      {batches.length === 0 ? (
        <EmptyState title="No syncs yet" hint="Your upload history will appear here after the first file." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-[#2a2a2a]">
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Rows</th>
                <th className="px-4 py-3 font-medium">Changes</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-b border-[#1f1f1f] last:border-0">
                  <td className="px-4 py-3 text-gray-200">
                    {b.file_name}
                    {b.sport && (
                      <span className="ml-2 text-xs bg-[#1f1f1f] border border-[#2a2a2a] text-gray-400 rounded px-1.5 py-0.5">
                        {b.sport}
                      </span>
                    )}
                    {b.is_baseline && <span className="ml-2 text-xs text-gray-500">(baseline)</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDateTime(b.created_at)}</td>
                  <td className="px-4 py-3 text-gray-400">{b.row_count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {b.stats.added !== undefined
                      ? `+${b.stats.added} / ~${b.stats.updated ?? 0} / −${b.stats.departed ?? 0}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
