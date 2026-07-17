import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartPulse, Mail, School, Trophy, Clock, Copy } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { DataHealth as Health, getDataHealth } from '../../lib/api';
import { Card, PageHeader, Spinner, ErrorBox, formatDate } from '../components/ui';
import NotConnected from '../components/NotConnected';

export default function DataHealth() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    getDataHealth().then(setHealth).catch((e) => setError((e as Error).message));
  }, []);

  if (!isConfigured) return <NotConnected feature="Data Health" />;
  if (error) return <ErrorBox message={error} />;
  if (!health) return <Spinner />;

  const pct = (n: number) => (health.activeTotal === 0 ? 0 : Math.round((100 * n) / health.activeTotal));
  const tone = (n: number) => (n === 0 ? 'text-green-400' : pct(n) > 10 ? 'text-red-400' : 'text-amber-400');

  const tiles = [
    {
      icon: Mail,
      label: 'Active coaches with no email',
      value: health.missingEmail,
      hint: 'The app can\'t reach these coaches — the most important gap to close.',
    },
    {
      icon: School,
      label: 'Active coaches with no school',
      value: health.missingSchool,
      hint: 'Won\'t appear on any program roster.',
    },
    {
      icon: Trophy,
      label: 'Active coaches with no sport',
      value: health.missingSport,
      hint: 'Invisible to sport filters and unprotected by per-sport syncs.',
    },
    {
      icon: Clock,
      label: `Not seen in a file for 60+ days`,
      value: health.stale,
      hint: `Still marked active but absent from every vendor file since ${formatDate(health.staleCutoffIso)}. They may have quietly left.`,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Data Health"
        subtitle={`Is the list clean enough to push to the app? Checks run across your ${health.activeTotal.toLocaleString()} active coaches.`}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tiles.map(({ icon: Icon, label, value, hint }) => (
          <Card key={label} className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-4 h-4 text-gray-500" />
              <HeartPulse className={`w-4 h-4 ml-auto ${tone(value)}`} />
            </div>
            <div className={`text-2xl font-bold ${tone(value)}`}>{value.toLocaleString()}</div>
            <div className="text-sm text-gray-300 mt-1">{label}</div>
            <div className="text-xs text-gray-500 mt-2 leading-relaxed">{hint}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6 max-w-3xl">
        <div className="flex items-center gap-2 font-semibold mb-2">
          <Copy className="w-4 h-4 text-[#FF0000]" /> Duplicate emails
        </div>
        {health.duplicateEmails.length === 0 ? (
          <p className="text-sm text-gray-500">
            No two active coaches share an email address. 🎉
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              These emails belong to more than one active coach — usually the same person under two vendor IDs.
              Open the directory, search the email, and merge or depart the stale record.
            </p>
            <ul className="space-y-2">
              {health.duplicateEmails.map(({ email, count }) => (
                <li key={email} className="flex items-center justify-between bg-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm">
                  <Link
                    to={`/app/coaches?search=${encodeURIComponent(email)}&status=all`}
                    className="text-gray-200 hover:text-[#FF6666] break-all"
                  >
                    {email}
                  </Link>
                  <span className="text-gray-500 ml-4 whitespace-nowrap">{count} coaches</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
