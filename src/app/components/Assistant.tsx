import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { isConfigured } from '../../lib/supabase';
import { getDashboardStats, listCoaches, listPrograms } from '../../lib/api';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  link?: { to: string; label: string };
}

const SUGGESTIONS = [
  'How many active coaches do we have?',
  'What needs my attention?',
  'Find coaches at Stanford',
  'When was the last sync?',
];

export default function Assistant({ onNavigate }: { onNavigate: () => void }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi Jen! Ask me for stats (\"how many active coaches?\"), to find someone (\"find coaches at Duke\"), or say where you want to go (\"open the review queue\").",
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
      [/program|school director/, '/app/programs', 'the Program Directory'],
      [/setting|setup|connect/, '/app/setup', 'Settings'],
      [/home|dashboard|command/, '/app', 'the Command Center'],
    ];
    if (/^(open|go to|take me|show me|navigate)/.test(text)) {
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
        text: 'The database isn\'t connected yet, so I can\'t pull live stats. Head to Settings to finish setup.',
        link: { to: '/app/setup', label: 'Open Settings' },
      };
    }

    // Search intent: "find coaches at X", "search for X"
    const searchMatch = q.match(/(?:find|search(?: for)?|look up|show)\s+(?:coaches?\s+)?(?:at|from|named)?\s*(.+)/i);
    if (searchMatch && /find|search|look up/.test(text)) {
      const term = searchMatch[1].trim().replace(/[?.]$/, '');
      const { coaches, total } = await listCoaches({ search: term, status: 'all', pageSize: 5 });
      if (total === 0) return { role: 'assistant', text: `No coaches matched "${term}".` };
      const names = coaches.map((c) => `${c.first_name} ${c.last_name} — ${c.school ?? 'unknown school'}`).join('\n');
      return {
        role: 'assistant',
        text: `Found ${total} match${total === 1 ? '' : 'es'} for "${term}":\n${names}${total > 5 ? '\n…and more.' : ''}`,
        link: { to: `/app/coaches?search=${encodeURIComponent(term)}`, label: 'See all in directory' },
      };
    }

    // Stats intents
    const stats = await getDashboardStats();
    if (/how many|count|total/.test(text)) {
      if (/program|school/.test(text)) {
        const { total } = await listPrograms();
        return { role: 'assistant', text: `You have ${total.toLocaleString()} programs in the directory.`, link: { to: '/app/programs', label: 'Open Programs' } };
      }
      if (/inactive|former|departed/.test(text)) {
        return { role: 'assistant', text: `${stats.inactiveCoaches.toLocaleString()} coaches are marked inactive (departed).` };
      }
      if (/review|pending|flag/.test(text)) {
        return {
          role: 'assistant',
          text: `${stats.pendingReviews} item${stats.pendingReviews === 1 ? '' : 's'} waiting in the review queue.`,
          link: { to: '/app/review', label: 'Open Review Queue' },
        };
      }
      return {
        role: 'assistant',
        text: `You have ${stats.activeCoaches.toLocaleString()} active coaches (plus ${stats.inactiveCoaches.toLocaleString()} inactive) across ${stats.programs.toLocaleString()} programs.`,
        link: { to: '/app/coaches', label: 'Open Coaches' },
      };
    }

    if (/last sync|latest sync|when.*sync|recent upload/.test(text)) {
      if (!stats.lastBatch) return { role: 'assistant', text: 'No files have been synced yet. Upload your baseline file to get started.', link: { to: '/app/sync', label: 'Open Monthly Sync' } };
      const b = stats.lastBatch;
      const s = b.stats;
      return {
        role: 'assistant',
        text: `Last sync: "${b.file_name}" on ${new Date(b.created_at).toLocaleDateString()} (${b.row_count.toLocaleString()} rows, status: ${b.status.replace('_', ' ')}). ` +
          (s.added !== undefined ? `Changes: ${s.added} added, ${s.updated ?? 0} updated, ${s.moved ?? 0} moved, ${s.departed ?? 0} departed.` : ''),
        link: { to: '/app/sync', label: 'Open Monthly Sync' },
      };
    }

    if (/attention|to ?do|need|priorit/.test(text)) {
      if (stats.pendingReviews > 0) {
        return {
          role: 'assistant',
          text: `${stats.pendingReviews} flagged change${stats.pendingReviews === 1 ? '' : 's'} need${stats.pendingReviews === 1 ? 's' : ''} your approval in the review queue. Everything else is up to date.`,
          link: { to: '/app/review', label: 'Open Review Queue' },
        };
      }
      return { role: 'assistant', text: 'Nothing needs your attention right now — the review queue is empty and the database is up to date. 🎉' };
    }

    return {
      role: 'assistant',
      text: 'I can pull counts ("how many active coaches?"), check the last sync, find coaches by name or school, or take you anywhere in the app ("open the review queue").',
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
