import React from 'react';

// PLACEHOLDER COPY throughout this section — structure is final, wording is yours to edit.
const PILLARS = [
  {
    num: '01',
    title: 'Verified athletes',
    body: 'Film, stats and academics checked and locked to one identity. A coach reading your profile knows it is real.',
    vs: (
      <>
        Elsewhere: <span>self-reported</span>.
      </>
    ),
  },
  {
    num: '02',
    title: 'Real roster needs',
    body: 'Programs post the openings they actually have — position, class year, level. No phantom interest.',
    vs: (
      <>
        Elsewhere: <span>camps &amp; mailing lists</span>.
      </>
    ),
  },
  {
    num: '03',
    title: 'Matched, not mass-blasted',
    body: 'Your profile is matched against real roster needs across the country, so outreach lands where it is wanted.',
    vs: (
      <>
        Elsewhere: <span>spray &amp; pray</span>.
      </>
    ),
  },
  {
    num: '04',
    title: 'No ghosting',
    body: 'Both sides are accountable for responding. Silence stops being the default outcome of recruiting.',
    vs: (
      <>
        Elsewhere: <span>read &amp; ignored</span>.
      </>
    ),
  },
];

const Fix: React.FC = () => (
  <section className="v-section" id="fix">
    <div className="v-section-head">
      <div>
        <div className="v-section-tag">{'// 02 — The fix'}</div>
        <h2 className="v-section-title">
          Verified, on <em>both</em> sides.
        </h2>
      </div>
      <p className="v-section-blurb">
        Four moves. Together they make ghosting structurally impossible.
      </p>
    </div>

    <div className="v-wedge">
      {PILLARS.map((pillar, i) => (
        <div className={`v-pillar v-reveal${i > 0 ? ` v-delay-${i}` : ''}`} key={pillar.num}>
          <div>
            <div className="v-num">{pillar.num}</div>
            <h3>{pillar.title}</h3>
            <p>{pillar.body}</p>
          </div>
          <div className="v-vs">{pillar.vs}</div>
        </div>
      ))}
    </div>
  </section>
);

export default Fix;
