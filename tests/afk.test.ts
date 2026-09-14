import { describe, expect, it } from 'vitest';
import { afkSummary, isAfkAt } from '../lib/domain/afk';
import { crownRatings, K_FACTOR, START_RATING } from '../lib/domain/crown-rating';
import { rankDeltas } from '../lib/domain/rank-trend';

const DAY = 86_400_000;
const at = (day: number) => new Date(Date.parse('2026-09-01T09:00:00Z') + day * DAY);

describe('isAfkAt', () => {
  const periods = [{ startedAt: at(2), endedAt: at(5) }, { startedAt: at(10), endedAt: null }];
  it('AFK inom en period, aktiv före, mellan och efter', () => {
    expect(isAfkAt(periods, at(1))).toBe(false);
    expect(isAfkAt(periods, at(3))).toBe(true);
    expect(isAfkAt(periods, at(5))).toBe(false);
    expect(isAfkAt(periods, at(7))).toBe(false);
  });
  it('en öppen period gäller ända fram till nu', () => {
    expect(isAfkAt(periods, at(40))).toBe(true);
  });
});

describe('afkSummary', () => {
  it('räknar gånger, sammanlagd och längsta frånvaro, och hur länge den pågående varat', () => {
    const periods = [{ startedAt: at(0), endedAt: at(10) }, { startedAt: at(20), endedAt: null }];
    expect(afkSummary(periods, at(23))).toEqual({ times: 2, totalDays: 13, longestDays: 10, currentDays: 3 });
  });
  it('utan pågående period är currentDays null', () => {
    expect(afkSummary([{ startedAt: at(0), endedAt: at(4) }], at(30)).currentDays).toBeNull();
    expect(afkSummary([], at(30))).toEqual({ times: 0, totalDays: 0, longestDays: 0, currentDays: null });
  });
});

describe('kronrating med AFK', () => {
  const wins = [
    { winnerId: 'Erik', previousKingId: null, occurredAt: at(0) },
    { winnerId: 'Anna', previousKingId: 'Erik', occurredAt: at(1) },
    { winnerId: 'Anna', previousKingId: 'Anna', occurredAt: at(3) },
  ];
  const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

  it('den som är AFK vid försvaret räknas inte in i fältets snitt', () => {
    const anna = START_RATING + K_FACTOR / 2;
    const erikAfk = (id: string, when: Date) => id === 'Erik' && when >= at(2);
    // Utan Erik finns inget fält kvar, så försvaret mäts mot startvärdet i stället för Eriks sänkta rating.
    expect(crownRatings(wins, erikAfk).Anna.rating).toBeCloseTo(anna + K_FACTOR * (1 - expected(anna, START_RATING)));
    expect(crownRatings(wins).Anna.rating).toBeCloseTo(anna + K_FACTOR * (1 - expected(anna, START_RATING - K_FACTOR / 2)));
  });
});

describe('rankDeltas med AFK', () => {
  it('den som saknar placering, nu eller då, får ingen pil', () => {
    const now = [{ id: 'a', rank: 1, totalReignMs: 1 }, { id: 'b', rank: null, totalReignMs: 1 }];
    const past = [{ id: 'a', rank: null, totalReignMs: 1 }, { id: 'b', rank: 1, totalReignMs: 1 }];
    expect(rankDeltas(now, past)).toEqual({ a: null, b: null });
  });
});
