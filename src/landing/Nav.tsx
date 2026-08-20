import React, { useEffect, useState } from 'react';
import { RFXLogo, PrimaryButton } from './ui';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'border-b border-line bg-ink-0/70 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-page items-center justify-between px-6">
        <a href="#" aria-label="RFX home">
          <RFXLogo />
        </a>
        <div className="hidden items-center gap-8 font-body text-sm text-paper-2 md:flex">
          <a href="#features" className="transition-colors hover:text-paper-0">Features</a>
          <a href="#roadmap" className="transition-colors hover:text-paper-0">Platform</a>
          <a href="#clubs" className="transition-colors hover:text-paper-0">For Clubs</a>
          <a href="#pricing" className="transition-colors hover:text-paper-0">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/app"
            className="font-body text-sm font-medium text-paper-1 transition-colors hover:text-paper-0"
          >
            Login
          </a>
          <PrimaryButton className="!px-5 !py-2.5">Get Started</PrimaryButton>
        </div>
      </div>
    </nav>
  );
}
