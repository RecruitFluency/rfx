import React from 'react';

// PLACEHOLDER COPY throughout this section — structure is final, wording is yours to edit.
const ROWS = [
  {
    name: 'Unverified profiles',
    desc: 'Inflated stats, recycled film, self-reported everything. Coaches have no way to trust what they read.',
    tag: 'trust',
    fix: 'Every profile on collegerecruit.app is verified before a coach ever sees it.',
  },
  {
    name: 'Ghost roster spots',
    desc: 'Athletes chase programs that have no actual opening at their position or class year.',
    tag: 'waste',
    fix: 'Programs post real roster needs — position, class year, actual openings.',
  },
  {
    name: 'Mass-blast outreach',
    desc: 'Thousands of identical emails. Coaches stop reading. Athletes stop hearing back.',
    tag: 'noise',
    fix: 'Matching puts athletes in front of the programs that actually need them.',
  },
  {
    name: 'Silence',
    desc: 'No reply, no feedback, no closure. Being ignored is the default outcome of recruiting.',
    tag: 'ghosting',
    fix: 'Accountability runs both ways. On collegerecruit.app, responding is part of the deal.',
  },
];

const Problem: React.FC = () => (
  <section className="v-section" id="problem">
    <div className="v-section-head">
      <div>
        <div className="v-section-tag">{'// 01 — The problem'}</div>
        <h2 className="v-section-title">
          Recruiting runs on <em>ghosting</em>.
        </h2>
      </div>
      <p className="v-section-blurb">
        Hover any row. Every failure in the current pipeline traces back to the same thing —
        nobody is verified, so nobody is accountable.
      </p>
    </div>

    <div className="v-matrix">
      <div className="v-row v-head">
        <div>Failure</div>
        <div>What it costs you</div>
        <div style={{ textAlign: 'right' }}>Root cause</div>
      </div>
      {ROWS.map((row) => (
        <div className="v-row v-reveal" key={row.name}>
          <div className="v-name">{row.name}</div>
          <div className="v-cell">{row.desc}</div>
          <div className="v-tag-cell">{row.tag}</div>
          <div className="v-fix">
            <span className="v-fix-tag">Fix</span>
            {row.fix}
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default Problem;
