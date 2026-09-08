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
 * Försvar: exakt tre raka ger rådssalen (Order 66).
 * Störtande, efter den störtades svit: 2–3 raka ger Mustafar, 4 eller fler Dödsstjärnan som
 * sprängs, annars slumpas Cloud City eller Vaders entré.
 */
export function sequenceFor(ev: StageEvent, rand: () => number = Math.random): SceneKey[] {
  if (!ev.isNewRuler) return ev.streakCount === 3 ? ['temple'] : [];
  if (!ev.deposedName) return [];
  if (ev.previousStreakCount >= 4) return ['deathstar'];
  if (ev.previousStreakCount >= 2) return ['mustafar'];
  return [rand() < 0.5 ? 'cloudcity' : 'tantive'];
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
