import { describe, expect, it } from 'vitest';
import { rankDeltas, trendReferenceDate } from '../lib/domain/rank-trend';

const r = (id: string, rank: number, totalReignMs = 1000) => ({ id, rank, totalReignMs });

describe('rankDeltas', () => {
  it('positivt när man klättrat, negativt när man tappat', () => {
    const now = [r('a', 1), r('b', 2), r('c', 3)];
    const past = [r('b', 1), r('a', 2), r('c', 3)];
    expect(rankDeltas(now, past)).toEqual({ a: 1, b: -1, c: 0 });
  });
  it('spelare utan trontid får null i stället för brus', () => {
    const now = [r('a', 1), r('x', 2, 0)];
    const past = [r('a', 1), r('x', 3, 0)];
    expect(rankDeltas(now, past)).toEqual({ a: 0, x: null });
  });
  it('ny spelare utan historik får null', () => {
    expect(rankDeltas([r('a', 1), r('n', 2)], [r('a', 1)])).toEqual({ a: 0, n: null });
  });
});

describe('trendReferenceDate', () => {
  const now = new Date('2026-09-04T12:00:00Z');
  it('en vecka bakåt i en pågående säsong', () => {
    expect(trendReferenceDate({ startedAt: new Date('2026-08-01'), endedAt: null }, now)).toEqual(new Date('2026-08-28T12:00:00Z'));
  });
  it('null när säsongen är yngre än en vecka', () => {
    expect(trendReferenceDate({ startedAt: new Date('2026-09-01'), endedAt: null }, now)).toBeNull();
  });
  it('avslutad säsong jämförs mot veckan före slutet', () => {
    expect(trendReferenceDate({ startedAt: new Date('2026-06-01'), endedAt: new Date('2026-08-28T00:00:00Z') }, now)).toEqual(new Date('2026-08-21T00:00:00Z'));
  });
});
