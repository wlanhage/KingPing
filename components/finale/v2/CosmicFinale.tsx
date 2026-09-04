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
  const [canvasGen, setCanvasGen] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [debug, setDebug] = useState(false);
  const lastError = useRef<string | null>(null);
  const lostCount = useRef(0);
  const root = useRef<HTMLDivElement | null>(null);
  const progress = useRef(0);
  const velocity = useRef(0);
  const audioRef = useRef<ReturnType<typeof createFinaleAudio> | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cinemaStop = useRef<(() => void) | null>(null);

  useEffect(() => {
    setDebug(new URLSearchParams(window.location.search).get('debug') === '1');
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

  // Ingen global felvakt längre. Den förra fångade ALLA fönsterfel som nämnde
  // THREE/WebGL, avmonterade canvasen för gott och körde preventDefault — ett enda
  // ofarligt fel gav svart rymd, tyst. Nu registreras bara senaste felet för
  // debugrutan; äkta kontextförlust hanteras separat med återmontering.
  useEffect(() => {
    if (!started) return;
    const record = (msg: string) => { lastError.current = msg; setErrorCount((n) => n + 1); };
    const onError = (e: ErrorEvent) => record(e.message ?? String(e));
    const onRej = (e: PromiseRejectionEvent) => record(String(e.reason?.message ?? e.reason ?? 'rejection'));
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRej);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRej); };
  }, [started]);

  // Äkta kontextförlust: montera om canvasen med ny key efter en kort paus i stället
  // för att ge upp. Canvasen är inte pinnad, så om-montering är säker. Max tre försök.
  function handleContextLost() {
    lastError.current = 'webglcontextlost';
    lostCount.current += 1;
    // Fler än tre förluster i rad betyder att GPU:n inte orkar — då släpper vi 3D:n
    // och låter den statiska nebulosan (CSS) bära bakgrunden.
    if (lostCount.current > 3) { setWebgl(false); return; }
    // Ny key → ny WebGLRenderer med färsk kontext. Pausen ger webbläsaren tid att
    // frigöra den gamla innan vi ber om en ny.
    window.setTimeout(() => setCanvasGen((g) => g + 1), 800);
  }

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
    <div ref={root} className='finale finale-v2' style={seasonVars} data-reduced={reduced || undefined} data-started={started || undefined} data-webgl={webgl ? 'on' : 'off'}>
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
                key={canvasGen}
                summary={summary}
                progress={progress}
                velocity={velocity}
                onContextLost={handleContextLost}
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
          {debug && <DebugHud progress={progress} velocity={velocity} webgl={webgl} canvasGen={canvasGen} errorCount={errorCount} lastError={lastError} />}
        </>
      )}
    </div>
  );
}

/** ?debug=1 — liten fast ruta som visar vad scenen faktiskt gör. Uppdaterar via rAF. */
function DebugHud({ progress, velocity, webgl, canvasGen, errorCount, lastError }: {
  progress: { current: number }; velocity: { current: number }; webgl: boolean; canvasGen: number;
  errorCount: number; lastError: { current: string | null };
}) {
  const el = useRef<HTMLPreElement | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const w = (window as unknown as { __cosmos?: { gl: { getContext(): WebGLRenderingContext }; scene: { children: unknown[] } } }).__cosmos;
      const lost = w ? w.gl.getContext().isContextLost() : null;
      if (el.current) el.current.textContent = [
        `progress ${progress.current.toFixed(3)}`,
        `velocity ${Math.round(velocity.current)}`,
        `webgl ${webgl ? 'on' : 'OFF'} · gen ${canvasGen} · ctxLost ${lost}`,
        `scene ${w ? 'ready' : 'not ready'}`,
        `errors ${errorCount}${lastError.current ? ' · ' + lastError.current.slice(0, 90) : ''}`,
      ].join('\n');
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress, velocity, webgl, canvasGen, errorCount, lastError]);
  return <pre ref={el} className='v2-debug' />;
}
