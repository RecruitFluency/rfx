// ---------------------------------------------------------------------------
// syncmob — plain-English insight engine
//
// Turns the raw dashboard numbers into a short briefing a club director can
// read at a glance: what the numbers actually mean, what's healthy, and what
// to do next. Numbers never stand alone — every figure comes with its sentence.
// ---------------------------------------------------------------------------

import { DashboardStats } from './api';

export interface Insight {
  tone: 'good' | 'watch' | 'action';
  text: string;
}

export interface ClubHealth {
  score: number;              // 0-100 composite
  band: 'Healthy' | 'Steady' | 'Needs attention';
  summary: string;            // the headline plain-English read
  insights: Insight[];        // bulleted plain-English points + next steps
}

function daysSince(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function buildClubHealth(stats: DashboardStats): ClubHealth {
  const insights: Insight[] = [];
  let score = 100;

  const totalCoaches = stats.activeCoaches + stats.inactiveCoaches;
  const lastSyncDays = daysSince(stats.lastBatch?.created_at);

  // --- Data freshness ---
  if (lastSyncDays === null) {
    score -= 35;
    insights.push({
      tone: 'action',
      text: 'No monthly sync has run yet, so the database is empty. Upload your baseline file in Monthly Sync to bring the roster to life — everything else waits on this.',
    });
  } else if (lastSyncDays > 45) {
    score -= 25;
    insights.push({
      tone: 'action',
      text: `Your last sync was ${lastSyncDays} days ago. Coaching moves happen constantly in the offseason — a file this old means outreach may be going to people who have already left. Run this month's sync to refresh contacts.`,
    });
  } else if (lastSyncDays > 32) {
    score -= 10;
    insights.push({
      tone: 'watch',
      text: `It's been ${lastSyncDays} days since the last sync. You're about due for this month's file — running it keeps every coach contact current.`,
    });
  } else {
    insights.push({
      tone: 'good',
      text: `The database is fresh — last synced ${lastSyncDays} day${lastSyncDays === 1 ? '' : 's'} ago. Contacts you pull today are current.`,
    });
  }

  // --- Pending reviews ---
  if (stats.pendingReviews > 0) {
    score -= Math.min(20, stats.pendingReviews * 2);
    const massNote = stats.lastBatch?.stats.mass_departure_flagged
      ? ' One of them looks like a mass disappearance — usually a truncated vendor file, so review before it wrongly marks a wave of coaches as departed.'
      : '';
    insights.push({
      tone: 'action',
      text: `${stats.pendingReviews} change${stats.pendingReviews === 1 ? '' : 's'} ${stats.pendingReviews === 1 ? 'is' : 'are'} paused in the Review Queue waiting on your call. Until you clear them, the master list isn't fully updated.${massNote}`,
    });
  } else if (lastSyncDays !== null) {
    insights.push({
      tone: 'good',
      text: 'Nothing is stuck in review — every change from your last sync has been applied cleanly to the master list.',
    });
  }

  // --- Roster churn read ---
  if (totalCoaches > 0) {
    const activeShare = Math.round((stats.activeCoaches / totalCoaches) * 100);
    if (activeShare < 70 && stats.inactiveCoaches > 5) {
      insights.push({
        tone: 'watch',
        text: `${activeShare}% of the coaches on file are still active (${stats.inactiveCoaches.toLocaleString()} have moved on). That's a lot of turnover — worth spot-checking that departed coaches aren't still on your outreach lists.`,
      });
    } else {
      insights.push({
        tone: 'good',
        text: `${stats.activeCoaches.toLocaleString()} active coaches across ${stats.programs.toLocaleString()} programs give you solid coverage to work from.`,
      });
    }
  }

  // --- Recent movement, translated ---
  const moves = stats.recentChanges.filter((c) => c.change_type === 'moved' || c.change_type === 'hired').length;
  if (moves >= 3) {
    insights.push({
      tone: 'watch',
      text: `${moves} coaches were recently hired or changed schools. New coaches rebuild their recruiting boards from scratch — these are the warmest doors to knock on right now.`,
    });
  }

  score = Math.max(0, Math.min(100, score));
  const band: ClubHealth['band'] = score >= 80 ? 'Healthy' : score >= 55 ? 'Steady' : 'Needs attention';

  const summary = writeSummary(band, score, stats, lastSyncDays);

  return { score, band, summary, insights };
}

function writeSummary(band: ClubHealth['band'], score: number, stats: DashboardStats, lastSyncDays: number | null): string {
  if (lastSyncDays === null) {
    return "Your club dashboard is set up but hasn't been fed any data yet. Load a baseline file and this read will fill in with a live picture of your coaching database.";
  }
  const lead =
    band === 'Healthy'
      ? 'Your club database is in good shape.'
      : band === 'Steady'
      ? 'Your club database is steady, with a couple of things worth a look.'
      : 'Your club database needs some attention before you lean on it for outreach.';

  const detail =
    stats.pendingReviews > 0
      ? `The main thing standing between you and a clean list is ${stats.pendingReviews} flagged change${stats.pendingReviews === 1 ? '' : 's'} waiting in review.`
      : `Contacts are current and nothing is stuck in review — you can pull a coach list right now and trust it.`;

  return `${lead} ${detail} (Health score: ${score}/100 — a blend of how fresh your data is, whether anything is stuck in review, and roster stability.)`;
}
