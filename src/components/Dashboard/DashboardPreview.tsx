import React from 'react';
import { motion } from 'framer-motion';
import DivisionCard from './DivisionCard';

const divisions = [
  {
    title: 'NCAA D1',
    stats: {
      interested: 2,
      notInterested: 3,
      schools: ['Stanford', 'Duke'],
      notInterestedSchools: ['North Carolina', 'UCLA', 'Virginia'],
      responseRate: '40%',
      avgResponseTime: '48h',
      scholarshipRange: '$25k-45k'
    },
    backgroundColor: '#1a1a1a'
  },
  {
    title: 'NCAA D2',
    stats: {
      interested: 12,
      notInterested: 8,
      schools: ['Grand Valley State', 'Northwest Missouri', 'Minnesota State'],
      notInterestedSchools: ['Charleston', 'Tampa', 'Nova Southeastern'],
      responseRate: '60%',
      avgResponseTime: '24h',
      scholarshipRange: '$15k-30k'
    },
    backgroundColor: '#1d1d1d'
  },
  {
    title: 'NCAA D3',
    stats: {
      interested: 74,
      notInterested: 26,
      schools: ['MIT', 'Johns Hopkins', 'Williams', 'Amherst'],
      notInterestedSchools: ['Middlebury', 'Tufts', 'Bowdoin'],
      responseRate: '74%',
      avgResponseTime: '12h',
      scholarshipRange: 'Academic Only'
    },
    backgroundColor: '#202020'
  },
  {
    title: 'NAIA',
    stats: {
      interested: 81,
      notInterested: 19,
      schools: ['Indiana Wesleyan', 'Georgetown College', 'Oklahoma City'],
      notInterestedSchools: ['Keiser', 'Mobile', 'Lindsey Wilson'],
      responseRate: '81%',
      avgResponseTime: '8h',
      scholarshipRange: '$12k-25k'
    },
    backgroundColor: '#232323'
  },
  {
    title: 'Junior College',
    stats: {
      interested: 70,
      notInterested: 30,
      schools: ['Iowa Western', 'Butler CC', 'Hutchinson CC'],
      notInterestedSchools: ['Tyler JC', 'Monroe', 'Indian Hills'],
      responseRate: '70%',
      avgResponseTime: '6h',
      scholarshipRange: '$5k-15k'
    },
    backgroundColor: '#262626'
  }
];

const DashboardPreview = () => {
  return (
    <section className="bg-[#1f1f1f] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="bg-[#121212] rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-white">Sample Athlete Dashboard</h2>
            <div className="flex items-center bg-[#FF2800]/10 text-[#FF2800] px-4 py-2 rounded-lg">
              <span className="text-xl font-bold">Active Recruitment</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {divisions.map((division, index) => (
              <DivisionCard
                key={index}
                {...division}
                delay={index * 0.1}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default DashboardPreview;