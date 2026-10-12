import { prisma } from '../prisma';
import { audit, type Actor } from '../audit';
import { scoreError } from '../domain/duel';
import { winOccurredAtFilter, type SeasonWindow } from '../domain/season';
import { WinError } from '../domain/win-request';

export type DuelInput = { winnerId: string; loserId: string; winnerPoints?: number | null; loserPoints?: number | null; requestId?: string };

/**
 * Sparar en duell utanför kronan. Ingen cooldown: den skyddar tronen mot dubbelkröningar, och en
 * duell rör inte tronen. Dubbelklick stoppas i stället av requestId, som för rundor.
 */
export async function recordDuel(input: DuelInput, actor: Actor = 'web') {
  if (input.winnerId === input.loserId) throw new WinError('En duell kräver två olika spelare.', 400);
  const error = scoreError(input.winnerPoints, input.loserPoints);
  if (error) throw new WinError(error, 400);
  if (input.requestId) {
    const existing = await prisma.duel.findUnique({ where: { requestId: input.requestId } });
    if (existing) {
      const same = existing.winnerId === input.winnerId && existing.loserId === input.loserId
        && existing.winnerPoints === (input.winnerPoints ?? null) && existing.loserPoints === (input.loserPoints ?? null);
      if (!same) throw new WinError('Den här duellen är redan sparad med ett annat resultat.', 409);
      return existing;
    }
  }
  const players = await prisma.player.findMany({ where: { id: { in: [input.winnerId, input.loserId] } }, select: { id: true, name: true, isActive: true } });
  if (players.length !== 2) throw new WinError('Någon av spelarna finns inte.', 400);
  const afk = players.find((p) => !p.isActive);
  if (afk) throw new WinError(`${afk.name} är AFK. Aktivera spelaren innan hen kan spela en duell.`, 400);
  const duel = await prisma.duel.create({
    data: { winnerId: input.winnerId, loserId: input.loserId, winnerPoints: input.winnerPoints ?? null, loserPoints: input.loserPoints ?? null, requestId: input.requestId },
  });
  const name = (id: string) => players.find((p) => p.id === id)!.name;
  const score = duel.winnerPoints !== null ? ` (${duel.winnerPoints}–${duel.loserPoints})` : '';
  await audit('DUEL_RECORDED', `${name(duel.winnerId)} vann duellen mot ${name(duel.loserId)}${score}.`, actor);
  return duel;
}

export const seasonDuels = (season: SeasonWindow) =>
  prisma.duel.findMany({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
