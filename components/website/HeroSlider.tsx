import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { HeroSlide, safeUrl } from '../../lib/siteContent';

interface HeroSliderProps {
  slides: HeroSlide[];
  intervalMs?: number;
}

/** Cross-fading photo slider for the website hero (founders, leadership, church life). */
const HeroSlider: React.FC<HeroSliderProps> = ({ slides, intervalMs = 6000 }) => {
  const items = slides
    .map((s) => ({ ...s, src: s.imageUrl ? safeUrl(s.imageUrl) : null }))
    .filter((s): s is HeroSlide & { src: string } => !!s.src);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const reduceMotion =
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const count = items.length;
  const go = (i: number) => setIndex(((i % count) + count) % count);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const t = window.setTimeout(() => go(index + 1), intervalMs);
    return () => window.clearTimeout(t);
  }, [index, paused, count, intervalMs, reduceMotion]);

  if (count === 0) return null;

  return (
    <div
      className="relative w-full max-w-md mx-auto lg:ml-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start === null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      }}
      role="region"
      aria-roledescription="carousel"
      aria-label="Church leadership photos"
    >
      {/* Glow + arch frame */}
      <div className="absolute -inset-6 sm:-inset-10 rounded-full bg-gold-500/25 blur-3xl pointer-events-none" />
      <div className="relative aspect-[4/5] rounded-t-[999px] rounded-b-[2.5rem] overflow-hidden border border-gold-500/40 bg-gradient-to-b from-gold-700/40 via-slate-900 to-black shadow-[0_40px_80px_-20px_rgba(0,0,0,0.8)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(197,146,53,0.45),transparent_65%)]" />
        {items.map((s, i) => {
          const cutout = /\.png(\?|$)/i.test(s.src);
          return (
            <img
              key={`${s.src}-${i}`}
              src={s.src}
              alt={[s.caption, s.subtitle].filter(Boolean).join(' — ') || 'Church leadership'}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-out ${
                cutout ? 'object-contain object-bottom pt-8' : 'object-cover object-top'
              } ${i === index ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={i !== index}
            />
          );
        })}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/70 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-center" aria-live="polite">
          {items[index].caption && (
            <div className="text-[11px] font-black uppercase tracking-[0.35em] text-gold-400">{items[index].caption}</div>
          )}
          {items[index].subtitle && <div className="mt-1 text-lg font-black text-white">{items[index].subtitle}</div>}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-3 sm:left-0 top-1/2 -translate-y-1/2 sm:-translate-x-1/2 w-10 h-10 rounded-full bg-black/70 border border-white/15 text-white flex items-center justify-center hover:border-gold-500"
            aria-label="Previous photo"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-3 sm:right-0 top-1/2 -translate-y-1/2 sm:translate-x-1/2 w-10 h-10 rounded-full bg-black/70 border border-white/15 text-white flex items-center justify-center hover:border-gold-500"
            aria-label="Next photo"
          >
            <ChevronRight size={18} />
          </button>
          <div className="mt-5 flex justify-center gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? 'w-8 bg-gold-500' : 'w-3 bg-white/30 hover:bg-white/50'}`}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default HeroSlider;
