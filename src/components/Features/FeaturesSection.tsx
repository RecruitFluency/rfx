import React from 'react';
import { Zap, MessageCircle, LayoutDashboard, Building2 } from 'lucide-react';
import FeatureCard from './FeatureCard';

const features = [
  {
    icon: Zap,
    title: "Automated Exposure",
    description: "Automatically reach college coaches at every level, eliminating manual outreach and maximizing your exposure."
  },
  {
    icon: MessageCircle,
    title: "Crowdsourced Feedback",
    description: "Receive real-time feedback from coaches nationwide to understand your fit with specific programs."
  },
  {
    icon: LayoutDashboard,
    title: "Personalized Dashboard",
    description: "Track interest and engagement from schools with a visual dashboard that helps prioritize your recruitment efforts."
  },
  {
    icon: Building2,
    title: "Club Integration",
    description: "Elevate your club's recruitment success with white-label branding and customizable solutions."
  }
];

const FeaturesSection = () => {
  return (
    <section className="bg-[#121212] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Recruitment Automation at Its Best
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Let RFX handle the heavy lifting by connecting you with coaches across all levels of college soccer, so you can focus on perfecting your game.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;