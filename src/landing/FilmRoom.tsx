import React from 'react';
import { Play } from 'lucide-react';
import { Eyebrow } from './ui';
import { Reveal, ParallaxPlane } from './motion';
import { MacBookFrame } from './devices';
import VideoPlane from './VideoPlane';

/**
 * Film room: the highlight-reel pitch, shown rather than described.
 * Real footage plays inside the MacBook with the scout overlay on top.
 */
export default function FilmRoom() {
  return (
    <section className="relative overflow-hidden py-28 md:py-32">
      {/* ambient dunk footage bleeding through the section floor */}
      <VideoPlane
        src="/video/basketball-dunk.mp4"
        opacity={0.1}
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,black,transparent_75%)]"
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,rgba(255,46,63,0.12),transparent_70%)]" />

      <div className="relative mx-auto max-w-page px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Film room</Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Every rep, scouted in <span className="text-crimson-400">context</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-paper-1">
            Coaches watch your film with your verified measurables pinned to the frame — so the tape
            and the numbers tell one story.
          </p>
        </Reveal>

        <div className="relative mt-16">
          <Reveal>
            <MacBookFrame glow="red" className="mx-auto max-w-4xl">
              <div className="relative aspect-video bg-ink-0">
                <VideoPlane src="/video/athlete-profile.mp4" className="absolute inset-0" />

                {/* scout overlay — the product chrome over live footage */}
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/85 to-transparent p-4">
                  <span className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-crimson-500 shadow-glow-red">
                      <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" aria-hidden="true" />
                    </span>
                    <span className="leading-tight">
                      <span className="block text-sm font-semibold text-white">Willy S.</span>
                      <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-white/60">
                        Safety · 2027 · 4.3 40yd · 38&quot; vert
                      </span>
                    </span>
                  </span>
                  <span className="hidden items-center gap-2 sm:flex">
                    <span className="h-1 w-40 overflow-hidden rounded-full bg-white/20">
                      <span className="block h-full w-2/3 rounded-full bg-crimson-500" />
                    </span>
                    <span className="font-mono text-[10px] text-white/60">02:14</span>
                  </span>
                </div>
              </div>
            </MacBookFrame>
          </Reveal>

          <ParallaxPlane speed={1.28} range={150} className="absolute -left-4 top-1/3 hidden xl:block">
            <div className="rounded-card border border-line-2 bg-ink-2/95 px-4 py-3.5 shadow-card backdrop-blur-sm">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">Clip shared with</p>
              <p className="mt-1 text-sm font-semibold text-paper-0">14 D1 programs</p>
            </div>
          </ParallaxPlane>
          <ParallaxPlane speed={1.18} range={150} className="absolute -right-6 bottom-10 hidden xl:block">
            <div className="rounded-card border border-line-blue bg-ink-2/95 px-4 py-3.5 shadow-glow-blue backdrop-blur-sm">
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">Verified</p>
              <p className="mt-1 text-sm font-semibold text-paper-0">Combine-tested metrics</p>
            </div>
          </ParallaxPlane>
        </div>
      </div>
    </section>
  );
}
