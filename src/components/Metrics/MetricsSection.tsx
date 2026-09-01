import React from 'react';
import { motion } from 'framer-motion';
import AnimatedCounter from './AnimatedCounter';
import { Users, Trophy, Star, Gauge } from 'lucide-react';

const metrics = [
  {
    icon: <Gauge className="w-8 h-8 text-[#FF0000]" />,
    value: 5,
    label: "Athlete intros a coach receives per day — a hard cap, so every one gets read",
  },
  {
    icon: <Users className="w-8 h-8 text-[#FF0000]" />,
    value: 100,
    label: "Of coach responses returned to you by name — including the nos",
    suffix: "%",
  },
  {
    icon: <Trophy className="w-8 h-8 text-[#FF0000]" />,
    value: 5,
    label: "Division levels in every search — NCAA D1 through Junior College",
  },
  {
    icon: <Star className="w-8 h-8 text-[#FF0000]" />,
    value: 4.9,
    label: "App Store rating",
    suffix: "★",
  },
];

const MetricsSection = () => {
  return (
    <section className="bg-[#1f1f1f] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              className="text-center p-6 bg-[#121212] rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-center mb-4">
                {metric.icon}
              </div>
              <AnimatedCounter
                end={metric.value}
                duration={2}
                prefix={metric.prefix}
                suffix={metric.suffix}
              />
              <p className="text-gray-400 mt-2">{metric.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;