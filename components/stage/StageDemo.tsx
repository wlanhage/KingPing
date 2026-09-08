'use client';
import { useState } from 'react';
import { StageShow } from './StageShow';
import { SCENE_KEYS } from './scenes';
import type { SceneCtx, SceneKey } from './types';

const LABEL: Record<SceneKey, string> = { temple: 'Rådssalen (Order 66)', mustafar: 'Mustafar (höjdövertaget)', cloudcity: 'Cloud City (jag är din far)', tantive: 'Tantive IV (Vaders entré)', deathstar: 'Dödsstjärnan' };
const STREAK: Partial<Record<SceneKey, number>> = { temple: 3, mustafar: 1, deathstar: 4 };
const PREV: Partial<Record<SceneKey, number>> = { mustafar: 4, deathstar: 3, cloudcity: 1, tantive: 2 };

/** Lokal förhandsvisning: /?demo=temple[&t=6.1]. Scenen loopar; knapparna byter. */
export function StageDemo({ scene, t, words }: { scene: string; t?: number; words: { crowning: string; tyranny: string } }) {
  const [key, setKey] = useState<SceneKey>(SCENE_KEYS.includes(scene as SceneKey) ? (scene as SceneKey) : SCENE_KEYS[0]);
  const [run, setRun] = useState(0);
  const ctx: SceneCtx = { winner: 'Axel', deposed: 'Lanhage', streak: STREAK[key] ?? 1, previousStreak: PREV[key] ?? 0, days: 42, cosmic: false, crowningWord: words.crowning, tyrannyWord: words.tyranny };
  return (
    <>
      <StageShow key={`${key}:${run}`} ctx={ctx} sequence={[key]} frozenT={t} onDone={() => setRun((r) => r + 1)} />
      <div className='stage-demo-bar'>
        {SCENE_KEYS.map((k) => (
          <button key={k} type='button' className={`stage-demo-btn${k === key ? ' is-on' : ''}`} onClick={() => { setKey(k); setRun((r) => r + 1); }}>{LABEL[k]}</button>
        ))}
        <button type='button' className='stage-demo-btn' onClick={() => setRun((r) => r + 1)}>↻ Spela igen</button>
      </div>
    </>
  );
}
