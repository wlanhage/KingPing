import { prisma } from '../prisma';
import { playerPerformance } from '../domain/performance';
import { winOccurredAtFilter, type SeasonWindow } from '../domain/season';

export async function getPlayerPerformance(playerId: string, season: SeasonWindow) {
  const [players, rounds] = await Promise.all([
    prisma.player.findMany({ select: { id: true, name: true } }),
    prisma.winEvent.findMany({
      where: { occurredAt: { ...winOccurredAtFilter(season), lte: new Date() }, OR: [{ standings: { has: playerId } }, { winnerId: playerId }] },
      select: { id: true, winnerId: true, standings: true, occurredAt: true },
    }),
  ]);
  return playerPerformance(playerId, players, rounds);
}
