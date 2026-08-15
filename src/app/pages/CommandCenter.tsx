import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, ShieldAlert, UploadCloud, ArrowRight,
  UserPlus, ArrowRightLeft, UserMinus, Mail, RefreshCcw, Briefcase,
  CheckCircle2, Circle, ListChecks,
} from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { DashboardStats, getDashboardStats, getDataHealth, DataHealth } from '../../lib/api';
import { Card, Spinner, ErrorBox, StatusPill, formatDateTime } from '../components/ui';

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
  const [health, setHealth] = useState<DataHealth | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isConfigured) return;
    getDashboardStats().then(setStats).catch((e) => setError((e as Error).message));
    getDataHealth().then(setHealth).catch(() => undefined);
  }, []);

  if (!isConfigured) {
    return (
      <div>
        <h1 className="text-3xl font-bold">
          {greeting()}, Jen<span className="text-[#FF0000]">.</span>
        </h1>
        <p className="text-gray-400 mt-2 mb-8">One step left: connect your live database and you're ready to sync real files.</p>
        <Card className="p-8 max-w-2xl">
          <h2 className="text-lg font-semibold mb-2">Finish setup</h2>
          <p className="text-gray-400 text-sm mb-4">
            The interface is fully built — it just needs a live database behind it. Setup takes about five minutes.
          </p>
          <Link
            to="/app/setup"
            className="inline-flex items-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            Connect the database <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      </div>
    );
  }

  if (error) return <ErrorBox message={error} />;
  if (!stats) return <Spinner />;

  // The guided monthly workflow: each step is computed from live data, so the
  // checklist always reflects where Jen actually is this month.
  const now = new Date();
  const syncedThisMonth = stats.lastBatch != null &&
    new Date(stats.lastBatch.created_at).getMonth() === now.getMonth() &&
    new Date(stats.lastBatch.created_at).getFullYear() === now.getFullYear() &&
    stats.lastBatch.status !== 'failed';
  const queueClear = stats.pendingReviews === 0;
  const healthIssues = health ? health.missingEmail + health.duplicateEmails.length : null;
  const healthClean = healthIssues === 0;
  const readyToExport = syncedThisMonth && queueClear;

  const workflow = [
    {
      done: syncedThisMonth,
      to: '/app/sync',
      title: "Upload this month's vendor file(s)",
      detail: syncedThisMonth
        ? `Last sync: ${stats.lastBatch!.file_name} on ${formatDateTime(stats.lastBatch!.created_at)}`
        : stats.lastBatch
        ? `Nothing synced yet this month — the last file was ${formatDateTime(stats.lastBatch.created_at)}.`
        : 'No files synced yet — your first upload becomes the baseline.',
    },
    {
      done: queueClear,
      to: '/app/review',
      title: 'Clear the review queue',
      detail: queueClear
        ? 'No flagged changes waiting.'
        : `${stats.pendingReviews} flagged change${stats.pendingReviews === 1 ? '' : 's'} need${stats.pendingReviews === 1 ? 's' : ''} your approve/reject call.`,
    },
    {
      done: healthClean,
      to: '/app/health',
      title: 'Check data health',
      detail: health === null
        ? 'Checking…'
        : healthClean
        ? 'No missing emails or duplicate contacts.'
        : `${health.missingEmail} coach${health.missingEmail === 1 ? '' : 'es'} missing an email · ${health.duplicateEmails.length} duplicate email${health.duplicateEmails.length === 1 ? '' : 's'}.`,
    },
    {
      done: false,
      to: '/app/export',
      title: 'Push the clean list to the app',
      detail: readyToExport
        ? 'Synced and reviewed — pull the export (or let the app read Supabase live).'
        : 'Unlocks meaningfully once the sync is in and the queue is clear.',
    },
  ];

  const tiles = [
    { label: 'Active Coaches', value: stats.activeCoaches, icon: Users, to: '/app/coaches' },
    { label: 'Programs', value: stats.programs, icon: GraduationCap, to: '/app/programs' },
    { label: 'Pending Reviews', value: stats.pendingReviews, icon: ShieldAlert, to: '/app/review', alert: stats.pendingReviews > 0 },
    { label: 'Former Coaches', value: stats.inactiveCoaches, icon: UserMinus, to: '/app/coaches?status=inactive' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold">
        {greeting()}, Jen<span className="text-[#FF0000]">.</span>
      </h1>
      <p className="text-gray-400 mt-2 mb-8">
        {stats.pendingReviews > 0
          ? `${stats.pendingReviews} flagged change${stats.pendingReviews === 1 ? '' : 's'} need${stats.pendingReviews === 1 ? 's' : ''} your review.`
          : 'Your database is up to date — nothing needs your attention.'}
      </p>

      {/* Guided monthly workflow */}
      <Card className="p-6 mb-8">
        <div className="flex items-center gap-2 font-semibold mb-4">
          <ListChecks className="w-4 h-4 text-[#FF0000]" /> This month's checklist
        </div>
        <ol className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {workflow.map(({ done, to, title, detail }, i) => (
            <li key={title}>
              <Link to={to} className="block h-full">
                <div className={`h-full rounded-lg border p-4 transition-colors hover:border-[#FF0000]/50 ${done ? 'border-green-900 bg-green-900/10' : 'border-[#2a2a2a] bg-[#1f1f1f]'}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-gray-200">{i + 1} · {title}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{detail}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tiles.map(({ label, value, icon: Icon, to, alert }) => (
          <Link key={label} to={to}>
            <Card className={`p-5 hover:border-[#FF0000]/40 transition-colors ${alert ? 'border-[#FF0000]/60' : ''}`}>
              <Icon className={`w-5 h-5 mb-3 ${alert ? 'text-[#FF0000]' : 'text-gray-500'}`} />
              <div className="text-2xl font-bold">{value.toLocaleString()}</div>
              <div className="text-sm text-gray-400">{label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Last Sync</h2>
            <Link to="/app/sync" className="text-sm text-[#FF6666] hover:text-white flex items-center gap-1">
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
                    <div key={l as string} className="bg-[#1f1f1f] rounded-lg p-2 text-center">
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
              <Link to="/app/sync" className="text-[#FF6666] hover:text-white underline underline-offset-2">
                Upload your baseline file
              </Link>{' '}
              to load the database.
            </div>
          )}
          <Link
            to="/app/sync"
            className="mt-5 inline-flex items-center gap-2 bg-[#FF0000] hover:bg-[#CC0000] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
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
                      <Link to={`/app/coaches/${c.coach_id}`} className="text-gray-200 hover:text-[#FF6666] font-medium">
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
