import React from 'react';
import { Bell, ChevronLeft, ChevronRight, Check, Eye, MessageSquare, ThumbsUp } from 'lucide-react';

/** Shared shell so every phone screen gets the same status bar + safe areas. */
function Screen({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex h-[590px] flex-col bg-ink-0 text-[11px] text-paper-1">
      <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[9px] font-semibold text-paper-0">
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-paper-2" />
          <span className="h-1.5 w-3 rounded-sm bg-paper-2" />
        </span>
      </div>
      {title && <p className="px-4 pb-1 pt-1 text-[13px] font-bold text-paper-0">{title}</p>}
      <div className="min-h-0 flex-1 overflow-hidden px-3 pb-6">{children}</div>
    </div>
  );
}

const PROGRAMS: Array<[string, string, string, string, string, number]> = [
  ['UAB', 'University of Alabama – Birm…', 'D1 · Birmingham, AL', 'ENGAGED', 'Stage 3 of 7', 3],
  ['LMU', 'Loyola Marymount University', 'D1 · Los Angeles, CA', 'CONTACTED', 'Stage 2 of 7', 2],
  ['GCU', 'Grand Canyon University', 'D1 · Phoenix, AZ', 'IDENTIFIED', 'Stage 1 of 7', 1],
];

/** Athlete home — plan banner, engagement counters, account menu. */
export function HomeScreen() {
  return (
    <Screen>
      <div className="rounded-xl border border-line bg-ink-2 p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-semibold text-paper-0">Free Plan</p>
            <p className="text-[9px] font-medium text-crimson-400">Upgrade for More</p>
          </div>
          <span className="grid h-6 w-6 place-items-center rounded-full bg-crimson-500 text-[8px] font-bold text-white">R</span>
        </div>
        <p className="mt-2.5 text-[11px] font-semibold text-paper-0">Welcome back, John!</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {[
            [Eye, '486', 'VIEWS THIS MONTH'],
            [ThumbsUp, '9', 'NEW RESPONSES'],
            [MessageSquare, '4', 'UNREAD MESSAGES'],
          ].map(([Icon, n, label], i) => (
            <span key={i} className="rounded-lg bg-ink-3 p-1.5">
              {React.createElement(Icon as React.ElementType, {
                className: 'h-2.5 w-2.5 text-crimson-400', 'aria-hidden': 'true',
              })}
              <span className="mt-1 block text-[13px] font-bold leading-none text-paper-0">{n as string}</span>
              <span className="mt-1 block text-[5.5px] uppercase leading-tight tracking-[0.08em] text-paper-3">
                {label as string}
              </span>
            </span>
          ))}
        </div>
      </div>

      <p className="mt-3 px-1 text-[9px] text-paper-3">Account</p>
      <div className="mt-1 space-y-px">
        {["Coach's Interest", 'My Recruitment', 'Messages', 'Subscriptions / Purchases', 'Password', 'Update Profile Info'].map((l) => (
          <span key={l} className="flex items-center justify-between border-b border-line px-1 py-2 text-[10px] text-paper-1">
            {l}
            <ChevronRight className="h-3 w-3 text-paper-3" aria-hidden="true" />
          </span>
        ))}
      </div>
      <span className="mt-4 block rounded-full bg-crimson-500 py-2.5 text-center text-[11px] font-semibold text-white shadow-glow-red">
        View My Profile
      </span>
    </Screen>
  );
}

