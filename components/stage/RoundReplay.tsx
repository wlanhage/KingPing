'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hash } from '@/lib/domain/heraldry';
import { hasWebGL, playCueSound } from '../Coronation';
import type { ReplayPlayer } from './RundanShow';
import type { CueName } from './types';

// three.js laddas först när någon trycker på play, som i kröningen.
const RundanShow = dynamic(() => import('./RundanShow').then((m) => m.RundanShow), { ssr: false });

export function RoundReplay({ roundId, players, crowningWord }: { roundId: string; players: ReplayPlayer[]; crowningWord: string }) {
  const [state, setState] = useState<'idle' | 'playing' | 'failed'>('idle');
  // null fram till mount: WebGL och reduced motion finns bara i webbläsaren.
  const [capable, setCapable] = useState<boolean | null>(null);
  const audio = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);

  useEffect(() => { setCapable(hasWebGL() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => () => { void audio.current?.ctx.close().catch(() => {}); }, []);
  useEffect(() => {
    if (state !== 'playing') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setState('idle'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  // Ljudet måste startas i själva klicket, annars släpper webbläsaren inte fram det.
  function play() {
    if (!audio.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
        audio.current = { ctx, master };
      }
    }
    void audio.current?.ctx.resume();
    setState('playing');
  }
  const onCue = useCallback((cue: CueName) => { if (audio.current) playCueSound(audio.current.ctx, audio.current.master, cue); }, []);

  if (capable === false) return <p className='replay-note'>Reprisen spelas i 3D. Den kräver WebGL och visas inte när rörelser är avstängda — placeringen står ovanför.</p>;
  return (
    <>
      <button type='button' className='replay-play' onClick={play} disabled={!capable || state === 'playing'}>▶ Spela rundan</button>
      {state === 'failed' && <p className='replay-note'>3D-vyn tappade kontakten med grafikkortet. Placeringen står ovanför.</p>}
      {state === 'playing' && (
        <>
          <RundanShow players={players} seed={hash(roundId)} crowningWord={crowningWord} onDone={() => setState('idle')} onCue={onCue} onFail={() => setState('failed')} />
          <button type='button' className='replay-close' aria-label='Stäng reprisen' onClick={() => setState('idle')}>✕</button>
        </>
      )}
    </>
  );
}
