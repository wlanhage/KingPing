'use client';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import type { FinaleSummary } from '@/lib/domain/finale';
import { getTheme, themeCssVars } from '@/lib/theme';
import { createFinaleAudio } from '../finale-audio';
import { ColdOpenV2, CoronationV2, EpilogueV2, GalaxyCaptionV2, NumbersV2 } from './acts';

gsap.registerPlugin(ScrollTrigger);

const CosmosCanvas = dynamic(() => import('./CosmosCanvas').then((m) => m.CosmosCanvas), {
  ssr: false,
  loading: () => null,
});

/**
 * Finale v2 — "Galaxen". En fast canvas bakom hela sidan; scrollen skriver progress
 * och hastighet till refs som scenen läser. DOM-akterna är vanliga sektioner som
 * ger sidan höjd och bär HUD-texten. Inga pinnade sektioner.
 */
export function CosmicFinale({ summary, cinema }: { summary: FinaleSummary; cinema: boolean }) {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const root = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);
  const velocity = useRef(0);
  const audioRef = useRef<ReturnType<typeof createFinaleAudio> | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cinemaStop = useRef<(() => void) | null>(null);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const audio = createFinaleAudio(summary.season.slug);
    audioRef.current = audio;
    setMuted(audio.isMutedInitially());
    return () => audio.stop();
  }, [summary.season.slug]);

  // Lenis + EN ScrollTrigger över hela finalen som skriver progress/hastighet.
  useEffect(() => {
    if (!started || reduced || !root.current) return;
    const lenis = new Lenis({ lerp: 0.1 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    const st = ScrollTrigger.create({
      trigger: root.current,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => { progress.current = self.progress; velocity.current = self.getVelocity(); },
    });
    return () => {
      st.kill();
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [started, reduced]);

  // Global vakt: R3F kastar från sin rAF-loop vid förlorad kontext, och det fångar
  // ingen felgräns. Canvasen är inte pinnad, så att avmontera den är säkert.
  useEffect(() => {
    if (!started || reduced) return;
    const isWebgl = (m: string) => /getContextAttributes|reading 'alpha'|WebGL|THREE\.|context lost/i.test(m);
    const onError = (e: ErrorEvent) => { if (isWebgl(e.message ?? '')) { e.preventDefault(); setWebgl(false); } };
    const onRej = (e: PromiseRejectionEvent) => { if (isWebgl(String(e.reason?.message ?? e.reason ?? ''))) { e.preventDefault(); setWebgl(false); } };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRej);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRej); };
  }, [started, reduced]);

  useEffect(() => () => cinemaStop.current?.(), []);

  function begin() {
    setStarted(true);
    void audioRef.current?.start();
    if (!cinema || reduced) return;
    const timer = window.setTimeout(() => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const secs = audioRef.current?.suggestedSeconds() ?? 100;
      const proxy = { y: window.scrollY };
      const tween = gsap.to(proxy, { y: max, duration: secs, ease: 'none', onUpdate: () => lenisRef.current?.scrollTo(proxy.y, { immediate: true }) });
      const ac = new AbortController();
      const stop = () => { tween.kill(); ac.abort(); cinemaStop.current = null; };
      cinemaStop.current = stop;
      window.addEventListener('wheel', stop, { signal: ac.signal });
      window.addEventListener('pointerdown', stop, { signal: ac.signal });
      window.addEventListener('keydown', (e) => { if (e.key === ' ') stop(); }, { signal: ac.signal });
    }, 800);
    cinemaStop.current = () => window.clearTimeout(timer);
  }

  function toggleMute() {
    setMuted((m) => { audioRef.current?.setMuted(!m); return !m; });
  }

  const seasonVars = useMemo(() => themeCssVars(getTheme(summary.season.theme).colors) as React.CSSProperties, [summary.season.theme]);
  const acts = { summary, reduced };

  return (
    <div ref={root} className='finale finale-v2' style={seasonVars} data-reduced={reduced || undefined} data-started={started || undefined}>
      {!started && (
        <div className='finale-cover v2-cover'>
          <p className='finale-door-eyebrow'>Krönikan</p>
          <h1 className='finale-cover-title'>{summary.season.name}</h1>
          <button type='button' className='crown-btn' onClick={begin}>Lämna omloppsbanan</button>
          <p className='finale-cover-hint'>Skrolla genom galaxen{cinema ? ' — eller luta dig tillbaka' : ''}. Ljud rekommenderas.</p>
        </div>
      )}
      {started && (
        <>
          {!reduced && webgl && (
            <div className='v2-stage' aria-hidden>
              <CosmosCanvas
                summary={summary}
                progress={progress}
                velocity={velocity}
                onContextLost={() => setWebgl(false)}
                onReady={(api) => {
                  if (process.env.NODE_ENV !== 'production') {
                    (window as unknown as { __cosmos?: unknown }).__cosmos = { ...api, progress, velocity };
                  }
                }}
              />
            </div>
          )}
          <ColdOpenV2 {...acts} />
          <NumbersV2 {...acts} />
          <GalaxyCaptionV2 {...acts} />
          <CoronationV2 {...acts} />
          <EpilogueV2 {...acts} />
          <button type='button' className='finale-mute' onClick={toggleMute} aria-pressed={muted}>{muted ? '🔇' : '🔊'}</button>
        </>
      )}
    </div>
  );
}
