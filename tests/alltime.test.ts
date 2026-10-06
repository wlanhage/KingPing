import { describe, expect, it } from 'vitest';
import { buildAllTime } from '../lib/domain/alltime';

const d = (iso: string) => new Date(iso);
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Anna och Bo från start, Cia kommer senare. Två säsonger med gräns 3 mars.
const players = [
  { id: 'b', name: 'Bo', createdAt: d('2026-01-01'), isActive: true },
  { id: 'a', name: 'Anna', createdAt: d('2026-01-01'), isActive: true },
  { id: 'c', name: 'Cia', createdAt: d('2026-02-15'), isActive: true },
];
const win = (id: string, winnerId: string, previousKingId: string | null, at: string, streakCount: number, previousStreakCount: number) =>
  ({ id, winnerId, previousKingId, occurredAt: d(at), streakCount, previousStreakCount, standings: [] as string[] });
const wins = [
  win('1', 'a', null, '2026-03-02T10:00:00Z', 1, 0),
  win('2', 'a', 'a', '2026-03-02T11:00:00Z', 2, 1),
  win('3', 'a', 'a', '2026-03-02T12:00:00Z', 3, 2),
  win('4', 'b', 'a', '2026-03-02T13:00:00Z', 1, 3), // Bo bryter Annas tre raka
  win('5', 'c', 'b', '2026-03-04T13:00:00Z', 1, 1),
];
const reigns = [
  { playerId: 'a', startedAt: d('2026-03-02T10:00:00Z'), endedAt: d('2026-03-02T13:00:00Z') },
  { playerId: 'b', startedAt: d('2026-03-02T13:00:00Z'), endedAt: d('2026-03-04T13:00:00Z') },
  { playerId: 'c', startedAt: d('2026-03-04T13:00:00Z'), endedAt: null },
];
const seasons = [
  { id: 's1', slug: 's1', name: 'Ett', theme: 'realm', startedAt: d('2026-03-01T00:00:00Z'), endedAt: d('2026-03-03T13:00:00Z'), label: 'Säsong I', championId: 'b' },
  { id: 's2', slug: 's2', name: 'Två', theme: 'realm', startedAt: d('2026-03-03T13:00:00Z'), endedAt: null, label: 'Säsong II', championId: null },
];
const now = d('2026-03-05T13:00:00Z');
const all = buildAllTime({ players, wins, reigns, seasons, now });
const row = (id: string) => all.roster.find((p) => p.id === id)!;

describe('genom tiderna', () => {
  it('räknar trontid och kronbyten över hela historien, längst först', () => {
    expect(all.roster.map((p) => p.id)).toEqual(['b', 'c', 'a']);
    expect(row('b').throneMs).toBe(2 * DAY);
    expect(row('c').throneMs).toBe(DAY); // öppen regering räknas fram till nu
    expect(row('a')).toMatchObject({ wins: 3, takeovers: 0, longestStreak: 3, throneMs: 3 * HOUR });
    expect(all.totals).toMatchObject({ crownings: 5, takeovers: 2, monarchs: 3 });
  });

  it('färgen följer ankomstordningen, inte placeringen', () => {
    expect([row('a').slot, row('b').slot, row('c').slot]).toEqual([0, 1, 2]);
  });

  it('kapplöpningen slutar på samma trontid som tabellen', () => {
    const bo = all.race.series.find((s) => s.playerId === 'b')!;
    expect(bo.throneDays.at(-1)).toBe(2);
    expect(bo.wins.at(-1)).toBe(1);
  });

  it('säsongsandelar klampar regeringar mot säsongsgränsen', () => {
    const [s1, s2] = all.seasonGrid;
    expect(s1.cells.b.ms).toBe(DAY); // 2 mars 13 → 3 mars 13
    expect(s2.cells.b.ms).toBe(DAY); // resten av regeringen
    expect(s2.cells.a.ms).toBe(0);
  });

  it('fejder, regeringarnas vinster och rekord', () => {
    expect(all.feuds).toEqual({ b: { a: 1 }, c: { b: 1 } });
    expect(all.lanes.find((l) => l.playerId === 'a')!.wins).toBe(3);
    const rec = Object.fromEntries(all.records.map((r) => [r.key, r]));
    expect(rec.slayer).toMatchObject({ holderId: 'b', value: 'bröt 3 raka' });
    expect(rec.streak).toMatchObject({ holderId: 'a', value: '3 raka' });
    expect(rec['best-day']).toMatchObject({ holderId: 'a', value: '3 vinster' });
    expect(rec.shortest).toMatchObject({ holderId: 'a', value: '180 min' });
  });
});
