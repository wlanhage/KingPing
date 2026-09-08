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
  returningStreak: boolean;
  beatRival: boolean;
};

/**
 * Vilka scener en händelse får. Tom lista = ingen 3D-scen, den klassiska ceremonin visas.
 * Försvar: exakt tre raka ger rådssalen (Order 66).
 * Störtande: den störtades svit väger tyngst — 4 eller fler ger Dödsstjärnan, 2–3 Mustafar.
 * Annars: Vaders entré när vinnaren tar tillbaka kronan efter en tappad svit, Cloud City när
 * vinnaren slår sin ärkefiende. Gäller båda singlas slant.
 */
export function sequenceFor(ev: StageEvent, rand: () => number = Math.random): SceneKey[] {
  if (!ev.isNewRuler) return ev.streakCount === 3 ? ['temple'] : [];
  if (!ev.deposedName) return [];
  if (ev.previousStreakCount >= 4) return ['deathstar'];
  if (ev.previousStreakCount >= 2) return ['mustafar'];
  if (ev.returningStreak && ev.beatRival) return [rand() < 0.5 ? 'tantive' : 'cloudcity'];
  if (ev.returningStreak) return ['tantive'];
  if (ev.beatRival) return ['cloudcity'];
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
