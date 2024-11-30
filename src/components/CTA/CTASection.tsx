import React from 'react';
import { motion } from 'framer-motion';
import AppStoreButtons from '../Hero/AppStoreButtons';

const CTASection = () => {
  return (
    <section className="bg-[#1f1f1f] py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-[#121212] rounded-2xl p-12 shadow-2xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Take Control of Your Soccer Future?
          </h2>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Join thousands of athletes already accelerating their path to college soccer
          </p>
          <AppStoreButtons />
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;