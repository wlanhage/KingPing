import type { SceneKey } from './types';

/** Det scenen behöver veta om kröningen. Samma fält som CoronationEvent, utan React. */
export type StageEvent = {
  eventType: string;
  winnerName: string;
  deposedName: string | null;
  streakCount: number;
  previousStreakCount: number;
  isNewRuler: boolean;
  isFriday: boolean;
  daysSinceLastWin: number | null;
};

/**
 * Vilka scener en händelse får. Tom lista = ingen 3D-scen, den klassiska ceremonin visas.
 * Tre raka eller fler: rådssalen, strax före Order 66.
 * Någon störtar en mästare: fem raka eller mer bruten ger Dödsstjärnan, tre–fyra ger Mustafar,
 * annars slumpas Cloud City eller Vaders entré.
 */
export function sequenceFor(ev: StageEvent, rand: () => number = Math.random): SceneKey[] {
  if (!ev.isNewRuler && ev.streakCount >= 3) return ['temple'];
  if (ev.isNewRuler && ev.deposedName) {
    if (ev.previousStreakCount >= 5) return ['deathstar'];
    if (ev.previousStreakCount >= 3) return ['mustafar'];
    return [rand() < 0.5 ? 'cloudcity' : 'tantive'];
  }
  return [];
}

/** Var i sekvensen tiden t befinner sig. */
export function locate<T extends { duration: number }>(items: T[], t: number): { index: number; local: number; item: T | null; total: number } {
  const total = items.reduce((a, c) => a + c.duration, 0);
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    if (t < acc + items[i].duration) return { index: i, local: t - acc, item: items[i], total };
    acc += items[i].duration;
  }
  return { index: items.length, local: 0, item: null, total };
}
