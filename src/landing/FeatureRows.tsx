import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Eyebrow } from './ui';
import { Reveal, ParallaxPlane } from './motion';
import { AppShot } from './mockups';

function Row({
  eyebrow,
  title,
  copy,
  bullets,
  media,
  flip = false,
  widget,
}: {
  eyebrow: string;
  title: React.ReactNode;
  copy: string;
  bullets: string[];
  media: React.ReactNode;
  flip?: boolean;
  widget?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">
      <Reveal className={flip ? 'lg:order-2' : ''}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="mt-6 max-w-md font-display text-3xl font-semibold leading-[1.1] tracking-[-0.02em] text-paper-0 text-balance md:text-4xl">
          {title}
        </h3>
        <p className="mt-5 max-w-md font-body text-[15px] leading-relaxed text-paper-1">{copy}</p>
        <ul className="mt-6 space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm text-paper-1">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-crimson-400" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal order={1} className={`relative flex justify-center ${flip ? 'lg:order-1' : ''}`}>
        {media}
        {widget}
      </Reveal>
    </div>
  );
}

export default function FeatureRows() {
  return (
    <section id="features" className="relative py-28 md:py-32">
      <div className="mx-auto max-w-page px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Built for the journey</Eyebrow>
          <h2 className="mt-6 font-display text-4xl font-semibold leading-[1.05] tracking-[-0.025em] text-paper-0 text-balance md:text-5xl">
            Getting recruited has never been <span className="text-outline">easier.</span>
          </h2>
        </Reveal>

        <div className="mt-24 space-y-28 md:space-y-36">
          <Row
            eyebrow="Your profile"
            title={
              <>
                Build a profile that showcases all of your{' '}
                <span className="text-crimson-400">athletic ability</span>
              </>
            }
            copy="Verified metrics, highlight reels, academics, and coach endorsements in one living profile that updates with every match you play."
            bullets={[
              'Verified speed, strength & match metrics',
              'Highlight reels with instant clipping',
              'Academic transcripts & eligibility status',
            ]}
            media={
              <div className="relative">
                <AppShot
                  src="/screens/highlight-reel.webp"
                  alt="RFX app — uploading a highlight reel"
                  glow="red"
                  width={280}
                />
                <ParallaxPlane speed={1.12} range={100} className="absolute -right-24 top-16 hidden xl:block">
                  <AppShot
                    src="/screens/onboarding-divisions.webp"
                    alt="RFX app — choosing target divisions"
                    glow="red"
                    width={200}
                    className="opacity-90"
                  />
                </ParallaxPlane>
              </div>
            }
            widget={
              <ParallaxPlane
                speed={1.25}
                range={140}
                className="absolute -right-2 top-14 hidden lg:block"
              >
                <div className="rounded-card border border-line-2 bg-ink-2/90 px-4 py-3 shadow-card backdrop-blur-sm">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">
                    Profile views
                  </p>
                  <p className="font-display text-lg font-semibold text-paper-0 tabular-nums">
                    +128 <span className="text-[10px] text-crimson-400">this week</span>
                  </p>
                </div>
              </ParallaxPlane>
            }
          />
          <Row
            flip
            eyebrow="Your network"
            title={
              <>
                Connect with the right <span className="text-crimson-400">coaches and programs</span>
              </>
            }
            copy="Stop cold-emailing into the void. RFX matches your profile against thousands of college programs and puts you in front of the coaches already looking for your position."
            bullets={[
              'Smart matching by position, level & academics',
              'Direct messaging with verified coaches',
              'Program shortlists that update as you improve',
            ]}
            media={
              <div className="relative">
                <AppShot
                  src="/screens/coach-interest.webp"
                  alt="RFX app — coach interest by division with 1,752 profile views"
                  glow="blue"
                  width={280}
                />
                <ParallaxPlane speed={1.12} range={100} className="absolute -left-24 top-20 hidden xl:block">
                  <AppShot
                    src="/screens/coach-interest-list.webp"
                    alt="RFX app — interested coaches list"
                    glow="blue"
                    width={200}
                    className="opacity-90"
                  />
                </ParallaxPlane>
              </div>
            }
            widget={
              <ParallaxPlane
                speed={1.25}
                range={140}
                className="absolute -left-2 bottom-16 hidden lg:block"
              >
                <div className="rounded-card border border-line-blue bg-ink-2/90 px-4 py-3 shadow-glow-blue backdrop-blur-sm">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-paper-3">
                    New match
                  </p>
                  <p className="text-sm font-semibold text-paper-0">Westlake University · D1</p>
                </div>
              </ParallaxPlane>
            }
          />
        </div>
      </div>
    </section>
  );
}
