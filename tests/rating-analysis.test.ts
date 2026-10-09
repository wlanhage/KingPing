import { describe, expect, it } from 'vitest';
import { crownRatings, classicCrownRatings, crownRatingHistory } from '../lib/domain/crown-rating';
import { analyzeRatings, ratingHistoryCsv } from '../lib/domain/rating-analysis';

const roster = ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase() }));
const wins = [
  { id: '1', winnerId: 'a', previousKingId: null, occurredAt: new Date('2026-10-01T09:00:00Z'), standings: [] },
  { id: '2', winnerId: 'b', previousKingId: 'a', occurredAt: new Date('2026-10-02T09:00:00Z'), standings: ['b', 'a', 'c'] },
  { id: '3', winnerId: 'b', previousKingId: 'b', occurredAt: new Date('2026-10-03T09:00:00Z'), standings: [] },
];

describe('rating research history', () => {
  it('keeps grouped leaderboard inputs and flat report inputs equal for tied timestamps', () => {
    const at = new Date('2026-10-01T09:00:00Z');
    const tied = [
      { id: '01', winnerId: 'a', previousKingId: null, occurredAt: at },
      { id: '02', winnerId: 'b', previousKingId: 'a', occurredAt: at },
      { id: '03', winnerId: 'a', previousKingId: 'b', occurredAt: at },
    ];
    const grouped = [tied[0], tied[2], tied[1]];
    expect(crownRatings(grouped)).toEqual(crownRatings(tied));
    expect(classicCrownRatings(grouped)).toEqual(classicCrownRatings(tied));
    expect(crownRatingHistory(grouped)).toEqual(crownRatingHistory(tied));
  });
  it('replays both models in chronological order with exact final table parity', () => {
    const history = crownRatingHistory([...wins].reverse());
    expect(history.map((p) => p.at)).toEqual(wins.map((w) => w.occurredAt.toISOString()));
    expect(history.at(-1)?.current).toEqual(crownRatings(wins));
    expect(history.at(-1)?.classic).toEqual(classicCrownRatings(wins));
    expect(history[0].current.a.rating).toBe(1000);
    expect(history[0].current.a.played).toBe(0);
  });
  it('snapshots are independent and retain zero-change participation', () => {
    const history = crownRatingHistory(wins);
    expect(history[1].current.a).toEqual({ rating: 1000, played: 1 });
    expect(history[1].current.b.rating).toBe(1016);
    expect(history[2].current.b.rating).toBeGreaterThan(1016);
  });
  it('uses historical AFK exclusions in the exact same way as the leaderboard', () => {
    const afk = (id: string) => id === 'c';
    expect(crownRatingHistory(wins, afk).at(-1)?.current).toEqual(crownRatings(wins, afk));
  });
  it('distinguishes missing participation from zero change and computes sample volatility', () => {
    const history = crownRatingHistory(wins);
    const rows = analyzeRatings(roster, history, 'current');
    const a = rows.find((p) => p.id === 'a')!;
    const b = rows.find((p) => p.id === 'b')!;
    expect(a.changes).toEqual([null, 0, null]);
    expect(a.volatility).toBeNull();
    expect(b.changes[0]).toBeNull();
    expect(b.momentum).toBeCloseTo(b.rating - 1000);
    expect(b.volatility).toBeGreaterThan(0);
    expect(b.peak).toBe(b.rating);
    expect(b.drawdown).toBe(0);
  });
  it('keeps unrated roster members unobserved and handles empty data', () => {
    const rows = analyzeRatings(roster, [], 'current');
    expect(rows.every((r) => r.played === 0 && r.volatility === null && r.changes.length === 0)).toBe(true);
    expect(crownRatingHistory([])).toEqual([]);
    const classic = analyzeRatings(roster, crownRatingHistory(wins), 'classic');
    expect(classic.find((r) => r.id === 'c')?.played).toBe(0);
  });
  it('measures maximum peak-to-trough drawdown, including the baseline', () => {
    const history = crownRatingHistory([{ ...wins[1], standings: ['a', 'b', 'c'] }]);
    const c = analyzeRatings(roster, history, 'current').find((r) => r.id === 'c')!;
    expect(c.drawdown).toBe(16);
    expect(c.peak).toBe(1000);
    expect(c.momentum).toBe(-16);
  });
  it('limits momentum to the latest five observed rounds, skipping gaps', () => {
    const rounds = Array.from({ length: 8 }, (_, i) => ({ ...wins[0], occurredAt: new Date(Date.UTC(2026, 9, i + 1)), previousKingId: 'a' }));
    const r = analyzeRatings(roster, crownRatingHistory(rounds), 'current')[0];
    expect(r.momentum).toBeCloseTo(r.rating - r.trajectory[3]);
    expect(r.momentum).toBeLessThan(r.rating - 1000);
  });
  it('exports real numeric negative changes, quoted names, and blank unobserved results', () => {
    const csv = ratingHistoryCsv([{ id: 'c', name: 'C, "test"' }], crownRatingHistory(wins), 'current');
    expect(csv).toContain('"C, ""test"""');
    expect(csv).toContain('"984","-16","1"');
    expect(csv).toContain('"1000","","0"');
    expect(csv.split('\r\n')).toHaveLength(4);
  });
  it('neutralizes spreadsheet formulas in player names', () => {
    const csv = ratingHistoryCsv([{ id: 'a', name: '=HYPERLINK("test")' }], crownRatingHistory(wins), 'classic');
    expect(csv).toContain('"\'=HYPERLINK(""test"")"');
  });
});
