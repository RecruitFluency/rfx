import React from 'react';

const Background: React.FC = () => (
  <div className="v-bg" aria-hidden="true">
    <div className="v-bg-grid" data-parallax="0.18" />
    <div className="v-bg-glow" data-parallax="0.45" />
    <div className="v-bg-pitch" data-parallax="0.32" />
    <div className="v-bg-scan" data-parallax="0.08" />
  </div>
);

export default Background;
