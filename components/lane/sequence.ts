import type { ClipKey } from './types';

/** Det LaneShow behöver veta om kröningen. Samma fält som CoronationEvent, utan React. */
export type LaneEvent = {
  eventType: string;
  winnerName: string;
  deposedName: string | null;
  streakCount: number;
  previousStreakCount: number;
  isNewRuler: boolean;
  isFriday: boolean;
  daysSinceLastWin: number | null;
};

const pick = <T,>(items: T[], rand: () => number): T => items[Math.floor(rand() * items.length) % items.length];

/**
 * Vilka klipp en händelse får. Försvar ger ett klipp efter streaken; en ny regent får ett
 * kröningsklipp och, om någon störtades, ett klipp om den störtade — grövre ju längre svit som bröts.
 */
export function sequenceFor(ev: LaneEvent, rand: () => number = Math.random): ClipKey[] {
  if (!ev.isNewRuler) {
    const s = ev.streakCount;
    return [s >= 5 ? 'statues' : s === 4 ? 'hammer' : s === 3 ? 'turkey' : 'spare'];
  }
  const crowning: ClipKey = ev.eventType === 'FIRST_WIN' ? 'bumper' : ev.eventType === 'COMEBACK' ? 'dusty' : pick<ClipKey>(['strike', 'slowmo', 'jackpot', 'redcarpet'], rand);
  if (!ev.deposedName) return [crowning];
  const p = ev.previousStreakCount;
  const deposed: ClipKey = p >= 5 ? 'split' : p >= 3 ? 'sweeper' : pick<ClipKey>(['gutter', 'crownflies'], rand);
  return [crowning, deposed];
}

/** Var i sekvensen tiden t befinner sig. */
export function locate<T extends { duration: number }>(clips: T[], t: number): { index: number; local: number; clip: T | null; total: number } {
  let acc = 0;
  for (let i = 0; i < clips.length; i++) {
    if (t < acc + clips[i].duration) return { index: i, local: t - acc, clip: clips[i], total: clips.reduce((a, c) => a + c.duration, 0) };
    acc += clips[i].duration;
  }
  return { index: clips.length, local: 0, clip: null, total: acc };
}
