import { BADGE_BY_ID } from './badge-definitions';
import type { BadgeDefinition, PlayerStats } from './badge-types';

const DAY_MS = 86_400_000;

/**
 * Trösklar för de badges man kan "närma sig". Speglar villkoren i badge-engine —
 * ändras en tröskel där måste den ändras här. Roast-badges och "flest i riket"-badges
 * saknas medvetet: ingen jagar Nedfryst, och en relativ topp har ingen fast mållinje.
 */
const TRACKS: { id: string; target: number; unit: string; value: (s: PlayerStats) => number }[] = [
  { id: 'dynasty_founder', target: 3, unit: 'raka vinster', value: (s) => s.longestStreak },
  { id: 'hr_case', target: 4, unit: 'raka vinster', value: (s) => s.longestStreak },
  { id: 'tyrant', target: 5, unit: 'raka vinster', value: (s) => s.longestStreak },
  { id: 'state_owned', target: 7, unit: 'raka vinster', value: (s) => s.longestStreak },
  { id: 'prime_time_player', target: 3, unit: 'fredagsvinster', value: (s) => s.fridayWins },
  { id: 'hot_right_now', target: 2, unit: 'vinster senaste veckan', value: (s) => s.winsLast7Days },
  { id: 'momentum', target: 3, unit: 'vinster senaste veckan', value: (s) => s.winsLast7Days },
  { id: 'revolutionary', target: 3, unit: 'i bruten streak', value: (s) => s.biggestStreakBroken },
  { id: 'tyrant_slayer', target: 5, unit: 'i bruten streak', value: (s) => s.biggestStreakBroken },
  { id: 'chaos_agent', target: 4, unit: 'tronskiften', value: (s) => s.takeoverWins + s.timesDethroned },
  { id: 'five_crowns', target: 5, unit: 'vinster', value: (s) => s.totalWins },
  { id: 'ten_crowns', target: 10, unit: 'vinster', value: (s) => s.totalWins },
  { id: 'twentyfive_crowns', target: 25, unit: 'vinster', value: (s) => s.totalWins },
  { id: 'fifty_crowns', target: 50, unit: 'vinster', value: (s) => s.totalWins },
  { id: 'week_on_throne', target: 7, unit: 'dagar på tronen i ett svep', value: (s) => Math.floor(s.longestReignMs / DAY_MS) },
  { id: 'month_on_throne', target: 30, unit: 'dagar på tronen i ett svep', value: (s) => Math.floor(s.longestReignMs / DAY_MS) },
  { id: 'usurper', target: 5, unit: 'olika kungar störtade', value: (s) => s.distinctVictims },
  { id: 'monday_monarch', target: 3, unit: 'måndagsvinster', value: (s) => s.winsByWeekday[0] ?? 0 },
  { id: 'early_bird', target: 2, unit: 'vinster före tio', value: (s) => s.earlyWins },
  { id: 'lunch_warrior', target: 3, unit: 'lunchvinster', value: (s) => s.lunchWins },
  { id: 'overtime', target: 2, unit: 'vinster efter fem', value: (s) => s.lateWins },
  { id: 'hat_trick', target: 3, unit: 'vinster samma dag', value: (s) => s.maxWinsInOneDay },
  { id: 'all_weather', target: 5, unit: 'arbetsdagar med vinst', value: (s) => s.winsByWeekday.slice(0, 5).filter((n) => n > 0).length },
];

export type BadgeProgress = { definition: BadgeDefinition; current: number; target: number; unit: string };

/**
 * De badges spelaren är närmast att låsa upp, närmast först. Inom en ladder visas bara
 * nästa steg, och spår där spelaren står på noll hoppas över — "0 av 7" är ingen sporre.
 */
export function nextBadges(stats: PlayerStats, limit = 3): BadgeProgress[] {
  const open = TRACKS
    .map((t) => ({ definition: BADGE_BY_ID[t.id as keyof typeof BADGE_BY_ID] as BadgeDefinition, current: t.value(stats), target: t.target, unit: t.unit }))
    .filter((p) => p.current > 0 && p.current < p.target);
  const nextPerLadder = new Map<string, BadgeProgress>();
  const singles: BadgeProgress[] = [];
  for (const p of open) {
    const ladder = p.definition.ladder;
    if (!ladder) { singles.push(p); continue; }
    const prev = nextPerLadder.get(ladder);
    if (!prev || p.target < prev.target) nextPerLadder.set(ladder, p);
  }
  return [...singles, ...nextPerLadder.values()]
    .sort((a, b) => b.current / b.target - a.current / a.target || a.target - a.current - (b.target - b.current))
    .slice(0, limit);
}
