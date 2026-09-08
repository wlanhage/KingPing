import type { ReactNode } from 'react';

export type Vec3 = [number, number, number];

export type SceneKey = 'temple';

/** Det en scen får veta om händelsen. Orden kommer från temat. */
export type SceneCtx = {
  winner: string;
  deposed: string | null;
  streak: number;
  previousStreak: number;
  days: number | null;
  cosmic: boolean;
  crowningWord: string;
  tyrannyWord: string;
};

/** Ett ord i HUD-lagret, `at` i verklig tid. subtitle = undertext längst ner, slam = stort, name = namnskylt. */
export type Word = { at: number; until?: number; text: string; size?: number; color?: string; style?: 'slam' | 'name' | 'subtitle' };
export type CueName = 'ignite' | 'slam' | 'hum';
export type Cue = { at: number; cue: CueName };
/** snap = klipp (ingen mjukning), annars glider kameran mot posen. */
export type CameraPose = { position: Vec3; lookAt: Vec3; fov?: number; shake?: number; snap?: boolean };

export type Scene = {
  key: SceneKey;
  duration: number;
  words: (ctx: SceneCtx) => Word[];
  cues?: Cue[];
  /** 0 = ingen svärta, 1 = helt svart. */
  fade?: (t: number) => number;
  camera: (t: number, ctx: SceneCtx) => CameraPose;
  Scene: (props: { t: number; ctx: SceneCtx }) => ReactNode;
};
