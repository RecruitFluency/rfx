import React from 'react';

const GetOn: React.FC = () => (
  <section className="v-section" id="get-on">
    <div className="v-section-head">
      <div>
        <div className="v-section-tag">{'// 03 — Get on'}</div>
        <h2 className="v-section-title">
          Get <em>verified</em>.
        </h2>
      </div>
      <p className="v-section-blurb">
        collegerecruit.app is where verified athletes meet real roster needs.
      </p>
    </div>

    <div className="v-cta">
      <div className="v-panel v-reveal">
        <div>
          <h5>{'// Athletes'}</h5>
          <h3>Build your verified profile.</h3>
          <p>
            Film, stats and academics in one profile — verified, portable, and matched against
            programs that actually have your spot open.
          </p>
        </div>
        {/* PLACEHOLDER LINK — point at the real signup flow */}
        <a className="v-btn v-btn-red" href="#">
          Get verified →
        </a>
      </div>

      <div className="v-panel v-reveal v-delay-1">
        <div>
          <h5>{'// College programs'}</h5>
          <h3>Post your real roster needs.</h3>
          <p>
            Tell the network what you actually need — position, class year, level — and get
            matched with verified athletes instead of an inbox full of noise.
          </p>
        </div>
        {/* PLACEHOLDER LINK — point at the real signup flow */}
        <a className="v-btn" href="#">
          Post a need →
        </a>
      </div>
    </div>
  </section>
);

export default GetOn;
