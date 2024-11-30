import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const sports = [
  'Soccer',
  'Basketball',
  'Football',
  'Baseball',
  'Volleyball',
  'Track & Field',
  'Swimming',
  'Tennis'
];

const RotatingSports = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sports.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block w-40 h-12">
      <AnimatePresence mode="wait">
        <motion.span
          key={sports[currentIndex]}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-gradient-to-r from-[#FF0000] to-[#8B0000] bg-clip-text text-transparent font-bold"
        >
          {sports[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default RotatingSports;