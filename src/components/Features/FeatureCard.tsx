import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon: Icon, title, description, delay = 0 }) => {
  return (
    <motion.div
      className="bg-[#1f1f1f] p-8 rounded-xl hover:bg-[#2a2a2a] transition-all duration-300"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
    >
      <div className="bg-[#FF2800]/10 w-14 h-14 rounded-lg flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-[#FF2800]" />
      </div>
      <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </motion.div>
  );
};

export default FeatureCard;