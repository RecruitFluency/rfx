import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Clock, BarChart, DollarSign } from 'lucide-react';

interface DivisionCardProps {
  title: string;
  stats: {
    interested: number;
    notInterested: number;
    schools: string[];
    notInterestedSchools: string[];
    responseRate: string;
    avgResponseTime: string;
    scholarshipRange: string;
  };
  backgroundColor: string;
  delay?: number;
}

const DivisionCard: React.FC<DivisionCardProps> = ({
  title,
  stats,
  backgroundColor,
  delay = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const interestedPercentage = Math.round((stats.interested / (stats.interested + stats.notInterested)) * 100) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className="rounded-xl p-6 transform hover:scale-105 transition-all cursor-pointer"
      style={{ backgroundColor }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>
      
      <div className="mt-4">
        <div className="flex justify-between mb-2">
          <span className="text-gray-400">Interested</span>
          <span className="text-[#FF2800] font-bold">{stats.interested}</span>
        </div>
        <div className="w-full bg-[#2a2a2a] rounded-full h-2 mb-4">
          <div 
            className="bg-[#FF2800] h-2 rounded-full" 
            style={{ width: `${interestedPercentage}%` }}
          />
        </div>
        
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#2a2a2a] p-3 rounded-lg">
                <div className="flex items-center gap-2 text-[#64DD17] mb-1">
                  <BarChart className="w-4 h-4" />
                  <span className="text-sm">Response Rate</span>
                </div>
                <span className="text-white font-bold">{stats.responseRate}</span>
              </div>
              <div className="bg-[#2a2a2a] p-3 rounded-lg">
                <div className="flex items-center gap-2 text-[#00BCD4] mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Avg Response</span>
                </div>
                <span className="text-white font-bold">{stats.avgResponseTime}</span>
              </div>
            </div>

            <div className="bg-[#2a2a2a] p-3 rounded-lg">
              <div className="flex items-center gap-2 text-[#FFC107] mb-1">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Scholarship Range</span>
              </div>
              <span className="text-white font-bold">{stats.scholarshipRange}</span>
            </div>

            <div className="text-gray-400 text-sm">
              <div className="mb-2">Interested Schools:</div>
              <div className="flex flex-wrap gap-2">
                {stats.schools.map((school, index) => (
                  <span 
                    key={index} 
                    className="bg-[#64DD17]/20 text-[#64DD17] px-2 py-1 rounded-full text-xs"
                  >
                    {school}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-gray-400 text-sm">
              <div className="mb-2">Not Interested:</div>
              <div className="flex flex-wrap gap-2">
                {stats.notInterestedSchools.map((school, index) => (
                  <span 
                    key={index} 
                    className="bg-[#FF2800]/20 text-[#FF2800] px-2 py-1 rounded-full text-xs"
                  >
                    {school}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default DivisionCard;