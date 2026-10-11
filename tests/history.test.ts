import { expect, it } from 'vitest';
import { historyFilters, historyWhere, historyHref } from '../lib/domain/history';
const players = [{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Björn' }];
const season = { startedAt: new Date('2026-09-01'), endedAt: new Date('2026-10-01') };
it('normalizes search and page while refusing an unknown player', () => {
  expect(historyFilters({ q: '  Final  ', player: 'ghost', page: '-1' }, players)).toEqual({ q: 'Final', player: '', page: 1 });
  expect(historyFilters({ page: '3' }, players).page).toBe(3);
  expect(historyFilters({ page: '1.5' }, players).page).toBe(1);
});
it('filters by recorded participation, never assumed opposition to the previous king', () => {
  expect(historyWhere(season, { q: '', player: 'b', page: 1 }, players)).toEqual({
    occurredAt: { gte: season.startedAt, lt: season.endedAt }, AND: [{ OR: [{ winnerId: 'b' }, { standings: { has: 'b' } }] }],
  });
});
it('searches player names, notes and announcements within the selected season', () => {
  const where = historyWhere(season, { q: 'ANNA', player: 'b', page: 1 }, players);
  expect(where.AND).toHaveLength(2);
  expect(where.AND[1]).toEqual({ OR: [
    { note: { contains: 'ANNA', mode: 'insensitive' } },
    { announcementText: { contains: 'ANNA', mode: 'insensitive' } },
    { winnerId: { in: ['a'] } }, { standings: { hasSome: ['a'] } },
  ] });
});
it('preserves search, player and season when paging or switching view', () => {
  const url = new URL(historyHref({ q: 'Final & vinst', player: 'a', page: 2, season: 's1' }), 'https://test.local');
  expect(Object.fromEntries(url.searchParams)).toEqual({ q: 'Final & vinst', player: 'a', page: '2', season: 's1' });
  expect(historyHref({ view: 'crawl' })).toBe('/history?view=crawl');
});
