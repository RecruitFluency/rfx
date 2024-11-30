import React from 'react';
import { Shield, Trophy, Clock, BarChart } from 'lucide-react';

const Features = () => {
  const features = [
    {
      icon: <Shield className="w-12 h-12 text-[#FF2800]" />,
      title: "Smart Recruitment",
      description: "Our AI-powered system automatically matches your profile with suitable programs and initiates contact."
    },
    {
      icon: <Trophy className="w-12 h-12 text-[#FF2800]" />,
      title: "Performance Tracking",
      description: "Track your stats, achievements, and recruitment progress in real-time."
    },
    {
      icon: <Clock className="w-12 h-12 text-[#FF2800]" />,
      title: "Time-Saving",
      description: "Save countless hours with automated outreach and response management."
    },
    {
      icon: <BarChart className="w-12 h-12 text-[#FF2800]" />,
      title: "Analytics",
      description: "Get detailed insights into your recruitment journey with comprehensive analytics."
    }
  ];

  return (
    <div className="bg-[#1f1f1f] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Elite Athletic Recruitment Platform
          </h2>
          <p className="text-gray-400 text-xl">
            Powerful features designed to maximize your recruitment potential
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-[#121212] p-8 rounded-xl hover:transform hover:scale-105 transition-all"
            >
              <div className="mb-6">{feature.icon}</div>
              <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;