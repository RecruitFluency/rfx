import React, { useState } from 'react';
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

const DivisionCard = ({ 
  title, 
  stats, 
  backgroundColor 
}: { 
  title: string; 
  stats: {
    interested: number;
    notInterested: number;
    schools: string[];
  }; 
  backgroundColor: string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const interestedPercentage = Math.round((stats.interested / (stats.interested + stats.notInterested)) * 100) || 0;

  return (
    <div 
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
          <div className="mt-4 space-y-3">
            <div className="text-gray-400 text-sm">
              <span>Response Rate: </span>
              <span className="text-white font-bold">{interestedPercentage}%</span>
            </div>
            <div className="text-gray-400 text-sm">
              <span>Not Interested: </span>
              <span className="text-white font-bold">{stats.notInterested}</span>
            </div>
            <div className="text-gray-400 text-sm">
              <div className="mb-2">Interested Schools:</div>
              <div className="flex flex-wrap gap-2">
                {stats.schools.map((school, index) => (
                  <span 
                    key={index} 
                    className="bg-[#2a2a2a] px-2 py-1 rounded-full text-xs text-white"
                  >
                    {school}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const divisions = [
    {
      title: 'NCAA D1',
      stats: {
        interested: 2,
        notInterested: 3,
        schools: ['Stanford', 'Duke']
      },
      backgroundColor: '#1a1a1a'
    },
    {
      title: 'NCAA D2',
      stats: {
        interested: 12,
        notInterested: 8,
        schools: ['Grand Valley State', 'Northwest Missouri', 'Minnesota State']
      },
      backgroundColor: '#1d1d1d'
    },
    {
      title: 'NCAA D3',
      stats: {
        interested: 74,
        notInterested: 26,
        schools: ['MIT', 'Johns Hopkins', 'Williams', 'Amherst']
      },
      backgroundColor: '#202020'
    },
    {
      title: 'NAIA',
      stats: {
        interested: 81,
        notInterested: 19,
        schools: ['Indiana Wesleyan', 'Georgetown College', 'Oklahoma City']
      },
      backgroundColor: '#232323'
    },
    {
      title: 'Junior College',
      stats: {
        interested: 70,
        notInterested: 30,
        schools: ['Iowa Western', 'Butler CC', 'Hutchinson CC']
      },
      backgroundColor: '#262626'
    }
  ];

  return (
    <div className="bg-[#121212] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1f1f1f] rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Division Interest Dashboard</h2>
            <div className="flex items-center bg-[#FF2800]/10 text-[#FF2800] px-4 py-2 rounded-lg">
              <TrendingUp className="w-5 h-5 mr-2" />
              <span className="text-xl font-bold">225</span>
              <span className="ml-2 text-sm">Total Interested Programs</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {divisions.map((division, index) => (
              <DivisionCard
                key={index}
                title={division.title}
                stats={division.stats}
                backgroundColor={division.backgroundColor}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;