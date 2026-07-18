import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import {
  getDashboardStats, getDataHealth, getInsights, listCoaches, listMovements, listPrograms, listSports,
} from '../../lib/api';
import { Coach } from '../../lib/types';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  link?: { to: string; label: string };
}

const SUGGESTIONS = [
  'Who is missing an email?',
  'Who moved schools recently?',
  "What's our movement trend?",
  'How many active coaches?',
];

function coachLine(c: Coach): string {
  return `${c.first_name} ${c.last_name} — ${[c.school, c.sport].filter(Boolean).join(', ') || 'no school on file'}`;
}

export default function Assistant({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'Hi Jen! I can answer questions about the actual data — "who is missing an email?", "who moved recently?", "how many soccer coaches?", "what\'s our turnover trend?" — or take you anywhere in the app.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function answer(q: string): Promise<Message> {
    const text = q.toLowerCase();

    // Navigation intents
    const routes: [RegExp, string, string][] = [
      [/review|approve|queue|flag/, '/app/review', 'the Review Queue'],
      [/sync|upload|file|spreadsheet/, '/app/sync', 'the Monthly Sync'],
      [/track/, '/app/tracker', 'the Coach Tracker'],
      [/insight|analytic|pattern|chart/, '/app/insights', 'Insights'],
      [/health|clean|quality/, '/app/health', 'Data Health'],
      [/export|feed|csv|download/, '/app/export', 'Export / App Feed'],
      [/program|school director/, '/app/programs', 'the Program Directory'],
      [/setting|setup|connect/, '/app/setup', 'Settings'],
      [/home|dashboard|command/, '/app', 'the Command Center'],
    ];
    if (/^(open|go to|take me|show me the|navigate)/.test(text)) {
      for (const [re, to, label] of routes) {
        if (re.test(text)) return { role: 'assistant', text: `Taking you to ${label}.`, link: { to, label: `Open ${label}` } };
      }
      if (/coach/.test(text)) {
        return { role: 'assistant', text: 'Taking you to the Coach Directory.', link: { to: '/app/coaches', label: 'Open Coaches' } };
      }
    }

    if (!isConfigured) {
      return {
        role: 'assistant',
        text: 'The database isn\'t connected yet, so I can\'t pull live data. Head to Settings to finish setup.',
        link: { to: '/app/setup', label: 'Open Settings' },
      };
    }

    // Data-gap questions: "who is missing an email", "coaches without a school"…
    const gapField = /email/.test(text) ? 'email' as const
      : /phone/.test(text) ? 'phone' as const
      : /school/.test(text) ? 'school' as const
      : /sport/.test(text) ? 'sport' as const
      : null;
    if (gapField && /(missing|without|no |don'?t have|doesn'?t have|lack)/.test(text)) {
      const { coaches, total } = await listCoaches({ missing: gapField, status: 'active', pageSize: 5 });
      if (total === 0) return { role: 'assistant', text: `Every active coach has a ${gapField} on file. 🎉` };
      return {
        role: 'assistant',
        text: `${total.toLocaleString()} active coach${total === 1 ? ' is' : 'es are'} missing a ${gapField}. First few:\n` +
          coaches.map(coachLine).join('\n') + (total > 5 ? '\n…and more.' : ''),
        link: { to: `/app/coaches?missing=${gapField}&status=active`, label: 'See the full list' },
      };
    }

    // Stale coaches: "who hasn't been seen", "stale coaches"
    if (/stale|not (been )?seen|haven'?t (been )?seen|60 days|quietly left/.test(text)) {
      const { coaches, total } = await listCoaches({ staleDays: 60, status: 'active', pageSize: 5 });
      if (total === 0) return { role: 'assistant', text: 'No stale records — every active coach has appeared in a vendor file within the last 60 days.' };
      return {
        role: 'assistant',
        text: `${total.toLocaleString()} active coach${total === 1 ? ' hasn\'t' : 'es haven\'t'} appeared in a vendor file for 60+ days:\n` +
          coaches.map(coachLine).join('\n') + (total > 5 ? '\n…and more.' : ''),
        link: { to: '/app/coaches?stale=60&status=active', label: 'See the full list' },
      };
    }

    // Movement questions: "who was hired", "who moved", "who left"
    const moveType = /(hired|new coach|recent hires)/.test(text) ? 'hired' as const
      : /(moved|changed schools|switch)/.test(text) ? 'moved' as const
      : /(left|departed|departures|quit|gone)/.test(text) ? 'departed' as const
      : null;
    if (moveType && /who|recent|latest|last|show/.test(text)) {
      const { movements, total } = await listMovements({ type: moveType, pageSize: 5 });
      if (total === 0) return { role: 'assistant', text: `No "${moveType}" movements recorded yet — they appear after your monthly syncs.`, link: { to: '/app/sync', label: 'Open Monthly Sync' } };
      const verb = moveType === 'hired' ? 'Recently hired' : moveType === 'moved' ? 'Recent school moves' : 'Recent departures';
      return {
        role: 'assistant',
        text: `${verb} (${total.toLocaleString()} total):\n` + movements.map((m) => {
          const name = m.coaches ? `${m.coaches.first_name} ${m.coaches.last_name}` : 'Unknown coach';
          const what = moveType === 'moved' && m.previous_school && m.school ? `${m.previous_school} → ${m.school}`
            : moveType === 'departed' ? `left ${m.previous_school ?? 'their program'}`
            : [m.title, m.school].filter(Boolean).join(' at ');
          return `${name} — ${what}`;
        }).join('\n') + (total > 5 ? '\n…and more.' : ''),
        link: { to: `/app/tracker?type=${moveType}`, label: 'Open the Coach Tracker' },
      };
    }

    // Trend / pattern / turnover questions
    if (/trend|turnover|churn|pattern|hottest|most active|movement/.test(text)) {
      const ins = await getInsights();
      const m = ins.byMonth[ins.byMonth.length - 1];
      const prev = ins.byMonth[ins.byMonth.length - 2];
      const hot = ins.hotPrograms[0];
      return {
        role: 'assistant',
        text: `This month so far: ${m.hired} hired, ${m.moved} moved, ${m.departed} departed` +
          (prev ? ` (last month: ${prev.hired}/${prev.moved}/${prev.departed}).` : '.') +
          (hot ? ` The hottest program in the last 90 days is ${hot.school} with ${hot.changes} coaching changes.` : '') +
          ` You're tracking ${ins.activeTotal.toLocaleString()} active coaches across ${ins.sportCount} sport${ins.sportCount === 1 ? '' : 's'}.`,
        link: { to: '/app/insights', label: 'Open Insights' },
      };
    }

    // Data health / cleanliness
    if (/health|clean|quality|duplicate|ready to (push|export)/.test(text)) {
      const h = await getDataHealth();
      const issues = h.missingEmail + h.duplicateEmails.length;
      return {
        role: 'assistant',
        text: issues === 0
          ? `The list looks clean: all ${h.activeTotal.toLocaleString()} active coaches have emails and there are no duplicates. Good to push to the app.`
          : `Across ${h.activeTotal.toLocaleString()} active coaches: ${h.missingEmail} missing an email, ${h.duplicateEmails.length} duplicate email${h.duplicateEmails.length === 1 ? '' : 's'}, ${h.stale} not seen in 60+ days.`,
        link: { to: '/app/health', label: 'Open Data Health' },
      };
    }

    // "which sports do we cover"
    if (/(which|what) sports/.test(text)) {
      const sports = await listSports();
      if (sports.length === 0) return { role: 'assistant', text: 'No sports on file yet — upload a vendor file to get started.', link: { to: '/app/sync', label: 'Open Monthly Sync' } };
      return {
        role: 'assistant',
        text: `You cover ${sports.length} sport${sports.length === 1 ? '' : 's'}: ${sports.join(', ')}.`,
        link: { to: '/app/insights', label: 'See the breakdown' },
      };
    }

    // Search intent: "find coaches at X", "search for X"
    const searchMatch = q.match(/(?:find|search(?: for)?|look up)\s+(?:coaches?\s+)?(?:at|from|named)?\s*(.+)/i);
    if (searchMatch && /find|search|look up/.test(text)) {
      const term = searchMatch[1].trim().replace(/[?.]$/, '');
      const { coaches, total } = await listCoaches({ search: term, status: 'all', pageSize: 5 });
      if (total === 0) return { role: 'assistant', text: `No coaches matched "${term}".` };
      return {
        role: 'assistant',
        text: `Found ${total} match${total === 1 ? '' : 'es'} for "${term}":\n${coaches.map(coachLine).join('\n')}${total > 5 ? '\n…and more.' : ''}`,
        link: { to: `/app/coaches?search=${encodeURIComponent(term)}&status=all`, label: 'See all in directory' },
      };
    }

    // Count questions — with optional sport scoping ("how many soccer coaches")
    if (/how many|count|total/.test(text)) {
      if (/program|school/.test(text)) {
        const { total } = await listPrograms();
        return { role: 'assistant', text: `You have ${total.toLocaleString()} programs in the directory.`, link: { to: '/app/programs', label: 'Open Programs' } };
      }
      const [sports, stats] = await Promise.all([listSports().catch(() => [] as string[]), getDashboardStats()]);
      const sport = sports.find((s) => text.includes(s.toLowerCase()));
      const status = /inactive|former|departed/.test(text) ? 'inactive' as const : 'active' as const;
      if (sport) {
        const { total } = await listCoaches({ sport, status, pageSize: 1 });
        return {
          role: 'assistant',
          text: `${total.toLocaleString()} ${status} ${sport} coach${total === 1 ? '' : 'es'}.`,
          link: { to: `/app/coaches?sport=${encodeURIComponent(sport)}&status=${status}`, label: 'See them in the directory' },
        };
      }
      if (/review|pending|flag/.test(text)) {
        return {
          role: 'assistant',
          text: `${stats.pendingReviews} item${stats.pendingReviews === 1 ? '' : 's'} waiting in the review queue.`,
          link: { to: '/app/review', label: 'Open Review Queue' },
        };
      }
      if (status === 'inactive') {
        return { role: 'assistant', text: `${stats.inactiveCoaches.toLocaleString()} coaches are marked inactive (departed).`, link: { to: '/app/coaches?status=inactive', label: 'See former coaches' } };
      }
      return {
        role: 'assistant',
        text: `You have ${stats.activeCoaches.toLocaleString()} active coaches (plus ${stats.inactiveCoaches.toLocaleString()} inactive) across ${stats.programs.toLocaleString()} programs.`,
        link: { to: '/app/coaches', label: 'Open Coaches' },
      };
    }

    const stats = await getDashboardStats();
    if (/last sync|latest sync|when.*sync|recent upload/.test(text)) {
      if (!stats.lastBatch) return { role: 'assistant', text: 'No files have been synced yet. Upload your baseline file to get started.', link: { to: '/app/sync', label: 'Open Monthly Sync' } };
      const b = stats.lastBatch;
      const s = b.stats;
      return {
        role: 'assistant',
        text: `Last sync: "${b.file_name}"${b.sport ? ` (${b.sport})` : ''} on ${new Date(b.created_at).toLocaleDateString()} (${b.row_count.toLocaleString()} rows, status: ${b.status.replace('_', ' ')}). ` +
          (s.added !== undefined ? `Changes: ${s.added} added, ${s.updated ?? 0} updated, ${s.moved ?? 0} moved, ${s.departed ?? 0} departed.` : ''),
        link: { to: '/app/sync', label: 'Open Monthly Sync' },
      };
    }

    if (/attention|to ?do|need|priorit|checklist/.test(text)) {
      if (stats.pendingReviews > 0) {
        return {
          role: 'assistant',
          text: `${stats.pendingReviews} flagged change${stats.pendingReviews === 1 ? '' : 's'} need${stats.pendingReviews === 1 ? 's' : ''} your approval in the review queue. The monthly checklist on the Command Center tracks the rest.`,
          link: { to: '/app/review', label: 'Open Review Queue' },
        };
      }
      return { role: 'assistant', text: 'Nothing urgent — the review queue is empty. The Command Center checklist shows where you are in this month\'s workflow.', link: { to: '/app', label: 'Open Command Center' } };
    }

    return {
      role: 'assistant',
      text: 'Try me on the data: "who is missing an email?", "who moved recently?", "how many soccer coaches?", "what\'s our turnover trend?", "is the list clean?", "find coaches at Duke" — or "open the tracker".',
    };
  }

  async function submit(q?: string) {
    const question = (q ?? input).trim();
    if (!question || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setBusy(true);
    try {
      const reply = await answer(question);
      setMessages((m) => [...m, reply]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', text: `Sorry — I hit an error: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 50);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                m.role === 'user' ? 'bg-[#FF0000] text-white' : 'bg-[#1f1f1f] text-gray-200 border border-[#2a2a2a]'
              }`}
            >
              {m.text}
              {m.link && (
                <button
                  onClick={() => { navigate(m.link!.to); onNavigate(); }}
                  className="block mt-2 text-[#FF6666] hover:text-white underline underline-offset-2 text-sm"
                >
                  {m.link.label} →
                </button>
              )}
            </div>
          </div>
        ))}
        {busy && <div className="text-gray-500 text-sm">Thinking…</div>}
      </div>
      <div className="px-5 pb-2 flex flex-wrap gap-2">
        {messages.length <= 1 &&
          SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => submit(s)}
              className="text-xs bg-[#1f1f1f] border border-[#2a2a2a] hover:border-[#FF0000]/50 text-gray-400 hover:text-white rounded-full px-3 py-1.5 transition-colors"
            >
              {s}
            </button>
          ))}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="p-4 border-t border-[#2a2a2a] flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your database…"
          className="flex-1 bg-[#1f1f1f] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF0000]/60"
        />
        <button
          type="submit"
          disabled={busy}
          className="bg-[#FF0000] hover:bg-[#CC0000] disabled:opacity-50 rounded-lg px-3 py-2 transition-colors"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
