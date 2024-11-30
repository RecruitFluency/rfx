import React from 'react';
import { Instagram, Twitter, Facebook } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-[#121212] py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <nav className="flex flex-wrap justify-center gap-8 mb-6 md:mb-0">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">About</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a>
          </nav>
          
          <div className="flex gap-6">
            <a href="#" className="text-gray-400 hover:text-[#FF2800] transition-colors">
              <Instagram className="w-6 h-6" />
            </a>
            <a href="#" className="text-gray-400 hover:text-[#FF2800] transition-colors">
              <Twitter className="w-6 h-6" />
            </a>
            <a href="#" className="text-gray-400 hover:text-[#FF2800] transition-colors">
              <Facebook className="w-6 h-6" />
            </a>
          </div>
        </div>
        
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>&copy; {new Date().getFullYear()} RFX. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;