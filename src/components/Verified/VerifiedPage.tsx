import React, { useEffect, useRef } from 'react';
import Background from './Background';
import Nav from './Nav';
import Hero from './Hero';
import Problem from './Problem';
import Fix from './Fix';
import GetOn from './GetOn';
import Footer from './Footer';
import './verified.css';

const VerifiedPage: React.FC = () => {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // parallax background layers (rAF-throttled)
    const layers = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
    let y = window.scrollY;
    let ticking = false;
    const frame = () => {
      for (const el of layers) {
        const k = parseFloat(el.dataset.parallax || '0');
        el.style.transform = `translate3d(0, ${(-y * k).toFixed(1)}px, 0)`;
      }
      ticking = false;
    };
    const onScroll = () => {
      y = window.scrollY;
      if (!ticking) {
        requestAnimationFrame(frame);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    frame();

    // intersection reveals
    const revealEls = root.querySelectorAll('.v-reveal');
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.16 }
    );
    revealEls.forEach((el) => io.observe(el));
    // hero strike-through always fires
    root.querySelector('.v-hero')?.classList.add('is-in');

    // mouse-follow glow
    const glow = root.querySelector<HTMLElement>('.v-bg-glow');
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 60;
      ty = (e.clientY / window.innerHeight - 0.5) * 60;
    };
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      if (glow) {
        glow.style.marginLeft = `${cx.toFixed(1)}px`;
        glow.style.marginTop = `${cy.toFixed(1)}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  return (
    <div className="v-page" ref={rootRef}>
      <Background />
      <Nav />
      <main className="v-main">
        <Hero />
        <Problem />
        <Fix />
        <GetOn />
      </main>
      <Footer />
    </div>
  );
};

export default VerifiedPage;
