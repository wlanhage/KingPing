import type { ReactNode } from 'react';

export type Vec3 = [number, number, number];

export type ClipKey =
  | 'strike' | 'slowmo' | 'jackpot' | 'redcarpet'
  | 'spare' | 'turkey' | 'hammer' | 'statues'
  | 'gutter' | 'crownflies' | 'split' | 'sweeper'
  | 'bumper' | 'dusty' | 'scoreboard';

/** Det ett klipp får veta om händelsen. Orden kommer från temat så galaxen säger UPPHÖJELSE och IMPERIET. */
export type ClipCtx = {
  winner: string;
  deposed: string | null;
  streak: number;
  previousStreak: number;
  days: number | null;
  cosmic: boolean;
  crowningWord: string;
  tyrannyWord: string;
  frames?: string[];
};

export type Word = { at: number; text: string; size?: number; color?: string; y?: number; hold?: number };
export type CueName = 'hit' | 'gutter' | 'siren' | 'slam' | 'crash';
export type Cue = { at: number; cue: CueName };
export type CameraPose = { position: Vec3; lookAt: Vec3; fov?: number; shake?: number };

export type Clip = {
  key: ClipKey;
  duration: number;
  words: (ctx: ClipCtx) => Word[];
  cues?: Cue[];
  camera: (t: number, ctx: ClipCtx) => CameraPose;
  Scene: (props: { t: number; ctx: ClipCtx }) => ReactNode;
};
