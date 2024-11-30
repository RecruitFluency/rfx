import React from 'react';
import { motion } from 'framer-motion';
import { Puzzle, Mountain, Brain } from 'lucide-react';
import IntelligenceFeature from './IntelligenceFeature';
import PhoneMockup from './PhoneMockup';

const features = [
  {
    icon: Puzzle,
    title: "Team Fit Score",
    description: "Personality assessments that match players with compatible team cultures",
    color: "#64DD17"
  },
  {
    icon: Mountain,
    title: "Mental Resilience Index",
    description: "Quantified measurements of focus, pressure handling, and competitive drive",
    color: "#00BCD4"
  },
  {
    icon: Brain,
    title: "Cognitive Performance",
    description: "Decision-making speed, spatial awareness, and tactical understanding metrics",
    color: "#FFC107"
  }
];

const IntelligenceSection = () => {
  return (
    <section className="bg-[#1f1f1f] py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-white mb-4"
          >
            Recruit Smarter with Complete Athlete Intelligence
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
            className="text-xl text-gray-400 max-w-3xl mx-auto"
          >
            Because great players are more than just highlight reels
          </motion.p>
        </div>

        <div className="flex flex-col gap-16">
          <div className="w-full max-w-4xl mx-auto">
            <PhoneMockup />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <IntelligenceFeature
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                color={feature.color}
                delay={index * 0.1}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <button className="bg-[#FF2800] hover:bg-[#CC2000] text-white font-bold py-4 px-8 rounded-lg text-lg transition-all">
              Start Your Complete Assessment
            </button>
            <p className="text-gray-400 mt-4 text-sm">
              Join 10,000+ players who've enhanced their recruitment profile
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default IntelligenceSection;