import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Database, RefreshCcw, Rocket, BookOpen } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { getSetupStatus, SetupStatus } from '../../lib/api';
import { Card, PageHeader, Spinner } from '../components/ui';

const COMPONENTS: { key: keyof SetupStatus; label: string; detail: string }[] = [
  { key: 'schema', label: 'Core database & sync engine', detail: 'Coach master list, history, programs, review queue, and the monthly diff engine.' },
  { key: 'multisport', label: 'Per-sport sync protection', detail: 'A soccer file can never mark a basketball coach departed.' },
  { key: 'watchtower', label: 'Watchtower agent', detail: 'Daily in-database scan for movement, aging reviews, and data drift (bell icon).' },
  { key: 'radar', label: 'National Radar', detail: 'Sweeps coaching-news feeds every 6 hours and matches headlines to your coaches.' },
];

export default function Setup() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [checking, setChecking] = useState(false);

  function check() {
    if (!isConfigured) return;
    setChecking(true);
    getSetupStatus()
      .then(setStatus)
      .catch(() => setStatus({ schema: false, multisport: false, watchtower: false, radar: false }))
      .finally(() => setChecking(false));
  }

  useEffect(check, []);

  const allOk = status !== null && Object.values(status).every(Boolean);
  const anyMissing = status !== null && !allOk;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Live status of every component, and the one file that installs or repairs all of them."
      />

      {/* Overall status */}
      <Card className="p-5 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${allOk ? 'bg-green-500' : status === null ? 'bg-gray-500' : 'bg-amber-500'}`} />
          {!isConfigured && <span className="text-gray-300">Not connected to a database.</span>}
          {isConfigured && status === null && <span className="text-gray-300">Checking the database…</span>}
          {allOk && <span className="text-gray-300">Everything is installed and running — you're fully set up.</span>}
          {anyMissing && <span className="text-gray-300">Connected, but some components aren't installed yet — see below.</span>}
        </div>
        <button
          onClick={check}
          disabled={checking}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCcw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} /> Re-check
        </button>
      </Card>

      {/* Component checklist */}
      <Card className="p-6 mb-6 max-w-3xl">
        <div className="flex items-center gap-2 font-semibold mb-4">
          <Database className="w-4 h-4 text-[#FF0000]" /> Database components
        </div>
        {status === null ? (
          <Spinner />
        ) : (
          <ul className="space-y-3">
            {COMPONENTS.map(({ key, label, detail }) => (
              <li key={key} className="flex items-start gap-3 text-sm">
                {status[key] ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="text-gray-200 font-medium">{label}</span>
                  {!status[key] && <span className="text-amber-400 text-xs ml-2">not installed</span>}
                  <p className="text-gray-500 text-xs mt-0.5">{detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={`mt-5 rounded-lg border p-4 text-sm leading-relaxed ${anyMissing ? 'border-amber-800 bg-amber-900/10 text-gray-300' : 'border-[#2a2a2a] bg-[#1f1f1f] text-gray-400'}`}>
          {anyMissing ? 'To install everything missing:' : 'If anything ever breaks or shows "not installed":'}{' '}
          open your Supabase project → <span className="text-gray-200">SQL Editor</span> → New query, paste the
          entire contents of{' '}
          <a
            href="https://github.com/RecruitFluency/rfx/blob/claude/coach-database-automation-lupipt/supabase/setup_all.sql"
            target="_blank"
            rel="noreferrer"
            className="text-[#FF6666] hover:text-white underline underline-offset-2"
          >
            <code className="text-xs">supabase/setup_all.sql</code>
          </a>{' '}
          and click <span className="text-gray-200">Run</span>. One file installs and repairs everything — it's safe
          to run as many times as you like. Then hit Re-check above.
        </div>
      </Card>

      {/* Next steps */}
      <Card className="p-6 max-w-3xl">
        <div className="flex items-center gap-2 font-semibold mb-3">
          <Rocket className="w-4 h-4 text-[#FF0000]" /> After setup
        </div>
        <p className="text-sm text-gray-400 leading-relaxed mb-4">
          Head to <Link to="/app/sync" className="text-[#FF6666] hover:text-white">Monthly Sync</Link> and drop your
          current master spreadsheet (tag the sport if the file covers just one). That becomes the baseline every
          future file is compared against. From then on, the{' '}
          <Link to="/app" className="text-[#FF6666] hover:text-white">Command Center checklist</Link> walks you
          through each month.
        </p>
        <Link to="/app/guide" className="inline-flex items-center gap-2 text-sm text-[#FF6666] hover:text-white">
          <BookOpen className="w-4 h-4" /> Read the 2-minute guide to how everything works
        </Link>
      </Card>
    </div>
  );
}
