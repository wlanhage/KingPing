'use client';
import { useState } from 'react';
import { LaneShow } from './LaneShow';
import { CLIP_KEYS } from './clips';
import type { ClipCtx, ClipKey } from './types';

const LABEL: Record<ClipKey, string> = {
  strike: 'Strike', slowmo: 'Ultrarapid', jackpot: 'Jackpot', redcarpet: 'Röda mattan',
  spare: 'Spare', turkey: 'Turkey', hammer: 'Hammaren', statues: 'Statyhallen',
  gutter: 'Gutter', crownflies: 'Kronan flyger', split: 'Splitten', sweeper: 'Bansoparen',
  bumper: 'Bumper', dusty: 'Dammiga bollen', scoreboard: 'Protokollet',
};
const STREAK: Partial<Record<ClipKey, number>> = { spare: 2, turkey: 3, hammer: 4, statues: 6 };
const PREV: Partial<Record<ClipKey, number>> = { split: 5, sweeper: 3 };

/** Lokal förhandsvisning: /?demo=strike[&t=2.5][&cosmic=1]. Klippet loopar; knapparna byter. */
export function LaneDemo({ clip, t, cosmic: cosmicInit, words }: { clip: string; t?: number; cosmic?: boolean; words: { crowning: string; tyranny: string } }) {
  const [key, setKey] = useState<ClipKey | 'all'>(CLIP_KEYS.includes(clip as ClipKey) ? (clip as ClipKey) : 'all');
  const [cosmic, setCosmic] = useState(!!cosmicInit);
  const [run, setRun] = useState(0);
  const sequence: ClipKey[] = key === 'all' ? ['strike', 'gutter'] : [key];
  const ctx: ClipCtx = {
    winner: 'Axel', deposed: 'Lanhage', streak: key === 'all' ? 1 : STREAK[key] ?? 1, previousStreak: key === 'all' ? 2 : PREV[key] ?? 0,
    days: 42, cosmic, crowningWord: words.crowning, tyrannyWord: words.tyranny,
  };
  return (
    <>
      <LaneShow key={`${key}:${cosmic}:${run}`} ctx={ctx} sequence={sequence} frozenT={t} onDone={() => setRun((r) => r + 1)} />
      <div className='lane-demo-bar'>
        {(['all', ...CLIP_KEYS] as (ClipKey | 'all')[]).map((k) => (
          <button key={k} type='button' className={`lane-demo-btn${k === key ? ' is-on' : ''}`} onClick={() => { setKey(k); setRun((r) => r + 1); }}>{k === 'all' ? 'Strike + Gutter' : LABEL[k]}</button>
        ))}
        <button type='button' className={`lane-demo-btn lane-demo-cosmic${cosmic ? ' is-on' : ''}`} onClick={() => setCosmic((c) => !c)}>🪩 Cosmic</button>
      </div>
    </>
  );
}
