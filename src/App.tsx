import React from 'react';
import HeroSection from './components/Hero/HeroSection';
import MetricsSection from './components/Metrics/MetricsSection';
import FeaturesSection from './components/Features/FeaturesSection';
import DashboardPreview from './components/Dashboard/DashboardPreview';
import IntelligenceSection from './components/Intelligence/IntelligenceSection';
import TestimonialsSection from './components/Testimonials/TestimonialsSection';
import CTASection from './components/CTA/CTASection';
import Footer from './components/Footer/Footer';
import AthleteProgramView from './components/Tracker/AthleteProgramView';

function App() {
  // Non-destructive demo route: the landing page stays the default; the tracker
  // build is viewable at #tracker while it's in progress.
  if (typeof window !== 'undefined' && window.location.hash === '#tracker') {
    return <AthleteProgramView />;
  }

  return (
    <div className="min-h-screen bg-[#121212]">
      <HeroSection />
      <MetricsSection />
      <FeaturesSection />
      <DashboardPreview />
      <IntelligenceSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}

export default App;