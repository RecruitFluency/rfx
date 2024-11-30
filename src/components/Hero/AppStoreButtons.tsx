import React from 'react';

const AppStoreButtons = () => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
      <a 
        href="#" 
        className="transform hover:scale-105 transition-transform duration-300"
      >
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" 
          alt="Download on App Store" 
          className="h-12"
          loading="lazy"
        />
      </a>
      <a 
        href="#" 
        className="transform hover:scale-105 transition-transform duration-300"
      >
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" 
          alt="Get it on Google Play" 
          className="h-12"
          loading="lazy"
        />
      </a>
    </div>
  );
};

export default AppStoreButtons;