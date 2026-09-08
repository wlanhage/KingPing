'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StageCanvas } from './Stage';
import { SCENES } from './scenes';
import { locate } from './sequence';
import type { CameraPose, CueName, SceneCtx, SceneKey } from './types';

const REST: CameraPose = { position: [0.8, 1.4, -1.5], lookAt: [0, 1, -6], fov: 40 };
const TAIL = 0.4;

/** Klockan: sekunder sedan start, eller fryst vid frozenT (stillbilder i demoläget). */
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

export function StageShow({ ctx, sequence, onDone, onCue, onFail, frozenT }: { ctx: SceneCtx; sequence: SceneKey[]; onDone?: () => void; onCue?: (cue: CueName) => void; onFail?: () => void; frozenT?: number }) {
  const scenes = useMemo(() => sequence.map((k) => SCENES[k]), [sequence]);
  const t = useClock(frozenT);
  const { item: scene, local, index, total } = locate(scenes, t);
  const poseRef = useRef<CameraPose>(REST);
  const fired = useRef(new Set<string>());
  const done = useRef(false);

  // Kameran och scenen lever i scenens (eventuellt förvrängda) tid; ord och cues i verklig.
  const sceneT = scene ? (scene.warp ? scene.warp(local) : local) : 0;
  if (scene) poseRef.current = scene.camera(sceneT, ctx);

  useEffect(() => {
    if (!scene || !onCue) return;
    for (const c of scene.cues ?? []) {
      const id = `${index}:${c.at}`;
      if (local >= c.at && !fired.current.has(id)) { fired.current.add(id); onCue(c.cue); }
    }
  }, [scene, index, local, onCue]);

  useEffect(() => {
    if (frozenT !== undefined || done.current || t < total + TAIL) return;
    done.current = true;
    onDone?.();
  }, [t, total, onDone, frozenT]);

  const words = scene ? scene.words(ctx).filter((w) => local >= w.at && (w.until === undefined || local < w.until)) : [];
  const black = scene ? (scene.fade?.(local) ?? 0) : 1;

  return (
    <div className='stage-overlay'>
      <StageCanvas poseRef={poseRef} onContextLost={onFail}>
        {scene && <scene.Scene t={sceneT} ctx={ctx} />}
      </StageCanvas>
      <div className='stage-black' style={{ opacity: black }} />
      <div className='stage-words' aria-live='polite'>
        {words.map((w) => (
          <div key={`${index}:${w.at}:${w.text}`} className={`stage-word stage-word-${w.style ?? 'slam'}`} style={{ '--size': `${w.size ?? 2}`, ...(w.color ? { '--word': w.color } : {}) } as React.CSSProperties}>{w.text}</div>
        ))}
      </div>
    </div>
  );
}