/** My Recruitment — the athlete's program list with stage progress. */
export function RecruitmentScreen() {
  return (
    <Screen>
      <p className="flex items-center gap-1 px-1 text-[10px] font-semibold text-crimson-400">
        <ChevronLeft className="h-3 w-3" aria-hidden="true" /> Back
      </p>
      <p className="mt-1.5 px-1 text-[15px] font-bold text-paper-0">My Recruitment</p>
      <p className="px-1 text-[8px] text-paper-3">Striker (ST) · 2028</p>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[['ACTIVE', '6'], ['OFFERS', '2'], ['TO DO', '3']].map(([k, v]) => (
          <span key={k} className="rounded-lg border border-line bg-ink-2 p-2 text-center">
            <span className="block text-[5.5px] uppercase tracking-[0.1em] text-paper-3">{k}</span>
            <span className="mt-0.5 block text-[15px] font-bold leading-none text-paper-0">{v}</span>
          </span>
        ))}
      </div>

      <p className="mt-3 px-1 text-[6px] uppercase tracking-[0.12em] text-paper-3">Programs</p>
      <div className="mt-1 space-y-1.5">
        {PROGRAMS.map(([mark, name, meta, badge, stage, filled]) => (
          <div key={mark} className="rounded-xl border border-line bg-ink-2 p-2">
            <div className="flex items-center gap-1.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded bg-ink-3 text-[6px] font-bold text-paper-1">{mark}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[9px] font-semibold text-paper-0">{name}</span>
                <span className="block text-[7px] text-paper-3">{meta}</span>
              </span>
              <ChevronRight className="h-3 w-3 shrink-0 text-paper-3" aria-hidden="true" />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span className="rounded bg-crimson-500/15 px-1.5 py-0.5 text-[6px] font-bold text-crimson-400">● {badge}</span>
              <span className="text-[7px] text-paper-3">{stage}</span>
            </div>
            <div className="mt-1.5 flex gap-0.5">
              {Array.from({ length: 7 }).map((_, i) => (
                <span
                  key={i}
                  className={`h-0.5 flex-1 rounded-full ${i < (filled as number) ? 'bg-crimson-500' : 'bg-ink-3'}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Screen>
  );
}

const STAGES: Array<[string, string, 'done' | 'current' | 'todo']> = [
  ['Identified', 'Added to their board', 'done'],
  ['Contacted', 'You replied to the program', 'done'],
  ['Engaged', 'Offer received', 'current'],
  ['Evaluating', '', 'todo'],
  ['Offer Extended', '', 'todo'],
  ['Committed', '', 'todo'],
  ['Signed', '', 'todo'],
];

/** Program detail — the 7-stage recruitment pipeline. */
export function PipelineScreen() {
  return (
    <Screen>
      <p className="flex items-center gap-1 px-1 text-[10px] font-semibold text-crimson-400">
        <ChevronLeft className="h-3 w-3" aria-hidden="true" /> Back
      </p>
      <div className="mt-1.5 flex items-center gap-1.5 px-1">
        <span className="grid h-6 w-6 place-items-center rounded bg-ink-3 text-[6px] font-bold text-paper-1">UAB</span>
        <span>
          <span className="block text-[10px] font-bold text-paper-0">University of Alabama…</span>
          <span className="block text-[7px] text-paper-3">D1 · Birmingham, AL</span>
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {[['AVERAGE GPA', '3.83'], ['ACCEPTANCE RATE', '78.94']].map(([k, v]) => (
          <span key={k} className="rounded-lg border border-line bg-ink-2 p-2">
            <span className="block text-[5.5px] uppercase tracking-[0.1em] text-paper-3">{k}</span>
            <span className="mt-0.5 block text-[14px] font-bold leading-none text-paper-0">{v}</span>
          </span>
        ))}
      </div>

      <p className="mt-3 px-1 text-[6px] uppercase tracking-[0.12em] text-paper-3">Pipeline</p>
      <div className="mt-1.5 space-y-1.5 px-1">
        {STAGES.map(([name, sub, state], i) => (
          <div key={name} className="flex gap-2">
            <div className="flex flex-col items-center">
              <span
                className={`grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full ${
                  state === 'done'
                    ? 'bg-crimson-500'
                    : state === 'current'
                      ? 'border-2 border-crimson-500 bg-ink-0'
                      : 'border border-paper-3/50 bg-ink-0'
                }`}
              >
                {state === 'done' && <Check className="h-2 w-2 text-white" strokeWidth={3} aria-hidden="true" />}
              </span>
              {i < STAGES.length - 1 && (
                <span className={`w-px flex-1 ${state === 'done' ? 'bg-crimson-500' : 'bg-line'}`} style={{ minHeight: 14 }} />
              )}
            </div>
            <div className={`flex-1 pb-1 ${state === 'current' ? 'rounded-lg border border-crimson-500 bg-crimson-500/10 p-1.5' : ''}`}>
              <p className="flex items-center gap-1 text-[9px] font-semibold text-paper-0">
                {name}
                {state === 'current' && (
                  <span className="rounded bg-crimson-500 px-1 text-[5px] font-bold text-white">YOU ARE HERE</span>
                )}
              </p>
              {sub && <p className="text-[7px] text-paper-3">{sub}</p>}
            </div>
          </div>
        ))}
      </div>
      <span className="mt-2 block rounded-full bg-crimson-500 py-2.5 text-center text-[11px] font-semibold text-white shadow-glow-red">
        Update My Stage
      </span>
    </Screen>
  );
}

/** Notifications — a coach-driven stage change awaiting approval. */
export function NotificationsScreen() {
  return (
    <Screen>
      <p className="flex items-center gap-1 px-1 text-[10px] font-semibold text-crimson-400">
        <ChevronLeft className="h-3 w-3" aria-hidden="true" /> Back
      </p>
      <p className="mt-1.5 px-1 text-[15px] font-bold text-paper-0">Notifications</p>
      <p className="mt-2 px-1 text-[6px] uppercase tracking-[0.12em] text-paper-3">Recent</p>
      <div className="mt-1.5 rounded-xl border border-line bg-ink-2 p-2.5">
        <div className="flex items-start gap-1.5">
          <Bell className="mt-0.5 h-3 w-3 shrink-0 text-crimson-400" aria-hidden="true" />
          <span>
            <span className="block text-[9.5px] font-semibold text-paper-0">Stage moved forward</span>
            <span className="block text-[7px] text-paper-3">M. Jennings · Riverside Club</span>
          </span>
        </div>
        <div className="mt-2 rounded-lg border border-line bg-ink-3 p-2">
          <p className="text-[8.5px] font-semibold text-paper-0">Loyola Marymount University</p>
          <p className="mt-1 flex items-center gap-1 text-[6px]">
            <span className="rounded bg-ink-0 px-1 py-0.5 font-bold text-paper-2">ENGAGED</span>
            <span className="text-paper-3">→</span>
            <span className="rounded bg-crimson-500/20 px-1 py-0.5 font-bold text-crimson-400">EVALUATING</span>
          </p>
        </div>
        <p className="mt-2 text-[7.5px] leading-relaxed text-paper-2">
          Loyola&apos;s staff asked for your season footage. Your club logged the pipeline move.
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <span className="rounded-lg border border-line py-1.5 text-center text-[8.5px] text-paper-1">Not accurate</span>
          <span className="rounded-lg bg-crimson-500 py-1.5 text-center text-[8.5px] font-semibold text-white">Approve</span>
        </div>
      </div>
    </Screen>
  );
}
