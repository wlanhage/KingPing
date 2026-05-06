import { describe, expect, it } from 'vitest';
import { getPlayerBadges } from '../lib/badges/badge-engine';
import type { PlayerBadgeContext, PlayerStats } from '../lib/badges/badge-types';

const p = (id: string, o: Partial<PlayerStats>): PlayerStats => ({ playerId: id, totalWins: 0, totalReignMs: 0, longestReignMs: 0, currentReignMs: 0, currentStreak: 0, longestStreak: 0, fridayWins: 0, winsLast30Days: 0, winsLast7Days: 0, daysSinceLastWin: null, streaksBroken: 0, biggestStreakBroken: 0, takeoverWins: 0, timesDethroned: 0, averageReignMs: 0, crownEfficiencyMsPerWin: 0, isCurrentKing: false, ...o });
const ctx = (players: PlayerStats[]): PlayerBadgeContext => ({ playerStats: Object.fromEntries(players.map((x) => [x.playerId, x])), globalStats: { maxTotalReignMs: Math.max(...players.map((x) => x.totalReignMs), 0), maxTotalWins: Math.max(...players.map((x) => x.totalWins), 0), maxLongestStreak: Math.max(...players.map((x) => x.longestStreak), 0), maxFridayWins: Math.max(...players.map((x) => x.fridayWins), 0), maxWinsLast30Days: Math.max(...players.map((x) => x.winsLast30Days), 0), maxStreaksBroken: Math.max(...players.map((x) => x.streaksBroken), 0), maxBiggestStreakBroken: Math.max(...players.map((x) => x.biggestStreakBroken), 0), maxCrownEfficiencyMsPerWin: Math.max(...players.map((x) => x.crownEfficiencyMsPerWin), 0), currentKingId: players.find((x) => x.isCurrentKing)?.playerId ?? null } });

describe('badge engine', () => {
  it('current king gets current king badge', () => {
    const res = getPlayerBadges('a', ctx([p('a', { isCurrentKing: true }), p('b', {})]));
    expect(res.some((b) => b.id === 'current_king')).toBe(true);
  });
  it('highest friday wins gets friday champion', () => {
    const res = getPlayerBadges('a', ctx([p('a', { fridayWins: 5 }), p('b', { fridayWins: 1 })]));
    expect(res.some((b) => b.id === 'friday_champion')).toBe(true);
  });
  it('5+ streak gets tyrant', () => {
    const res = getPlayerBadges('a', ctx([p('a', { longestStreak: 5 })]));
    expect(res.some((b) => b.id === 'tyrant')).toBe(true);
  });
  it('14+ days without win gets cold', () => {
    const res = getPlayerBadges('a', ctx([p('a', { daysSinceLastWin: 14 })]));
    expect(res.some((b) => b.id === 'cold')).toBe(true);
  });
  it('most wins last 30 days gets recent champion', () => {
    const res = getPlayerBadges('a', ctx([p('a', { winsLast30Days: 4 }), p('b', { winsLast30Days: 2 })]));
    expect(res.some((b) => b.id === 'recent_champion')).toBe(true);
  });
  it('returns no duplicate badge ids', () => {
    const res = getPlayerBadges('a', ctx([p('a', { winsLast30Days: 4, winsLast7Days: 3, isCurrentKing: true, longestStreak: 5, totalWins: 9, totalReignMs: 1000, crownEfficiencyMsPerWin: 100 })]));
    expect(new Set(res.map((b) => b.id)).size).toBe(res.length);
  });
});
