'use client';
import { useMemo } from 'react';
import { assignCharacters } from '@/lib/domain/heraldry';
import { StageShow } from './StageShow';
import { rundanScene, type Cast } from './scenes/rundan';
import { PALETTE, planRound } from './rundan';
import type { CueName, SceneCtx } from './types';

export type ReplayPlayer = { id: string; name: string; createdAt: string };

/**
 * Reprisen i StageShow. Egen fil för att sidan ska kunna ladda den med next/dynamic — allt three.js
 * hänger på den här importen. Färgerna delas ut som figurerna: ingen i rundan delar färg med någon annan.
 */
export function RundanShow({ players, seed, crowningWord, onDone, onCue, onFail }: { players: ReplayPlayer[]; seed: number; crowningWord: string; onDone: () => void; onCue: (cue: CueName) => void; onFail: () => void }) {
  const scenes = useMemo(() => {
    const colour = assignCharacters(players, PALETTE.length);
    const cast: Cast = Object.fromEntries(players.map((p) => [p.id, { name: p.name, color: PALETTE[colour[p.id]] }]));
    return [rundanScene(planRound(players.map((p) => p.id), seed), cast)];
  }, [players, seed]);
  const ctx: SceneCtx = { winner: players[0].name, deposed: null, streak: 1, previousStreak: 0, days: null, cosmic: false, crowningWord, tyrannyWord: '' };
  return <StageShow ctx={ctx} scenes={scenes} onDone={onDone} onCue={onCue} onFail={onFail} />;
}
