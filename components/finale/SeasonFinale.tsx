'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';
import type { FinaleSummary } from '@/lib/domain/finale';
import { getTheme, themeCssVars } from '@/lib/theme';
import { createFinaleAudio } from './finale-audio';
import { ColdOpen } from './ColdOpen';
import { NumbersAct } from './NumbersAct';
import { CrownWeave } from './CrownWeave';
import { Epilogue } from './Epilogue';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export function SeasonFinale({ summary, cinema }: { summary: FinaleSummary; cinema: boolean }) {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const audioRef = useRef<ReturnType<typeof createFinaleAudio> | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cinemaTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const audio = createFinaleAudio(summary.season.slug);
    audioRef.current = audio;
    setMuted(audio.isMutedInitially());
    return () => audio.stop();
  }, [summary.season.slug]);

  // Lenis + ScrollTrigger-koppling. Startas först efter covern så sidan ligger still.
  useEffect(() => {
    if (!started || reduced) return;
    const lenis = new Lenis({ lerp: 0.12 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [started, reduced]);

  function begin() {
    setStarted(true);
    void audioRef.current?.start();
    if (cinema && !reduced) {
      // Autoskroll för TV:n: hela resan i lagom takt; avbryts av all interaktion.
      window.setTimeout(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const secs = audioRef.current?.suggestedSeconds() ?? 90;
        const proxy = { y: window.scrollY };
        cinemaTween.current = gsap.to(proxy, {
          y: max, duration: secs, ease: 'none',
          onUpdate: () => lenisRef.current?.scrollTo(proxy.y, { immediate: true }),
        });
        const stop = () => { cinemaTween.current?.kill(); cinemaTween.current = null; };
        window.addEventListener('wheel', stop, { once: true });
        window.addEventListener('pointerdown', stop, { once: true });
        window.addEventListener('keydown', (e) => { if (e.key === ' ') stop(); }, { once: true });
      }, 800);
    }
  }

  function toggleMute() {
    setMuted((m) => { audioRef.current?.setMuted(!m); return !m; });
  }

  const acts = useMemo(() => ({ summary, reduced }), [summary, reduced]);
  // Finalen renderas i SIN säsongs tema, inte det aktiva (spec-krav): säsongens
  // tema-variabler sätts på wrappern och vinner därmed över layoutens <html>-vars.
  const seasonVars = useMemo(() => themeCssVars(getTheme(summary.season.theme).colors) as React.CSSProperties, [summary.season.theme]);

  return (
    <div className='finale' style={seasonVars} data-reduced={reduced || undefined} data-started={started || undefined}>
      {!started && (
        <div className='finale-cover'>
          <p className='finale-door-eyebrow'>Krönikan</p>
          <h1 className='finale-cover-title'>{summary.season.name}</h1>
          <button type='button' className='crown-btn' onClick={begin}>Träd in</button>
          <p className='finale-cover-hint'>Skrolla dig genom säsongen{cinema ? ' — eller luta dig tillbaka' : ''}.</p>
        </div>
      )}
      {started && (
        <>
          <ColdOpen {...acts} />
          <NumbersAct {...acts} />
          <CrownWeave {...acts} />
          <Epilogue {...acts} />
          <button type='button' className='finale-mute' onClick={toggleMute} aria-pressed={muted}>
            {muted ? '🔇' : '🔊'}
          </button>
        </>
      )}
    </div>
  );
}
