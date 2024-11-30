import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import AppStoreButtons from './AppStoreButtons';

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Gradient Background */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, #121212 85%, #FF2800 100%)`
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Headline */}
        <motion.h1 
          className="text-4xl md:text-6xl font-bold mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          College <span className="bg-gradient-to-r from-[#FF2800] to-[#CC2000] bg-clip-text text-transparent">Soccer</span> Recruitment
          <br />
          On Autopilot
        </motion.h1>

        <motion.h2 
          className="text-xl md:text-2xl text-gray-300 mb-8 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Join thousands of high school athletes generating more visibility, exposure, offers, commitments and scholarship money with a fraction of the time and effort
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-8"
        >
          <button className="group bg-[#FF2800] hover:bg-[#CC2000] text-white font-bold py-4 px-8 rounded-lg text-lg transition-all inline-flex items-center gap-3">
            <ArrowDown className="w-5 h-5 transition-transform group-hover:translate-y-1" />
            A Direct Path to Every College Coach In The Nation!
            <ArrowDown className="w-5 h-5 transition-transform group-hover:translate-y-1" />
          </button>
          <AppStoreButtons />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;