import React from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const PhoneMockup = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="relative mx-auto w-full max-w-3xl transform -rotate-90"
    >
      <div className="relative rounded-[3rem] bg-[#232323] p-4 shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-[#121212] rounded-b-2xl" />
        
        <div className="aspect-[19.5/9] overflow-hidden rounded-[2.5rem] bg-[#121212]">
          <div className="relative h-full flex flex-col items-center justify-start py-8">
            {/* Info Bar */}
            <div className="w-full px-8">
              <div className="bg-black/70 rounded-lg p-4">
                <div className="flex items-center justify-center gap-4 text-sm font-medium">
                  <span>MLS Next</span>
                  <span className="text-gray-300">|</span>
                  <span>Chicago Fire</span>
                  <span className="text-gray-300">|</span>
                  <span>Striker</span>
                  <span className="text-gray-300">|</span>
                  <span>2026</span>
                  <span className="text-gray-300">|</span>
                  <span>ENTP</span>
                  <span className="text-gray-300">|</span>
                  <span>$10,000 Annual Support</span>
                </div>
              </div>
            </div>

            {/* Video Content Area */}
            <div className="w-full px-8 flex-1 my-6">
              <div className="bg-black/40 rounded-lg w-full h-full flex items-center justify-center">
                <span className="text-gray-400">Video Preview</span>
              </div>
            </div>

            {/* Interest Buttons */}
            <div className="flex gap-4 px-8">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-br from-[#1a1a1a] to-black text-[#64DD17] font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 justify-center border border-[#64DD17]/20 hover:border-[#64DD17]/40 transition-all"
              >
                <ThumbsUp className="w-5 h-5" />
                <span>INTERESTED</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-gradient-to-br from-[#1a1a1a] to-black text-[#FF2800] font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 justify-center border border-[#FF2800]/20 hover:border-[#FF2800]/40 transition-all"
              >
                <ThumbsDown className="w-5 h-5" />
                <span>NOT INTERESTED</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PhoneMockup;