import { prisma } from '@/lib/prisma';
import type { LabData } from '@/lib/domain/season-lab';

export async function loadLabData(): Promise<LabData> {
  const [seasons, players, wins, reigns] = await Promise.all([
    prisma.season.findMany({ orderBy: { startedAt: 'asc' } }),
    prisma.player.findMany({ select: { id: true, name: true, createdAt: true, afkPeriods: { select: { startedAt: true, endedAt: true } } } }),
    prisma.winEvent.findMany({ orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }], select: { id: true, winnerId: true, occurredAt: true, standings: true } }),
    prisma.reign.findMany({ select: { playerId: true, startedAt: true, endedAt: true } }),
  ]);
  const historyStart = Math.min(...wins.map((w) => w.occurredAt.getTime()), ...reigns.map((r) => r.startedAt.getTime()));
  return {
    seasons: seasons.length ? seasons.map((s) => ({ id: s.id, slug: s.slug, name: s.name, start: s.startedAt.getTime(), end: s.endedAt?.getTime() ?? null }))
      : [{ id: 'implicit', slug: 'all', name: 'Hela historiken', start: Number.isFinite(historyStart) ? historyStart : Date.now(), end: null }],
    players: players.map((p) => ({ id: p.id, name: p.name, created: p.createdAt.getTime(), afk: p.afkPeriods.map((a) => ({ start: a.startedAt.getTime(), end: a.endedAt?.getTime() ?? null })) })),
    wins: wins.map((w) => ({ id: w.id, winnerId: w.winnerId, at: w.occurredAt.getTime(), standings: w.standings })),
    reigns: reigns.map((r) => ({ playerId: r.playerId, start: r.startedAt.getTime(), end: r.endedAt?.getTime() ?? null })),
  };
}
