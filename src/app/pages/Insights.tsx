import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Trophy, GraduationCap, Activity, Flame } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { getInsights, Insights as InsightsData } from '../../lib/api';
import { Card, PageHeader, Spinner, ErrorBox } from '../components/ui';
import NotConnected from '../components/NotConnected';

// Movement-series colors — validated for the dark surface (#1a1a1a):
// contrast, CVD separation, and lightness band all pass.
const SERIES = [
  { key: 'hired', label: 'Hired', color: '#16a34a' },
  { key: 'moved', label: 'Moved', color: '#3b82f6' },
  { key: 'departed', label: 'Departed', color: '#ea580c' },
] as const;

function BarList({ items, max: maxOverride }: { items: { name: string; count: number }[]; max?: number }) {
  const max = maxOverride ?? Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5">
      {items.map(({ name, count }) => (
        <li key={name} className="text-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-300 truncate mr-3">{name}</span>
            <span className="text-gray-400 tabular-nums">{count.toLocaleString()}</span>
          </div>
          <div className="h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
            <div className="h-full bg-[#FF6666] rounded-full" style={{ width: `${(100 * count) / max}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Insights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    getInsights().then(setData).catch((e) => setError((e as Error).message));
  }, []);

  if (!isConfigured) return <NotConnected feature="Insights" />;
  if (error) return <ErrorBox message={error} />;
  if (!data) return <Spinner />;

  const thisMonth = data.byMonth[data.byMonth.length - 1];
  const monthMax = Math.max(1, ...data.byMonth.flatMap((m) => [m.hired, m.moved, m.departed]));

  const tiles = [
    { icon: Users, label: 'Active coaches', value: data.activeTotal },
    { icon: Trophy, label: 'Sports covered', value: data.sportCount },
    { icon: GraduationCap, label: 'Programs tracked', value: data.programCount },
    { icon: Activity, label: 'Movements this month', value: thisMonth.hired + thisMonth.moved + thisMonth.departed },
  ];

  return (
    <div>
      <PageHeader
        title="Insights"
        subtitle="Patterns across the college coaching landscape — who's hiring, where the churn is, and how coverage is growing."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {tiles.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-5">
            <Icon className="w-5 h-5 mb-3 text-gray-500" />
            <div className="text-2xl font-bold">{value.toLocaleString()}</div>
            <div className="text-sm text-gray-400">{label}</div>
          </Card>
        ))}
      </div>

      {/* Movement trend */}
      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="font-semibold">Coaching movement — last 6 months</h2>
          <div className="flex gap-4 text-xs text-gray-400">
            {SERIES.map(({ key, label, color }) => (
              <span key={key} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} /> {label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-4 h-44" role="img" aria-label="Monthly counts of coaches hired, moved, and departed over the last six months">
          {data.byMonth.map((m) => (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-2 min-w-0 h-full">
              <div className="flex items-end justify-center gap-[2px] flex-1 w-full">
                {SERIES.map(({ key, label, color }) => (
                  <div
                    key={key}
                    title={`${m.month}: ${m[key]} ${label.toLowerCase()}`}
                    className="w-1/4 max-w-[18px] rounded-t"
                    style={{
                      backgroundColor: color,
                      height: `${Math.max(m[key] === 0 ? 0 : 3, (100 * m[key]) / monthMax)}%`,
                    }}
                  />
                ))}
              </div>
              <div className="text-xs text-gray-500">{m.month}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-4">
          Sourced from the movement log — every sync and manual edit is recorded against the coach's permanent ID.
          See the raw feed in the <Link to="/app/tracker" className="text-[#FF6666] hover:text-white">Coach Tracker</Link>.
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Active coaches by sport</h2>
          {data.bySport.length === 0 ? (
            <p className="text-sm text-gray-500">Load a vendor file to see the breakdown.</p>
          ) : (
            <BarList items={data.bySport.slice(0, 10)} />
          )}
        </Card>
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Active coaches by division</h2>
          {data.byDivision.length === 0 ? (
            <p className="text-sm text-gray-500">Load a vendor file to see the breakdown.</p>
          ) : (
            <BarList items={data.byDivision.slice(0, 10)} />
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="font-semibold mb-4">Top states by coach count</h2>
          {data.byState.length === 0 ? (
            <p className="text-sm text-gray-500">Load a vendor file to see the breakdown.</p>
          ) : (
            <BarList items={data.byState.slice(0, 10)} />
          )}
        </Card>
        <Card className="p-6">
          <div className="flex items-center gap-2 font-semibold mb-4">
            <Flame className="w-4 h-4 text-[#FF0000]" /> Hottest programs (last 90 days)
          </div>
          {data.hotPrograms.length === 0 ? (
            <p className="text-sm text-gray-500">
              No recent churn recorded. After a couple of monthly syncs, the programs with the most hires, moves,
              and departures show up here.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.hotPrograms.map(({ school, changes }, i) => (
                <li key={school} className="flex items-center justify-between bg-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm">
                  <span className="text-gray-200 truncate mr-3">
                    <span className="text-gray-600 tabular-nums mr-2">{i + 1}.</span>
                    {school}
                  </span>
                  <span className="text-gray-400 whitespace-nowrap tabular-nums">{changes} change{changes === 1 ? '' : 's'}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {data.truncated && (
        <p className="text-xs text-amber-400 mt-6">
          The database has grown past 10,000 rows in one of these views, so the numbers above are lower bounds.
        </p>
      )}
    </div>
  );
}
