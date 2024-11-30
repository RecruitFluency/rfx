import React from 'react';
import { motion } from 'framer-motion';

interface TestimonialCardProps {
  name: string;
  image: string;
  title: string;
  quote: string;
  stats: string;
  delay?: number;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  name,
  image,
  title,
  quote,
  stats,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="bg-[#1f1f1f] rounded-xl p-6 hover:transform hover:scale-105 transition-all"
    >
      <div className="flex items-center mb-6">
        <img
          src={image}
          alt={name}
          className="w-16 h-16 rounded-full object-cover mr-4"
          loading="lazy"
        />
        <div>
          <h3 className="text-xl font-bold text-white">{name}</h3>
          <p className="text-[#FF2800]">{title}</p>
        </div>
      </div>
      <blockquote className="text-gray-400 mb-4">"{quote}"</blockquote>
      <div className="bg-[#FF2800]/10 text-[#FF2800] px-4 py-2 rounded-lg inline-block">
        {stats}
      </div>
    </motion.div>
  );
};

export default TestimonialCard;