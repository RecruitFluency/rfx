import React from 'react';
import { Eyebrow } from './ui';
import { Reveal, ParallaxPlane } from './motion';
import { MacBookFrame } from './devices';
import PlayerPipeline from './screens/PlayerPipeline';

export default function Roadmap() {
  return (
    <section id="roadmap" className="relative overflow-hidden py-28 md:py-32">
      <div className="pointer-events-none absolute inset-x-0 top-24 h-96 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,46,63,0.14),transparent_70%)]" />
      <div className="relative mx-auto max-w-page px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>The platform</Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Your digital <span className="text-crimson-400">roadmap</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-paper-1">
            A live command center for your entire recruitment — metrics, matches, messages, and the
            milestones between you and signing day.
          </p>
        </Reveal>

        <div className="relative mt-16">
          <Reveal>
            <MacBookFrame glow="red" className="mx-auto max-w-4xl">
              <PlayerPipeline />
            </MacBookFrame>
          </Reveal>

          {/* overlapping foreground widgets — faster plane */}
          <ParallaxPlane
            speed={1.3}
            range={160}
            className="absolute -left-4 top-1/4 hidden xl:block"
          >
            <div className="rounded-card border border-line-2 bg-ink-2/95 px-4 py-3.5 shadow-card backdrop-blur-sm">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">
                Weekly trend
              </p>
              <div className="mt-2 flex h-8 items-end gap-1">
                {[40, 55, 45, 70, 62, 88, 100].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1.5 rounded-t-sm bg-gradient-to-b from-crimson-400 to-crimson-700"
                  />
                ))}
              </div>
            </div>
          </ParallaxPlane>
          <ParallaxPlane
            speed={1.2}
            range={160}
            className="absolute -right-6 bottom-8 hidden xl:block"
          >
            <div className="rounded-card border border-line-blue bg-ink-2/95 px-4 py-3.5 shadow-glow-blue backdrop-blur-sm">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">
                Next milestone
              </p>
              <p className="mt-1 text-sm font-semibold text-paper-0">Official visit · Sep 12</p>
            </div>
          </ParallaxPlane>

          {/* bottom fade into the void */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-1 h-32 bg-gradient-to-b from-transparent to-ink-0" />
        </div>
      </div>
    </section>
  );
}
