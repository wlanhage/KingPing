import type { Prisma } from '@prisma/client';

type Player = { id: string; name: string };
export type HistoryFilters = { q: string; player: string; page: number };
export const HISTORY_PAGE_SIZE = 20;

export function historyFilters(input: { q?: string; player?: string; page?: string }, players: Player[]): HistoryFilters {
  const page = input.page && /^\d+$/.test(input.page) ? Math.max(1, Math.min(10000, Number(input.page))) : 1;
  return { q: (input.q ?? '').trim().slice(0, 100), player: players.some((p) => p.id === input.player) ? input.player! : '', page };
}

export function historyWhere(season: { startedAt: Date; endedAt: Date | null }, filters: HistoryFilters, players: Player[]) {
  const AND: Prisma.WinEventWhereInput[] = [];
  if (filters.player) AND.push({ OR: [{ winnerId: filters.player }, { standings: { has: filters.player } }] });
  if (filters.q) {
    const ids = players.filter((p) => p.name.toLocaleLowerCase('sv-SE').includes(filters.q.toLocaleLowerCase('sv-SE'))).map((p) => p.id);
    AND.push({ OR: [
      { note: { contains: filters.q, mode: 'insensitive' } },
      { announcementText: { contains: filters.q, mode: 'insensitive' } },
      { winnerId: { in: ids } }, { standings: { hasSome: ids } },
    ] });
  }
  return { occurredAt: { gte: season.startedAt, ...(season.endedAt ? { lt: season.endedAt } : {}) }, AND };
}

export function historyHref(input: { q?: string; player?: string; page?: number; season?: string; view?: string }) {
  const params = new URLSearchParams();
  for (const key of ['q', 'player', 'page', 'season', 'view'] as const) {
    const value = input[key];
    if (value && !(key === 'page' && value === 1)) params.set(key, String(value));
  }
  return `/history${params.size ? `?${params}` : ''}`;
}
