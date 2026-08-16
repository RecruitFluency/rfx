import React from 'react';
import Hero from './Hero';
import Problem from './Problem';
import Solution from './Solution';
import Closing from './Closing';
import Footer from '../Footer/Footer';

const EnginePage = () => (
  <div className="min-h-screen bg-black">
    <Hero />
    <Problem />
    <Solution />
    <Closing />
    <Footer />
  </div>
);

export default EnginePage;
