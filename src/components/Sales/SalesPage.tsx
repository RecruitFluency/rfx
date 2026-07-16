import React from 'react';
import Hero from './Hero';
import Problem from './Problem';
import Comparison from './Comparison';
import Loop from './Loop';
import Vector from './Vector';
import Installed from './Installed';
import Proof from './Proof';
import Fit from './Fit';
import Access from './Access';
import FAQ from './FAQ';
import Footer from '../Footer/Footer';

const SalesPage = () => (
  <div className="min-h-screen bg-black">
    <Hero />
    <Problem />
    <Comparison />
    <Loop />
    <Vector />
    <Installed />
    <Proof />
    <Fit />
    <Access />
    <FAQ />
    <Footer />
  </div>
);

export default SalesPage;
