import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface IntelligenceFeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  delay?: number;
}

const IntelligenceFeature: React.FC<IntelligenceFeatureProps> = ({
  icon: Icon,
  title,
  description,
  color,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="flex flex-col items-center text-center p-6 bg-[#121212] rounded-xl"
    >
      <div
        className="w-16 h-16 rounded-lg flex items-center justify-center mb-6"
        style={{ backgroundColor: `${color}20` }}
      >
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
};

export default IntelligenceFeature;