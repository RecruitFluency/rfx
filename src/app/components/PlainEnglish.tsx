import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * A branded "plain-English" callout — the syncmob signature of turning data into
 * a sentence. Volt accent bar, display heading, silver body copy.
 */
export function PlainEnglish({
  label = 'In plain English',
  children,
  className = '',
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative rounded-xl border border-volt/20 bg-volt/[0.04] p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-volt" />
        <span className="font-mono text-[11px] uppercase tracking-widest text-volt">{label}</span>
      </div>
      <div className="text-[15px] leading-relaxed text-gray-200 font-sans">{children}</div>
    </div>
  );
}

const TONE_STYLES: Record<string, { dot: string; text: string }> = {
  good: { dot: 'bg-green-400', text: 'text-gray-300' },
  watch: { dot: 'bg-amber-400', text: 'text-gray-300' },
  action: { dot: 'bg-volt', text: 'text-gray-100' },
};

export function InsightList({ items }: { items: { tone: string; text: string }[] }) {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => {
        const s = TONE_STYLES[it.tone] ?? TONE_STYLES.watch;
        return (
          <li key={i} className="flex items-start gap-3 text-sm">
            <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
            <span className={`leading-relaxed ${s.text}`}>{it.text}</span>
          </li>
        );
      })}
    </ul>
  );
}
