import React from 'react';
import { Sparkles, Target, Users, BarChart3 } from 'lucide-react';

const Hero = () => {
  return (
    <div className="bg-[#121212] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-[#FF2800] bg-clip-text text-transparent">
            Automate Your Athletic Recruitment Journey
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            Generate more visibility, exposure, offers, and scholarship money with a fraction of the effort traditional approaches take.
          </p>
          <button className="bg-[#FF2800] hover:bg-[#CC2000] text-white font-bold py-4 px-8 rounded-lg text-lg transition-all">
            Start Your Journey
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          {[
            {
              icon: <Sparkles className="w-8 h-8 text-[#FF2800]" />,
              title: "Automated Exposure",
              description: "Smart outreach that connects with the right programs"
            },
            {
              icon: <Users className="w-8 h-8 text-[#FF2800]" />,
              title: "Coach Feedback",
              description: "Real-time insights from nationwide coaching staff"
            },
            {
              icon: <BarChart3 className="w-8 h-8 text-[#FF2800]" />,
              title: "Smart Dashboard",
              description: "Track engagement and interest from schools"
            },
            {
              icon: <Target className="w-8 h-8 text-[#FF2800]" />,
              title: "Club Integration",
              description: "White-label solution for sports clubs"
            }
          ].map((feature, index) => (
            <div key={index} className="bg-[#1f1f1f] p-6 rounded-xl">
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;