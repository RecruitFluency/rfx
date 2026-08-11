import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, ShieldAlert, UploadCloud, ArrowRight,
  UserPlus, ArrowRightLeft, UserMinus, Mail, RefreshCcw, Briefcase, Sparkles, HeartPulse,
} from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { DashboardStats, getDashboardStats } from '../../lib/api';
import { buildClubHealth } from '../../lib/insights';
import { Card, Spinner, ErrorBox, StatusPill, formatDateTime } from '../components/ui';
import { PlainEnglish, InsightList } from '../components/PlainEnglish';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const CHANGE_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  hired: { icon: UserPlus, label: 'Hired', color: 'text-green-400' },
  moved: { icon: ArrowRightLeft, label: 'Moved', color: 'text-blue-400' },
  title_change: { icon: Briefcase, label: 'New title', color: 'text-blue-400' },
  email_change: { icon: Mail, label: 'Email changed', color: 'text-amber-400' },
  departed: { icon: UserMinus, label: 'Departed', color: 'text-red-400' },
  reinstated: { icon: RefreshCcw, label: 'Reinstated', color: 'text-green-400' },
  merged: { icon: ArrowRightLeft, label: 'Records merged', color: 'text-purple-400' },
};

export default function CommandCenter() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    getDashboardStats().then(setStats).catch((e) => setError((e as Error).message));
  }, []);

  if (!isConfigured) {
    return (
      <div>
        <h1 className="text-3xl font-bold">
          {greeting()}, Jen<span className="text-volt">.</span>
        </h1>
        <p className="text-gray-400 mt-2 mb-8">One step left: connect your live database and you're ready to sync real files.</p>
        <Card className="p-8 max-w-2xl">
          <h2 className="text-lg font-semibold mb-2">Finish setup</h2>
          <p className="text-gray-400 text-sm mb-4">
            The interface is fully built — it just needs a live database behind it. Setup takes about five minutes.
          </p>
          <Link
            to="/app/setup"
            className="inline-flex items-center gap-2 bg-volt hover:bg-volt/80 text-black font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Connect the database <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>
    );
  }

  if (error) return <ErrorBox message={error} />;
  if (!stats) return <Spinner />;

  const tiles = [
    { label: 'Active Coaches', value: stats.activeCoaches, icon: Users, to: '/app/coaches' },
    { label: 'Programs', value: stats.programs, icon: GraduationCap, to: '/app/programs' },
    { label: 'Pending Reviews', value: stats.pendingReviews, icon: ShieldAlert, to: '/app/review', alert: stats.pendingReviews > 0 },
    { label: 'Former Coaches', value: stats.inactiveCoaches, icon: UserMinus, to: '/app/coaches?status=inactive' },
  ];

  const health = buildClubHealth(stats);
  const BAND_COLOR: Record<string, string> = {
    Healthy: 'text-green-400',
    Steady: 'text-amber-400',
    'Needs attention': 'text-volt',
  };

  return (
    <div>
      <h1 className="text-3xl font-bold">
        {greeting()}, Jen<span className="text-volt">.</span>
      </h1>
      <p className="text-gray-400 mt-2 mb-8">
        {stats.pendingReviews > 0
          ? `${stats.pendingReviews} flagged change${stats.pendingReviews === 1 ? '' : 's'} need${stats.pendingReviews === 1 ? 's' : ''} your review.`
          : 'Your database is up to date — nothing needs your attention.'}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tiles.map(({ label, value, icon: Icon, to, alert }) => (
          <Link key={label} to={to}>
            <Card className={`p-5 hover:border-volt/40 transition-colors ${alert ? 'border-volt/60' : ''}`}>
              <Icon className={`w-5 h-5 mb-3 ${alert ? 'text-volt' : 'text-gray-500'}`} />
              <div className="text-2xl font-bold">{value.toLocaleString()}</div>
              <div className="text-sm text-gray-400">{label}</div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Club Health — the numbers, translated into plain English */}
      <Card className="p-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-volt" /> Club Health
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Health score</span>
            <span className={`font-display font-bold text-lg ${BAND_COLOR[health.band]}`}>{health.score}</span>
            <span className="text-gray-600">/100</span>
            <span className={`ml-1 text-xs font-medium rounded-full px-2.5 py-0.5 border ${
              health.band === 'Healthy' ? 'border-green-800 text-green-400 bg-green-900/20'
              : health.band === 'Steady' ? 'border-amber-800 text-amber-400 bg-amber-900/20'
              : 'border-volt/40 text-volt bg-volt/10'
            }`}>{health.band}</span>
          </div>
        </div>

        <PlainEnglish label="What this means">
          {health.summary}
        </PlainEnglish>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-3 font-mono">The details, and what to do next</div>
          <InsightList items={health.insights} />
        </div>
      </Card>

      {/* Program Match teaser — the plain-English recruiting console */}
      <Link to="/app/match" className="block mb-6">
        <Card className="p-6 hover:border-volt/40 transition-colors">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-volt/10 border border-volt/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-volt" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold flex items-center gap-2">
                Program Match <ArrowRight className="w-4 h-4 text-volt" />
              </div>
              <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                Describe a student-athlete in plain English — “a right back on the eastern seaboard, 3.2 GPA, who wants a business degree on a rural campus” — and syncmob names the college programs recruiting that player. Perfect for showing an athlete or parent exactly where they fit.
              </p>
            </div>
          </div>
        </Card>
      </Link>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Last Sync</h2>
            <Link to="/app/sync" className="text-sm text-volt hover:text-white flex items-center gap-1">
              Monthly Sync <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {stats.lastBatch ? (
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 truncate mr-2">{stats.lastBatch.file_name}</span>
                <StatusPill status={stats.lastBatch.status} />
              </div>
              <div className="text-gray-500">{formatDateTime(stats.lastBatch.created_at)} · {stats.lastBatch.row_count.toLocaleString()} rows</div>
              {stats.lastBatch.stats.added !== undefined && (
                <div className="grid grid-cols-4 gap-2 pt-3">
                  {[
                    ['Added', stats.lastBatch.stats.added],
                    ['Updated', stats.lastBatch.stats.updated],
                    ['Moved', stats.lastBatch.stats.moved],
                    ['Departed', stats.lastBatch.stats.departed],
                  ].map(([l, v]) => (
                    <div key={l as string} className="bg-matte2 rounded-lg p-2 text-center">
                      <div className="font-bold">{(v as number) ?? 0}</div>
                      <div className="text-xs text-gray-500">{l}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No syncs yet.{' '}
              <Link to="/app/sync" className="text-volt hover:text-white underline underline-offset-2">
                Upload your baseline file
              </Link>{' '}
              to load the database.
            </div>
          )}
          <Link
            to="/app/sync"
            className="mt-5 inline-flex items-center gap-2 bg-volt hover:bg-volt/80 text-black text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            <UploadCloud className="w-4 h-4" /> Upload this month's file
          </Link>
        </Card>

        <Card className="p-6">
          <h2 className="font-semibold mb-4">Recent Changes</h2>
          {stats.recentChanges.length === 0 ? (
            <div className="text-sm text-gray-500">Changes from your syncs will show up here.</div>
          ) : (
            <ul className="space-y-3">
              {stats.recentChanges.map((c) => {
                const meta = CHANGE_META[c.change_type] ?? CHANGE_META.moved;
                const Icon = meta.icon;
                return (
                  <li key={c.id} className="flex items-start gap-3 text-sm">
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="min-w-0">
                      <Link to={`/app/coaches/${c.coach_id}`} className="text-gray-200 hover:text-volt font-medium">
                        {c.coaches ? `${c.coaches.first_name} ${c.coaches.last_name}` : 'Unknown coach'}
                      </Link>
                      <span className="text-gray-500">
                        {' '}— {meta.label.toLowerCase()}
                        {c.change_type === 'moved' && c.previous_school && c.school
                          ? `: ${c.previous_school} → ${c.school}`
                          : c.school ? ` at ${c.school}` : ''}
                      </span>
                      <div className="text-xs text-gray-600">{formatDateTime(c.changed_at)}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
