import { describe, expect, it } from 'vitest';
import { getPlayerBadges } from '../lib/badges/badge-engine';
import { dominance, winGrowth } from '../lib/badges/player-stats';
import type { PlayerBadgeContext, PlayerStats } from '../lib/badges/badge-types';

const p = (id: string, o: Partial<PlayerStats>): PlayerStats => ({ playerId: id, totalWins: 0, totalReignMs: 0, longestReignMs: 0, currentReignMs: 0, currentStreak: 0, longestStreak: 0, fridayWins: 0, winsLast30Days: 0, winsLast7Days: 0, daysSinceLastWin: null, daysSincePreviousWin: null, streaksBroken: 0, biggestStreakBroken: 0, takeoverWins: 0, timesDethroned: 0, averageReignMs: 0, crownEfficiencyMsPerWin: 0, isCurrentKing: false, winsByWeekday: [0, 0, 0, 0, 0, 0, 0], earlyWins: 0, lunchWins: 0, lateWins: 0, maxWinsInOneDay: 0, firstWinAt: null, reignCount: 0, distinctVictims: 0, previousSeasonWins: null, maxNetTakeovers: 0, dominatedRivalId: null, ...o });
const ctx = (players: PlayerStats[]): PlayerBadgeContext => ({ playerStats: Object.fromEntries(players.map((x) => [x.playerId, x])), globalStats: { maxTotalReignMs: Math.max(...players.map((x) => x.totalReignMs), 0), maxTotalWins: Math.max(...players.map((x) => x.totalWins), 0), maxLongestStreak: Math.max(...players.map((x) => x.longestStreak), 0), maxFridayWins: Math.max(...players.map((x) => x.fridayWins), 0), maxWinsLast30Days: Math.max(...players.map((x) => x.winsLast30Days), 0), maxStreaksBroken: Math.max(...players.map((x) => x.streaksBroken), 0), maxBiggestStreakBroken: Math.max(...players.map((x) => x.biggestStreakBroken), 0), maxCrownEfficiencyMsPerWin: Math.max(...players.map((x) => x.crownEfficiencyMsPerWin), 0), currentKingId: players.find((x) => x.isCurrentKing)?.playerId ?? null, earliestWinAt: earliest(players), secondTotalReignMs: [...new Set(players.map((x) => x.totalReignMs))].sort((a, b) => b - a)[1] ?? 0, maxWinGrowth: Math.max(0, ...players.map((x) => winGrowth(x) ?? 0)), winlessCount: players.filter((x) => x.totalWins === 0).length, minTotalReignMs: Math.min(...players.map((x) => x.totalReignMs)) } });
const earliest = (players: PlayerStats[]) => { const t = players.flatMap((x) => (x.firstWinAt ? [x.firstWinAt.getTime()] : [])); return t.length ? new Date(Math.min(...t)) : null; };

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

