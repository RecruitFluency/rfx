import React from 'react';
import Nav from './Nav';
import Hero from './Hero';
import FeatureRows from './FeatureRows';
import FeatureGrid from './FeatureGrid';
import Roadmap from './Roadmap';
import FilmRoom from './FilmRoom';
import Testimonials from './Testimonials';
import Clubs, { AppBanner } from './Clubs';
import Pricing from './Pricing';
import FAQ from './FAQ';
import Footer, { FinalCTA } from './Footer';

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-clip bg-ink-0 font-body text-paper-1">
      <Nav />
      <main>
        <Hero />
        <FeatureRows />
        <FeatureGrid />
        <Roadmap />
        <FilmRoom />
        <Testimonials />
        <AppBanner />
        <Clubs />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
