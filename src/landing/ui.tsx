import React from 'react';

/** Mono uppercase section tag with the red telemetry dot. */
export function Eyebrow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border border-line-2 px-3.5 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-paper-2 ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-crimson-500 shadow-glow-red" aria-hidden="true" />
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = '',
  href = '#',
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full bg-crimson-500 px-7 py-3.5 font-body text-sm font-semibold text-white shadow-glow-red transition-all duration-150 hover:-translate-y-px hover:bg-crimson-400 hover:shadow-glow-red-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-400 ${className}`}
    >
      {children}
    </a>
  );
}

export function GhostButton({
  children,
  className = '',
  href = '#',
}: {
  children: React.ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center rounded-full border border-line-2 px-7 py-3.5 font-body text-sm font-medium text-paper-0 transition-colors duration-200 hover:border-line-red hover:bg-crimson-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-crimson-400 ${className}`}
    >
      {children}
    </a>
  );
}

/** App Store / Google Play badge pair. */
export function StoreBadges({ className = '' }: { className?: string }) {
  const badge =
    'flex items-center gap-2.5 rounded-xl border border-line-2 bg-ink-2/80 px-4 py-2.5 transition-colors hover:border-line-red';
  return (
    <div className={`flex flex-wrap gap-3 ${className}`}>
      <a href="#" className={badge} aria-label="Download on the App Store">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-paper-0" aria-hidden="true">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[10px] text-paper-3">Download on the</span>
          <span className="block text-sm font-semibold text-paper-0">App Store</span>
        </span>
      </a>
      <a href="#" className={badge} aria-label="Get it on Google Play">
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-paper-0" aria-hidden="true">
          <path d="M3.6 1.8 13.7 12 3.6 22.2c-.37-.19-.6-.58-.6-1.08V2.88c0-.5.23-.89.6-1.08Zm1.63-.33 11.3 6.36-2.36 2.39L5.23 1.47ZM19.9 9.1c.72.4 1.1.94 1.1 1.63v2.54c0 .69-.38 1.23-1.1 1.63l-2.62 1.47-2.63-2.66 2.63-2.65 2.62 1.48v-3.44Zm-3.37 6.71-11.3 6.36 8.94-8.75 2.36 2.39Z" />
        </svg>
        <span className="text-left leading-tight">
          <span className="block text-[10px] text-paper-3">Get it on</span>
          <span className="block text-sm font-semibold text-paper-0">Google Play</span>
        </span>
      </a>
    </div>
  );
}

export function RFXLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-xl font-bold tracking-tight text-paper-0 ${className}`}>
      RF<span className="text-crimson-400">X</span>
    </span>
  );
}
