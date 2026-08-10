import { describe, expect, it } from 'vitest';
import { getPlayerBadges } from '../lib/badges/badge-engine';
import type { PlayerBadgeContext, PlayerStats } from '../lib/badges/badge-types';

const p = (id: string, o: Partial<PlayerStats>): PlayerStats => ({ playerId: id, totalWins: 0, totalReignMs: 0, longestReignMs: 0, currentReignMs: 0, currentStreak: 0, longestStreak: 0, fridayWins: 0, winsLast30Days: 0, winsLast7Days: 0, daysSinceLastWin: null, daysSincePreviousWin: null, streaksBroken: 0, biggestStreakBroken: 0, takeoverWins: 0, timesDethroned: 0, averageReignMs: 0, crownEfficiencyMsPerWin: 0, isCurrentKing: false, ...o });
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

const ids = (res: { id: string }[]) => res.map((b) => b.id);
const HOUR = 60 * 60 * 1000;

describe('badge ladders', () => {
  it('7 streak ger bara högsta steget, inte alla fyra', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { longestStreak: 7 })])));
    expect(res).toContain('state_owned');
    expect(res).not.toContain('tyrant');
    expect(res).not.toContain('hr_case');
    expect(res).not.toContain('dynasty_founder');
  });

  it('4 streak ger HR-ärende men inte Dynastigrundaren', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { longestStreak: 4 })])));
    expect(res).toContain('hr_case');
    expect(res).not.toContain('dynasty_founder');
  });

  it('3 streak ger fortfarande Dynastigrundaren', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { longestStreak: 3 })])));
    expect(res).toContain('dynasty_founder');
  });

  it('brutit 5-streak ger Tyrannfällaren, inte Revolutionären', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { biggestStreakBroken: 5 })])));
    expect(res).toContain('tyrant_slayer');
    expect(res).not.toContain('revolutionary');
  });

  it('3 vinster senaste veckan ger Momentum, inte Het just nu', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { winsLast7Days: 3 })])));
    expect(res).toContain('momentum');
    expect(res).not.toContain('hot_right_now');
  });

  it('inaktiv med historik ger exakt en inactivity-badge', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { daysSinceLastWin: 40, totalWins: 6, totalReignMs: 10 * HOUR })])));
    const inactivity = res.filter((id) => ['cold', 'frozen', 'lost_heir', 'historically_relevant'].includes(id));
    expect(inactivity).toHaveLength(1);
  });

  it('korta regeringar med flera störtanden ger Kronan var lånad, inte Kort mandatperiod', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { averageReignMs: 1 * HOUR, timesDethroned: 3 })])));
    expect(res).toContain('borrowed_crown');
    expect(res).not.toContain('short_reign_specialist');
  });

  it('Tronsförsvararen visas parallellt med Nuvarande kung', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { isCurrentKing: true, currentStreak: 2 })])));
    expect(res).toContain('current_king');
    expect(res).toContain('defender_of_the_throne');
  });

  it('spelare utan trontid får inte Historiskt relevant (och tappar därför inte Kylig)', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { daysSinceLastWin: 14 })])));
    expect(res).not.toContain('historically_relevant');
    expect(res).toContain('cold');
  });

  it('Statistiskt osannolik visas parallellt med Kort mandatperiod', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { totalWins: 2, totalReignMs: 1 * HOUR, averageReignMs: 1 * HOUR })])));
    expect(res).toContain('statistically_unlikely');
    expect(res).toContain('short_reign_specialist');
  });
});

describe('time_traveler', () => {
  it('tänds när spelaren vann nyligen efter långt uppehåll', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { totalWins: 5, daysSinceLastWin: 1, daysSincePreviousWin: 90 })])));
    expect(res).toContain('time_traveler');
  });

  it('tänds inte utan föregående uppehåll', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { totalWins: 5, daysSinceLastWin: 1, daysSincePreviousWin: 3 })])));
    expect(res).not.toContain('time_traveler');
  });

  it('tänds inte för en spelare som varit borta länge utan att komma tillbaka', () => {
    const res = ids(getPlayerBadges('a', ctx([p('a', { totalWins: 5, daysSinceLastWin: 90, daysSincePreviousWin: 120 })])));
    expect(res).not.toContain('time_traveler');
  });
});
