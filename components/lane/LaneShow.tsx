'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LaneCanvas } from './rig';
import { CLIPS } from './clips';
import { DEMO_FRAMES } from './clips/special';
import { locate } from './sequence';
import { span } from './anim';
import type { CameraPose, ClipCtx, ClipKey, CueName, Word } from './types';

const WIDE: CameraPose = { position: [0, 3.2, 7], lookAt: [0, 1, -12], fov: 48 };
const TAIL = 0.5;

/** Klockan: sekunder sedan start, eller fryst vid frozenT (för stillbilder i demoläget). */
function useClock(frozenT?: number) {
  const [t, setT] = useState(frozenT ?? 0);
  useEffect(() => {
    if (frozenT !== undefined) { setT(frozenT); return; }
    let raf = 0;
    const start = performance.now();
    const tick = () => { setT((performance.now() - start) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [frozenT]);
  return t;
}

/** Protokollet ovanför banan: rutorna fylls i takt med säsongen, sen frågan alla bowlinghallar ställer. */
function Scoreboard({ local, frames, name }: { local: number; frames: string[]; name: string }) {
  const shown = frames.filter((_, i) => local >= 0.4 + i * 0.45);
  const total = local >= 5.3;
  const over = local >= 5.8;
  return (
    <div className='lane-scoreboard' role='img' aria-label='Poängprotokoll'>
      <div className='lane-scoreboard-head'><span>BANA 1</span><span>{name}</span></div>
      <div className='lane-scoreboard-frames'>
        {frames.map((f, i) => (
          <div key={i} className={`lane-frame${i < shown.length ? ' is-on' : ''}`}><span className='lane-frame-n'>{i + 1}</span><span className='lane-frame-v'>{i < shown.length ? f : ''}</span></div>
        ))}
        <div className={`lane-frame lane-frame-total${total ? ' is-on' : ''}`}><span className='lane-frame-n'>TOT</span><span className='lane-frame-v'>{total ? '300' : ''}</span></div>
      </div>
      {over && <p className='lane-scoreboard-over'>GAME OVER — NEW GAME?</p>}
    </div>
  );
}

export function LaneShow({ ctx, sequence, onDone, onCue, onFail, frozenT }: { ctx: ClipCtx; sequence: ClipKey[]; onDone?: () => void; onCue?: (cue: CueName) => void; onFail?: () => void; frozenT?: number }) {
  const clips = useMemo(() => sequence.map((k) => CLIPS[k]), [sequence]);
  const t = useClock(frozenT);
  const { clip, local, index, total } = locate(clips, t);
  const poseRef = useRef<CameraPose>(WIDE);
  const fired = useRef(new Set<string>());
  const done = useRef(false);

  // Scenen och kameran lever i klippets förvrängda tid (hit-stop, ultrarapid); HUD och cues i verklig.
  const scene = clip ? (clip.warp ? clip.warp(local) : local) : 0;
  if (clip) poseRef.current = clip.camera(scene, ctx);

  useEffect(() => {
    if (!clip || !onCue) return;
    for (const c of clip.cues ?? []) {
      const id = `${index}:${c.at}`;
      if (local >= c.at && !fired.current.has(id)) { fired.current.add(id); onCue(c.cue); }
    }
  }, [clip, index, local, onCue]);

  useEffect(() => {
    if (frozenT !== undefined || done.current || t < total + TAIL) return;
    done.current = true;
    onDone?.();
  }, [t, total, onDone, frozenT]);

  const words = clip ? clip.words(ctx) : [];
  const fade = clip ? 1 - span(local, clip.duration - 0.25, clip.duration) : 0;

  return (
    <div className='lane-overlay' style={{ opacity: clip ? 0.35 + 0.65 * fade : 0 }}>
      <LaneCanvas cosmic={ctx.cosmic} poseRef={poseRef} onContextLost={onFail}>
        {clip && <clip.Scene t={scene} ctx={ctx} />}
      </LaneCanvas>
      <div className={`lane-words${ctx.cosmic ? ' is-cosmic' : ''}`} aria-live='polite'>
        {words.filter((w) => local >= w.at).map((w) => (
          <div key={`${index}:${w.at}:${w.text}`} className={`lane-word lane-word-${w.style ?? 'slam'}`} style={{ '--size': `${w.size ?? 2}`, ...(w.color ? { '--word': w.color } : {}) } as React.CSSProperties}>{w.text}</div>
        ))}
      </div>
      {clip?.key === 'scoreboard' && <Scoreboard local={local} frames={ctx.frames ?? DEMO_FRAMES} name={ctx.winner} />}
    </div>
  );
}
