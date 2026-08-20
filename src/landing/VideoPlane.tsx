import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Lazily-mounted background/accent video.
 *
 * The clips are several MB each, so the <video> element is only created once
 * the block is near the viewport — nothing is fetched on initial page load.
 * Under `prefers-reduced-motion` no video is mounted at all.
 */
export default function VideoPlane({
  src,
  className = '',
  videoClassName = '',
  opacity = 1,
  rootMargin = '300px',
  defer = false,
}: {
  src: string;
  className?: string;
  videoClassName?: string;
  opacity?: number;
  rootMargin?: string;
  /**
   * For a clip that sits in the initial viewport (the hero backdrop): hold off
   * until the page has loaded and the main thread is idle, so several MB of
   * decorative footage never competes with the first paint.
   */
  defer?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mount, setMount] = useState(false);
  const [armed, setArmed] = useState(!defer);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (armed || reduce) return;
    let idle = 0;
    const arm = () => {
      const ric = window.requestIdleCallback;
      idle = ric ? ric(() => setArmed(true), { timeout: 3000 }) : window.setTimeout(() => setArmed(true), 1200);
    };
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });
    return () => {
      window.removeEventListener('load', arm);
      if (idle) (window.cancelIdleCallback ?? window.clearTimeout)(idle);
    };
  }, [armed, reduce]);

  useEffect(() => {
    const el = ref.current;
    if (!el || mount || reduce || !armed) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setMount(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mount, reduce, rootMargin, armed]);

  return (
    <div ref={ref} className={className} style={{ opacity }} aria-hidden="true">
      {mount && (
        <video
          className={`h-full w-full object-cover ${videoClassName}`}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
        />
      )}
    </div>
  );
}
