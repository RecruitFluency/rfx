import React from 'react';
import { ChevronLeft, Video } from 'lucide-react';

/*
 * Recreations of real customer message threads.
 *
 * The wording is kept verbatim because that is what makes the social proof
 * land, but every identifying detail is removed: no surnames, phone numbers,
 * email addresses, and — for the recruits, who are minors — no school, GPA,
 * height or weight. Contact names are first-name-or-initial only.
 */

type Bubble = { text: string; mine?: boolean; stamp?: string };

/** iMessage-style thread. `theme` picks the light or dark iOS appearance. */
function IMessageThread({
  contact,
  initial,
  bubbles,
  theme = 'light',
}: {
  contact: string;
  initial: string;
  bubbles: Bubble[];
  theme?: 'light' | 'dark';
}) {
  const dark = theme === 'dark';
  return (
    <div
      className="flex h-[590px] flex-col"
      style={{ background: dark ? '#000' : '#fff', color: dark ? '#fff' : '#000' }}
    >
      {/* nav bar */}
      <div
        className="flex flex-col items-center gap-1 px-3 pb-2 pt-3"
        style={{ background: dark ? 'rgba(20,20,22,0.92)' : 'rgba(247,247,247,0.92)' }}
      >
        <div className="flex w-full items-center justify-between text-[9px] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: dark ? '#8a8a93' : '#000' }} />
            <span className="h-1.5 w-3 rounded-sm" style={{ background: dark ? '#8a8a93' : '#000' }} />
          </span>
        </div>
        <div className="flex w-full items-center justify-between pt-1">
          <ChevronLeft className="h-4 w-4" style={{ color: '#0a84ff' }} aria-hidden="true" />
          <span className="flex flex-col items-center">
            <span
              className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-white"
              style={{ background: '#9b93c9' }}
            >
              {initial}
            </span>
            <span className="mt-0.5 text-[8px] font-medium">{contact} ›</span>
          </span>
          <Video className="h-4 w-4" style={{ color: '#0a84ff' }} aria-hidden="true" />
        </div>
      </div>

      {/* transcript */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-2.5 pt-2">
        {bubbles.map((b, i) => (
          <React.Fragment key={i}>
            {b.stamp && (
              <p
                className="py-1 text-center text-[7px]"
                style={{ color: dark ? '#8a8a93' : '#8a8a8f' }}
              >
                {b.stamp}
              </p>
            )}
            <p
              className={`max-w-[82%] whitespace-pre-line rounded-2xl px-2.5 py-1.5 text-[9.5px] leading-snug ${
                b.mine ? 'self-end rounded-br-md text-white' : 'self-start rounded-bl-md'
              }`}
              style={
                b.mine
                  ? { background: '#3b8cff' }
                  : { background: dark ? '#26262a' : '#e9e9eb', color: dark ? '#fff' : '#000' }
              }
            >
              {b.text}
            </p>
          </React.Fragment>
        ))}
      </div>

      {/* composer */}
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <span
          className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px]"
          style={{ background: dark ? '#26262a' : '#e9e9eb', color: dark ? '#fff' : '#555' }}
        >
          +
        </span>
        <span
          className="flex-1 rounded-full px-2.5 py-1 text-[9px]"
          style={{
            border: `1px solid ${dark ? '#33333a' : '#d8d8dc'}`,
            color: dark ? '#8a8a93' : '#a0a0a5',
          }}
        >
          iMessage
        </span>
      </div>
    </div>
  );
}

/** Parent whose daughter got five D1 calls on the first day of contact. */
export function BigSundayThread() {
  return (
    <IMessageThread
      contact="Demi"
      initial="D"
      bubbles={[
        { stamp: 'Mon, Jun 16 at 10:05 AM', text: 'Good morning ☀️' },
        {
          text:
            'I was trying to prepare my daughter to keep her expectations low but her coach assured the team that everyone would be getting at least 1 call on Sunday.\n\n' +
            '12:01am she got a text and had a call set up for 10am!\nShe’s got 2-3 calls set up for every day this week.\n\n' +
            'Several of those schools we never reached out to initially but matched with her thru the app. Thought that was pretty cool that she was on the top of their list for the 1st day of recruitment!',
        },
        { stamp: 'Mon, Jun 16 at 12:14 PM', text: 'This is awesome!', mine: true },
        { text: 'Thank you so much for letting me know very very cool', mine: true },
      ]}
    />
  );
}

/** Club contact reporting 12 coaches in the first 24 hours. */
export function TwelveCoachesThread() {
  return (
    <IMessageThread
      contact="Demi"
      initial="D"
      bubbles={[
        {
          stamp: 'Sat, Oct 25 at 12:48 PM',
          text:
            'Yes ma’am\nHe had 12 coaches reach out in the first 24 hrs\nA couple D1 and D2 plus some NAIA coaches\nI think he emailed 6 back already setting up a call or trying to visit them',
        },
        { text: 'Since it seems to be working I told a teammate to sign up this weekend' },
        { text: 'That’s awesome!!! Hope one pans out to be a great fit!', mine: true },
        {
          text:
            'Thank for the link it seems to be the most helpful thing we done so far to start talking with coaches',
        },
        { text: 'I’m sure you get txts/emails all the time but it’s fun knowing how helpful your app has been 😌' },
      ]}
    />
  );
}

/** Athlete whose inbox filled up after a D1 program showed interest. */
export function FloodedInboxThread() {
  return (
    <div className="flex h-[590px] flex-col bg-[#0b0b0d] text-white">
      <div className="flex items-center justify-between px-3 pb-1 pt-3 text-[9px] font-semibold">
        <span>9:41</span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-paper-2" />
          <span className="h-1.5 w-3 rounded-sm bg-paper-2" />
        </span>
      </div>
      <div className="flex items-center gap-2 border-b border-white/10 px-3 pb-2 pt-1.5">
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        <span className="h-6 w-6 rounded-full bg-[#3a3a42]" aria-hidden="true" />
        <span className="leading-tight">
          <span className="block text-[9.5px] font-semibold">Christian</span>
          <span className="block text-[7px] text-white/50">Direct message</span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-2.5 pt-2.5">
        {[
          { t: 'Yo!', mine: true },
          { t: 'A D1 just hit you up', mine: true },
          { t: 'Hey, I just saw — San Diego right?' },
          { t: 'East Tennessee State', mine: true },
          { t: 'Great program', mine: true },
          { t: 'I’m not gonna lie, my emails are flooded 😭' },
          { t: 'Okay yeah, I just saw on the app just now' },
          { t: 'This is what gets me going. Love it', mine: true },
        ].map((b, i) => (
          <p
            key={i}
            className={`max-w-[80%] rounded-2xl px-2.5 py-1.5 text-[9.5px] leading-snug ${
              b.mine ? 'self-end bg-[#a933ff] text-white' : 'self-start bg-[#26262c] text-white'
            }`}
          >
            {b.t}
          </p>
        ))}
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-2">
        <span className="h-5 w-5 shrink-0 rounded-full bg-[#5b5bff]" aria-hidden="true" />
        <span className="flex-1 rounded-full border border-white/15 px-2.5 py-1 text-[9px] text-white/40">
          Message…
        </span>
      </div>
    </div>
  );
}