describe('nya badges', () => {
  const ids = (x: PlayerStats, others: PlayerStats[] = []) => getPlayerBadges(x.playerId, ctx([x, ...others])).map((b) => b.id);
  const DAY = 86_400_000;

  it('kronor-trappan visar bara högsta steget', () => {
    const r = ids(p('a', { totalWins: 26 }));
    expect(r).toContain('twentyfive_crowns');
    expect(r).not.toContain('ten_crowns');
    expect(r).not.toContain('fifty_crowns');
  });
  it('regeringslängd: 31 dagar ger Månadens härskare, inte veckan', () => {
    const r = ids(p('a', { longestReignMs: 31 * DAY }));
    expect(r).toContain('month_on_throne');
    expect(r).not.toContain('week_on_throne');
  });
  it('kalendern: måndagar, morgon, lunch, kväll och allväder', () => {
    const r = ids(p('a', { winsByWeekday: [3, 1, 1, 1, 1, 0, 0], earlyWins: 2, lunchWins: 3, lateWins: 2 }));
    expect(r).toEqual(expect.arrayContaining(['monday_monarch', 'early_bird', 'lunch_warrior', 'overtime', 'all_weather']));
    expect(ids(p('b', { winsByWeekday: [3, 1, 1, 1, 0, 0, 0] }))).not.toContain('all_weather');
  });
  it('hattrick kräver tre vinster samma dag', () => {
    expect(ids(p('a', { maxWinsInOneDay: 3 }))).toContain('hat_trick');
    expect(ids(p('a', { maxWinsInOneDay: 2 }))).not.toContain('hat_trick');
  });
  it('Sämst när det gäller: vunnit mån–tor men aldrig fredag, och ersätter Fredagsfobi', () => {
    const r = ids(p('a', { totalWins: 9, winsByWeekday: [2, 3, 1, 3, 0, 0, 0] }));
    expect(r).toContain('worst_when_it_counts');
    expect(r).not.toContain('friday_phobia');
    expect(ids(p('a', { winsByWeekday: [2, 3, 1, 3, 1, 0, 0] }))).not.toContain('worst_when_it_counts');
    expect(ids(p('a', { winsByWeekday: [2, 3, 0, 3, 0, 0, 0] }))).not.toContain('worst_when_it_counts');
  });
  it('Bäst när det gäller: fredag är den egna bästa dagen, strikt', () => {
    expect(ids(p('a', { winsByWeekday: [2, 1, 0, 2, 3, 0, 0] }))).toContain('best_when_it_counts');
    expect(ids(p('a', { winsByWeekday: [3, 1, 0, 2, 3, 0, 0] }))).not.toContain('best_when_it_counts'); // delad topp räcker inte
    expect(ids(p('a', { winsByWeekday: [0, 0, 0, 0, 2, 0, 0] }))).not.toContain('best_when_it_counts'); // för få fredagar
  });
  it('Hög utvecklingskurva: störst procentuell ökning, noll förra säsongen räknas som en', () => {
    const oliver = p('oliver', { totalWins: 4, previousSeasonWins: 0 });   // +400 %
    const axel = p('axel', { totalWins: 20, previousSeasonWins: 17 });     // +18 %
    const ny = p('ny', { totalWins: 9, previousSeasonWins: null });        // fanns inte förra säsongen
    expect(ids(oliver, [axel, ny])).toContain('steep_curve');
    expect(ids(axel, [oliver, ny])).not.toContain('steep_curve');
    expect(ids(ny, [oliver, axel])).not.toContain('steep_curve');
  });
  it('Hög utvecklingskurva delas inte ut utan ökning eller utan förra säsong', () => {
    expect(ids(p('a', { totalWins: 3, previousSeasonWins: 5 }), [p('b', { totalWins: 1, previousSeasonWins: 1 })])).not.toContain('steep_curve');
    expect(ids(p('a', { totalWins: 30, previousSeasonWins: null }))).not.toContain('steep_curve');
  });
  it('Jar Jar Binks: den ende utan vinst', () => {
    const oliver = p('oliver', { totalWins: 0 });
    const others = [p('a', { totalWins: 5, totalReignMs: 500 }), p('b', { totalWins: 1, totalReignMs: 10 })];
    expect(ids(oliver, others)).toContain('jar_jar');
    expect(ids(others[1], [oliver, others[0]])).not.toContain('jar_jar');
  });
  it('Jar Jar Binks: när alla vunnit går den till minst trontid', () => {
    const a = p('a', { totalWins: 5, totalReignMs: 500 });
    const b = p('b', { totalWins: 1, totalReignMs: 10 });
    const c = p('c', { totalWins: 2, totalReignMs: 90 });
    expect(ids(b, [a, c])).toContain('jar_jar');
    expect(ids(c, [a, b])).not.toContain('jar_jar');
  });
  it('Jar Jar Binks: två utan vinst ger ingen Jar Jar', () => {
    const x = p('x', { totalWins: 0 });
    const y = p('y', { totalWins: 0 });
    expect(ids(x, [y, p('a', { totalWins: 3, totalReignMs: 100 })])).not.toContain('jar_jar');
  });
  it('Överherren / Jag är din far: fem i övertag mot en och samma rival', () => {
    expect(ids(p('axel', { maxNetTakeovers: 7, dominatedRivalId: 'william' }))).toContain('overlord');
    expect(ids(p('axel', { maxNetTakeovers: 4, dominatedRivalId: 'william' }))).not.toContain('overlord');
  });
  it('Dagsländan / Stormtrooper: fem vinster, aldrig ett försvar', () => {
    expect(ids(p('a', { totalWins: 5, longestStreak: 1 }))).toContain('never_defended');
    expect(ids(p('a', { totalWins: 5, longestStreak: 2 }))).not.toContain('never_defended');
    expect(ids(p('a', { totalWins: 4, longestStreak: 1 }))).not.toContain('never_defended');
  });
  it('fredagsfobi: många vinster men ingen på fredag', () => {
    expect(ids(p('a', { totalWins: 8, fridayWins: 0 }))).toContain('friday_phobia');
    expect(ids(p('a', { totalWins: 8, fridayWins: 1 }))).not.toContain('friday_phobia');
  });
  it('Rikets förste är den med säsongens första vinst', () => {
    const a = p('a', { totalWins: 1, firstWinAt: new Date('2026-06-18T10:00:00Z') });
    const b = p('b', { totalWins: 1, firstWinAt: new Date('2026-06-19T10:00:00Z') });
    expect(ids(a, [b])).toContain('season_opener');
    expect(ids(b, [a])).not.toContain('season_opener');
  });
  it('Den evige tvåan: näst mest trontid, men inte vid delad topp', () => {
    expect(ids(p('b', { totalReignMs: 500 }), [p('a', { totalReignMs: 900 })])).toContain('eternal_second');
    expect(ids(p('b', { totalReignMs: 900 }), [p('a', { totalReignMs: 900 })])).not.toContain('eternal_second');
  });
  it('Stadig hand, Bumerangen och Usurpatorn', () => {
    expect(ids(p('a', { reignCount: 3, averageReignMs: DAY }))).toContain('steady_hand');
    expect(ids(p('a', { timesDethroned: 3, takeoverWins: 3 }))).toContain('boomerang');
    expect(ids(p('a', { timesDethroned: 3, takeoverWins: 2 }))).not.toContain('boomerang');
    expect(ids(p('a', { distinctVictims: 5, takeoverWins: 5 }))).toContain('usurper');
    expect(ids(p('a', { distinctVictims: 4, takeoverWins: 12 }))).not.toContain('usurper'); // många kronor från få offer räcker inte
  });
});

describe('dominance', () => {
  const w = (winnerId: string, previousKingId: string | null) => ({ winnerId, previousKingId });
  it('räknar nettot per rival: 10 mot 3 ger 7, inte 10', () => {
    const wins = [...Array(10)].map(() => w('axel', 'william')).concat([...Array(3)].map(() => w('william', 'axel')));
    expect(dominance(wins).axel).toEqual({ rivalId: 'william', net: 7 });
    expect(dominance(wins).william).toEqual({ rivalId: null, net: 0 });
  });
  it('försvar och tomma tronen räknas inte', () => {
    expect(dominance([w('axel', 'axel'), w('axel', null)]).axel).toEqual({ rivalId: null, net: 0 });
  });
});
