import React from 'react';

type Glow = 'red' | 'blue' | 'none';

const GLOW: Record<Glow, string> = {
  red: 'shadow-[0_50px_130px_-20px_rgba(229,25,44,0.42),0_20px_50px_rgba(0,0,0,0.7)]',
  blue: 'shadow-[0_50px_130px_-20px_rgba(61,90,254,0.42),0_20px_50px_rgba(0,0,0,0.7)]',
  none: 'shadow-[0_30px_80px_rgba(0,0,0,0.75)]',
};

/**
 * iPhone 17 Pro Max, matte black titanium.
 *
 * The rail is built from three stacked layers so the edge reads as machined
 * metal rather than a flat stroke: an outer graphite gradient (the band), a
 * near-black inset ring (the chamfer shadow), then the screen.
 */
export function IPhoneFrame({
  children,
  glow = 'red',
  width = 288,
  className = '',
}: {
  children: React.ReactNode;
  glow?: Glow;
  width?: number;
  className?: string;
}) {
  // Hardware details scale with the shell so the phone stays proportional.
  const s = width / 288;
  const px = (n: number) => `${n * s}px`;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width }}>
      {/* side buttons — behind the rail so only the nub shows */}
      <span
        aria-hidden="true"
        className="absolute left-[-2px] rounded-l-sm bg-gradient-to-b from-[#4a4a52] via-[#2a2a30] to-[#17171b]"
        style={{ top: px(112), width: px(3), height: px(28) }}
      />
      <span
        aria-hidden="true"
        className="absolute left-[-2px] rounded-l-sm bg-gradient-to-b from-[#4a4a52] via-[#2a2a30] to-[#17171b]"
        style={{ top: px(152), width: px(3), height: px(52) }}
      />
      <span
        aria-hidden="true"
        className="absolute left-[-2px] rounded-l-sm bg-gradient-to-b from-[#4a4a52] via-[#2a2a30] to-[#17171b]"
        style={{ top: px(216), width: px(3), height: px(52) }}
      />
      <span
        aria-hidden="true"
        className="absolute right-[-2px] rounded-r-sm bg-gradient-to-b from-[#4a4a52] via-[#2a2a30] to-[#17171b]"
        style={{ top: px(180), width: px(3), height: px(84) }}
      />

      {/* outer titanium rail */}
      <div
        className={`relative bg-gradient-to-b from-[#3c3c44] via-[#18181c] to-[#3c3c44] ${GLOW[glow]}`}
        style={{ borderRadius: px(52), padding: px(2.5) }}
      >
        {/* chamfer */}
        <div
          className="relative bg-[#08080a]"
          style={{ borderRadius: px(50), padding: px(3) }}
        >
          {/* screen */}
          <div
            className="relative overflow-hidden bg-ink-0"
            style={{ borderRadius: px(47) }}
          >
            {children}

            {/* Dynamic Island — floats above the screen content */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 flex -translate-x-1/2 items-center justify-end bg-black"
              style={{ top: px(10), width: px(88), height: px(26), borderRadius: px(13), paddingRight: px(8) }}
            >
              <span
                className="rounded-full bg-[#0e1520] ring-1 ring-white/5"
                style={{ width: px(9), height: px(9) }}
              />
            </span>

            {/* home indicator */}
            <span
              aria-hidden="true"
              className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white/70"
              style={{ bottom: px(7), width: px(96), height: px(4) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * MacBook Pro. Lid + hinge + tapered base, notch in the top bezel.
 * `children` fills the display area.
 */
export function MacBookFrame({
  children,
  glow = 'red',
  className = '',
}: {
  children: React.ReactNode;
  glow?: Glow;
  className?: string;
}) {
  return (
    <div className={`w-full ${className}`}>
      {/* lid */}
      <div
        className={`relative rounded-t-[14px] bg-gradient-to-b from-[#2e2e34] to-[#1b1b20] p-[10px] pb-[12px] ${GLOW[glow]}`}
      >
        <div className="relative overflow-hidden rounded-[6px] bg-ink-0 ring-1 ring-black/60">
          {/* notch */}
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-0 z-20 h-[18px] w-[112px] -translate-x-1/2 rounded-b-[9px] bg-[#141418]"
          >
            <span className="absolute left-1/2 top-[6px] h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-[#0b0f16]" />
          </span>
          {/* screen glare */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(122deg,rgba(255,255,255,0.05)_0%,transparent_38%)]"
          />
          {children}
        </div>
      </div>
      {/* base */}
      <div className="relative">
        <div className="h-[10px] rounded-b-[7px] bg-gradient-to-b from-[#3a3a42] via-[#26262c] to-[#15151a]" />
        {/* notch/thumb scoop */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-[5px] w-[92px] -translate-x-1/2 rounded-b-[5px] bg-[#101014]"
        />
        {/* foot shadow spread */}
        <div className="mx-[-3%] h-[6px] rounded-b-[10px] bg-gradient-to-b from-[#121216] to-transparent" />
      </div>
    </div>
  );
}

/** Screenshot inside an IPhoneFrame. */
export function PhoneShot({
  src,
  alt,
  glow = 'red',
  width = 288,
  className = '',
}: {
  src: string;
  alt: string;
  glow?: Glow;
  width?: number;
  className?: string;
}) {
  return (
    <IPhoneFrame glow={glow} width={width} className={className}>
      <img src={src} alt={alt} className="block w-full" loading="lazy" decoding="async" />
    </IPhoneFrame>
  );
}
