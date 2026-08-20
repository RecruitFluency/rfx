import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { Play } from 'lucide-react';
import { Eyebrow, StoreBadges, PrimaryButton } from './ui';
import { PointerField, FloatCard, ParallaxPlane, ARRIVE } from './motion';
import VideoPlane from './VideoPlane';

const ATHLETE_SRC = '/parallax/hero-athlete-cutout.webp';

/** L4 widget: sprint-speed bar sparkline. */
function SpeedGraphCard() {
  const bars = [30, 45, 38, 62, 78, 100, 84, 58];
  return (
    <div className="rounded-card border border-line-2 bg-ink-2/90 p-4 shadow-card backdrop-blur-sm">
      <span className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-paper-3">
        Scoring Form
      </span>
      <div className="flex h-9 items-end gap-1">
        {bars.map((h, i) => (
          <span
            key={i}
            style={{ height: `${h}%` }}
            className="w-2 rounded-t-sm bg-gradient-to-b from-crimson-400 to-crimson-700"
          />
        ))}
      </div>
    </div>
  );
}

/** L4 widget: headline metric. */
function TopSpeedCard() {
  return (
    <div className="rounded-card border border-line-2 bg-ink-2/90 px-5 py-4 shadow-card backdrop-blur-sm">
      <span className="mb-1.5 block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-paper-3">
        Vertical Leap
      </span>
      <span className="font-display text-2xl font-semibold tracking-tight text-paper-0 tabular-nums">
        38.5 <span className="font-mono text-[11px] font-medium text-crimson-400">IN VERT</span>
      </span>
    </div>
  );
}

/** L4 widget: video player module. */
function HighlightCard() {
  return (
    <div className="flex items-center gap-3.5 rounded-card border border-line-2 bg-ink-2/90 px-4 py-3.5 shadow-card backdrop-blur-sm">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-crimson-500 shadow-glow-red">
        <Play className="ml-0.5 h-4 w-4 fill-white text-white" aria-hidden="true" />
      </span>
      <span className="leading-tight">
        <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-paper-3">
          Highlight Reel
        </span>
        <span className="font-mono text-xs text-paper-2">02:14 · game vs. north</span>
      </span>
    </div>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  // Athlete plane: 0.85× scroll (lags slightly) + approaches the camera.
  const athleteY = useTransform(scrollY, [0, 600], [0, 90]);
  const athleteScale = useTransform(scrollY, [0, 600], [1, 1.06]);

  return (
    <PointerField>
      <section
        ref={ref}
        className="relative overflow-hidden pb-24 pt-40 md:pb-32"
        aria-label="RFX — simplify your recruitment journey"
      >
        {/* L1 — digital grid, recedes at 0.15× */}
        <ParallaxPlane
          speed={0.15}
          className="pointer-events-none absolute inset-[-10%] bg-grid [mask-image:radial-gradient(ellipse_90%_80%_at_50%_0%,black_20%,transparent_78%)]"
        />
        {/* L0.5 — ambient stadium footage, barely there, behind everything */}
        <VideoPlane
          src="/video/ambient-stadium.mp4"
          opacity={0.1}
          defer
          className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
        />
        {/* L2 — stadium light wash, 0.3× */}
        <ParallaxPlane speed={0.3} className="pointer-events-none absolute inset-[-10%]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_46%_52%_at_76%_-4%,rgba(255,46,63,0.32),transparent_68%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(215deg,rgba(143,14,27,0.30)_2%,transparent_44%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_30%_38%_at_12%_110%,rgba(61,90,254,0.14),transparent_70%)]" />
        </ParallaxPlane>

        <div className="relative mx-auto grid max-w-page grid-cols-1 items-center gap-14 px-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* L3 — content */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: ARRIVE }}
          >
            <Eyebrow>The #1 platform for aspiring college athletes</Eyebrow>
            <h1 className="mt-7 max-w-xl font-display text-5xl font-semibold leading-[1.02] tracking-[-0.03em] text-paper-0 text-balance md:text-7xl">
              Simplify your recruitment journey and unlock your{' '}
              <span className="text-crimson-400">true potential.</span>
            </h1>
            <p className="mt-6 max-w-lg font-body text-lg leading-relaxed text-paper-1">
              Build a profile that showcases your athletic ability, connect with the right coaches
              and programs, and turn conversations into real opportunities.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-5">
              <PrimaryButton>Start for free</PrimaryButton>
              <StoreBadges />
            </div>
          </motion.div>

          {/* Athlete plane — between L2 and L3, approaches on scroll */}
          <div className="relative min-h-[420px] md:min-h-[560px]">
            <motion.img
              src={ATHLETE_SRC}
              alt="College basketball athlete seated courtside under crimson stadium light"
              style={reduce ? undefined : { y: athleteY, scale: athleteScale }}
              className="absolute inset-x-0 bottom-[-6rem] mx-auto max-h-[640px] object-contain drop-shadow-[0_40px_120px_rgba(229,25,44,0.35)] md:bottom-[-8rem]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />

            {/* L4 — floating widget cards, pointer parallax */}
            <FloatCard depth={6} className="absolute left-[-4%] top-[6%] hidden md:block">
              <ParallaxPlane speed={1.15} range={120}>
                <TopSpeedCard />
              </ParallaxPlane>
            </FloatCard>
            <FloatCard depth={12} className="absolute right-[-2%] top-[30%] hidden md:block">
              <ParallaxPlane speed={1.3} range={120}>
                <SpeedGraphCard />
              </ParallaxPlane>
            </FloatCard>
            <FloatCard depth={9} className="absolute bottom-[4%] left-[2%]">
              <ParallaxPlane speed={1.2} range={120}>
                <HighlightCard />
              </ParallaxPlane>
            </FloatCard>
          </div>
        </div>

        {/* seam into the next section */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-ink-0" />
      </section>
    </PointerField>
  );
}
