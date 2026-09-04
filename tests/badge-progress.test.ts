import { describe, expect, it } from 'vitest';
import { nextBadges } from '../lib/badges/badge-progress';
import type { PlayerStats } from '../lib/badges/badge-types';

const stats = (o: Partial<PlayerStats>): PlayerStats => ({
  playerId: 'p', totalWins: 0, totalReignMs: 0, longestReignMs: 0, currentReignMs: 0, currentStreak: 0, longestStreak: 0, fridayWins: 0,
  winsLast30Days: 0, winsLast7Days: 0, daysSinceLastWin: null, daysSincePreviousWin: null, streaksBroken: 0, biggestStreakBroken: 0,
  takeoverWins: 0, timesDethroned: 0, averageReignMs: 0, crownEfficiencyMsPerWin: 0, isCurrentKing: false, winsByWeekday: [0, 0, 0, 0, 0, 0, 0], earlyWins: 0, lunchWins: 0, lateWins: 0, maxWinsInOneDay: 0, firstWinAt: null, reignCount: 0, distinctVictims: 0, previousSeasonWins: null, maxNetTakeovers: 0, dominatedRivalId: null, ...o,
});

describe('nextBadges', () => {
  it('kronor-trappan: 12 vinster pekar på 25, inte 10 eller 50', () => {
    const ids = nextBadges(stats({ totalWins: 12 }), 10).map((p) => p.definition.id);
    expect(ids).toContain('twentyfive_crowns');
    expect(ids).not.toContain('ten_crowns');
    expect(ids).not.toContain('fifty_crowns');
  });
  it('visar bara nästa steg i en ladder', () => {
    const ids = nextBadges(stats({ longestStreak: 3 })).map((p) => p.definition.id);
    expect(ids).toContain('hr_case');
    expect(ids).not.toContain('tyrant');
    expect(ids).not.toContain('dynasty_founder');
  });
  it('hoppar över spår på noll och redan uppnådda', () => {
    expect(nextBadges(stats({}))).toEqual([]);
    expect(nextBadges(stats({ fridayWins: 3 })).map((p) => p.definition.id)).not.toContain('prime_time_player');
  });
  it('närmast först, max tre', () => {
    const r = nextBadges(stats({ longestStreak: 2, fridayWins: 2, biggestStreakBroken: 1, takeoverWins: 1, timesDethroned: 1 }));
    expect(r).toHaveLength(3);
    expect(r[0].current / r[0].target).toBeCloseTo(2 / 3);
    expect(r.map((p) => p.current / p.target)).toEqual([...r.map((p) => p.current / p.target)].sort((a, b) => b - a));
  });
});
