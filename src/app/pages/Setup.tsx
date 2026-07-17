import { useEffect, useState } from 'react';
import { CheckCircle2, Circle, Database, KeyRound, Rocket, RefreshCcw } from 'lucide-react';
import { db, isConfigured } from '../../lib/supabase';
import { Card, PageHeader } from '../components/ui';

type SchemaState = 'unknown' | 'checking' | 'ready' | 'missing';

export default function Setup() {
  const [schema, setSchema] = useState<SchemaState>('unknown');

  useEffect(() => {
    if (!isConfigured) return;
    setSchema('checking');
    db()
      .from('coaches')
      .select('id', { count: 'exact', head: true })
      .then(({ error }) => setSchema(error ? 'missing' : 'ready'));
  }, []);

  const steps = [
    {
      done: isConfigured,
      icon: Database,
      title: '1 · Create a free Supabase project',
      body: (
        <>
          Go to <span className="text-gray-200">supabase.com</span> → New project. Supabase is a hosted Postgres
          database — it's the live server that stores your master coach list. The free tier is plenty to start.
        </>
      ),
    },
    {
      done: isConfigured && schema === 'ready',
      icon: KeyRound,
      title: '2 · Run the schema, then add the two keys',
      body: (
        <>
          In Supabase, open <span className="text-gray-200">SQL Editor</span>, paste the contents of{' '}
          <code className="bg-[#1f1f1f] px-1.5 py-0.5 rounded text-xs">supabase/migrations/0001_coach_database.sql</code>{' '}
          from this project, and click Run — that creates every table plus the sync engine. Then in{' '}
          <span className="text-gray-200">Project Settings → API</span>, copy the Project URL and the anon public key
          into two environment variables where the app is hosted:
          <pre className="bg-black border border-[#2a2a2a] rounded-lg p-3 mt-2 text-xs text-gray-300 overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...`}
          </pre>
          On Vercel: Project → Settings → Environment Variables, add both, then redeploy.
        </>
      ),
    },
    {
      done: isConfigured && schema === 'ready',
      icon: Rocket,
      title: '3 · Upload your baseline file',
      body: (
        <>
          Once connected, head to <span className="text-gray-200">Monthly Sync</span> and drop your current master
          spreadsheet. That becomes the baseline every future monthly file is compared against.
        </>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Connection status and the one-time setup guide."
      />

      <Card className="p-5 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <span className={`w-2.5 h-2.5 rounded-full ${isConfigured && schema === 'ready' ? 'bg-green-500' : isConfigured ? 'bg-amber-500' : 'bg-red-500'}`} />
          {!isConfigured && <span className="text-gray-300">Not connected — no database keys are set.</span>}
          {isConfigured && schema === 'checking' && <span className="text-gray-300">Checking the database…</span>}
          {isConfigured && schema === 'ready' && <span className="text-gray-300">Connected — the database and sync engine are live.</span>}
          {isConfigured && schema === 'missing' && (
            <span className="text-gray-300">Keys are set, but the schema isn't installed yet — run the SQL in step 2.</span>
          )}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
        >
          <RefreshCcw className="w-3.5 h-3.5" /> Re-check
        </button>
      </Card>

      <div className="space-y-4 max-w-3xl">
        {steps.map(({ done, icon: Icon, title, body }) => (
          <Card key={title} className="p-5">
            <div className="flex items-start gap-4">
              {done ? (
                <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold mb-1.5">
                  <Icon className="w-4 h-4 text-[#FF0000]" /> {title}
                </div>
                <div className="text-sm text-gray-400 leading-relaxed">{body}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
