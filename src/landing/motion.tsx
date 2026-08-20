import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  MotionValue,
  useMotionValue,
} from 'framer-motion';

/** Decelerating "arrive" curve — fast attack, long decay. */
export const ARRIVE = [0.22, 1, 0.36, 1] as const;

/**
 * Resolved once at module scope. Resolving `motion[tag]` during render would
 * hand React a new component identity on some renders, remounting the subtree
 * and re-arming the reveal observer.
 */
const MOTION_TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  li: motion.li,
  span: motion.span,
} as const;

/**
 * Scroll-linked parallax plane. `speed` is the scroll multiplier from the
 * spec's camera rig: <1 recedes (background), >1 approaches (foreground).
 * The offset is computed relative to the element's own journey through the
 * viewport so planes never drift out of their section.
 */
export function ParallaxPlane({
  speed,
  className = '',
  children,
  range = 220,
}: {
  speed: number;
  className?: string;
  children?: React.ReactNode;
  range?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  // speed 1 → no offset; 0.15 → lags by 85% of range; 1.3 → leads by 30%.
  const distance = (1 - speed) * range;
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return (
    <motion.div ref={ref} style={reduce ? undefined : { y }} className={className}>
      {children}
    </motion.div>
  );
}

/**
 * Scroll reveal: opacity 0→1, y 28→0, 650ms, staggered by `order`.
 *
 * Deliberately NOT framer-motion's `whileInView`. That relies solely on an
 * IntersectionObserver, which samples at frame boundaries — when async media or
 * a webfont swap shifts layout mid-scroll, an element can jump from below the
 * viewport to above it between two samples. The observer then never reports
 * `isIntersecting`, and with `once: true` there is no second chance, so the
 * content stays at opacity 0 permanently. This was reproducible: identical
 * builds stranded different headings depending on scroll cadence.
 *
 * Instead we pair the observer with a fallback sweep that can only ever reveal,
 * never hide. Anything at or above the fold is shown regardless of whether the
 * observer fired, so content can never be stranded.
 */
export function Reveal({
  children,
  className = '',
  order = 0,
  as = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  order?: number;
  as?: keyof typeof MOTION_TAGS;
}) {
  const MotionTag = MOTION_TAGS[as];
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) reveal();
      },
      { threshold: 0 },
    );
    let frame = 0;
    const reveal = () => {
      setShown(true);
      cleanup();
    };
    // Safety net: reveal anything whose top has reached the viewport, even if
    // the observer missed its crossing entirely.
    const sweep = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight && r.bottom > 0) reveal();
        else if (r.bottom <= 0) reveal(); // already scrolled past
      });
    };
    function cleanup() {
      io.disconnect();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener('scroll', sweep);
      window.removeEventListener('resize', sweep);
      window.removeEventListener('load', sweep);
    }

    io.observe(el);
    window.addEventListener('scroll', sweep, { passive: true });
    window.addEventListener('resize', sweep, { passive: true });
    window.addEventListener('load', sweep);
    sweep();

    return cleanup;
  }, [shown]);

  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={false}
      animate={
        shown
          ? { opacity: 1, y: 0 }
          : reduce
            ? { opacity: 0 }
            : { opacity: 0, y: 28 }
      }
      transition={
        reduce
          ? { duration: 0.2, delay: order * 0.08 }
          : { duration: 0.65, delay: order * 0.08, ease: ARRIVE }
      }
    >
      {children}
    </MotionTag>
  );
}

/* ---- pointer parallax (hero L4 cards) ---------------------------------- */

const PointerCtx = createContext<{ x: MotionValue<number>; y: MotionValue<number> } | null>(null);

/** Tracks the pointer over its area and shares a spring-smoothed −0.5..0.5 pair. */
export function PointerField({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 60, damping: 20 });
  const y = useSpring(rawY, { stiffness: 60, damping: 20 });
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set((e.clientX - r.left) / r.width - 0.5);
    rawY.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <div
      ref={ref}
      className={className}
      onPointerMove={onMove}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
      }}
    >
      <PointerCtx.Provider value={{ x, y }}>{children}</PointerCtx.Provider>
    </div>
  );
}

/** A floating card inside a PointerField; `depth` px of travel (±). */
export function FloatCard({
  depth = 12,
  className = '',
  children,
}: {
  depth?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = useContext(PointerCtx);
  const reduce = useReducedMotion();
  const zero = useMotionValue(0);
  const px = ctx?.x ?? zero;
  const py = ctx?.y ?? zero;
  const x = useTransform(px, (v) => v * depth * 2);
  const y = useTransform(py, (v) => v * depth * 2);
  return (
    <motion.div style={reduce ? undefined : { x, y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Counts up to `value` over 900ms when first scrolled into view. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / 900);
          const eased = 1 - Math.pow(1 - p, 3);
          setShown(Math.round(value * eased * 10) / 10);
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value]);

  return (
    <span ref={ref} className="tabular-nums">
      {Number.isInteger(value) ? Math.round(shown) : shown.toFixed(1)}
      {suffix}
    </span>
  );
}
