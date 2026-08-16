import React from 'react';

const Hero: React.FC = () => (
  <header className="v-hero" id="v-hero">
    <div className="v-eyebrow">
      <span className="v-bar" />
      collegerecruit.app
    </div>
    <h1>
      <span className="v-accent">Verified</span> college recruiting.
      <br />
      Real roster needs.
      <br />
      No <span className="v-strike">ghosting</span>.
    </h1>
    {/* PLACEHOLDER COPY — replace with your own wording */}
    <p className="v-sub">
      Every athlete profile <b>verified</b>. Every roster opening <b>real</b>.{' '}
      <b>collegerecruit.app</b> is the recruiting network where both sides are accountable —
      film, stats and academics in one profile coaches can actually trust.
    </p>
    <div className="v-scroll-cue">
      <span>RFX // COLLEGERECRUIT</span>
      <div className="v-right">
        <span>SCROLL</span>
        <div className="v-arrow" />
      </div>
    </div>
  </header>
);

export default Hero;
