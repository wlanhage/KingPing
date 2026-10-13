import { prisma } from '../prisma';
import { audit, type Actor } from '../audit';
import { formatResult, resultError, type DuelMatch, type DuelResult } from '../domain/duel';
import { recordWin } from '../domain/riket';
import { winOccurredAtFilter, type SeasonWindow } from '../domain/season';
import { WinError } from '../domain/win-request';

export type DuelInput = DuelResult & { winnerId: string; loserId: string; requestId?: string; kronMatch?: boolean; note?: string };

/**
 * Sparar en 1 mot 1. En KronMatch går hela kröningsvägen (cooldown, lås, utrop) som en runda med
 * två spelare, och recordWin sparar duellen i samma transaktion. En vanlig duell rör inte tronen och
 * har därför ingen cooldown; dubbelklick stoppas i stället av requestId, som för rundor.
 */
export async function recordDuel(input: DuelInput, actor: Actor = 'web') {
  if (input.winnerId === input.loserId) throw new WinError('En duell kräver två olika spelare.', 400);
  const error = resultError(input);
  if (error) throw new WinError(error, 400);
  if (input.kronMatch) {
    const crowned = await recordWin(input.winnerId, input.note, {
      actor, requestId: input.requestId, standings: [input.winnerId, input.loserId],
      finalScore: [input.winnerPoints ?? null, input.loserPoints ?? null],
      duel: { winnerSets: input.winnerSets ?? null, loserSets: input.loserSets ?? null },
    });
    return { kronMatch: true as const, ...crowned };
  }
  if (input.requestId) {
    const existing = await prisma.duel.findUnique({ where: { requestId: input.requestId } });
    if (existing) {
      const same = existing.winnerId === input.winnerId && existing.loserId === input.loserId
        && existing.winnerPoints === (input.winnerPoints ?? null) && existing.loserPoints === (input.loserPoints ?? null)
        && existing.winnerSets === (input.winnerSets ?? null) && existing.loserSets === (input.loserSets ?? null);
      if (!same) throw new WinError('Den här duellen är redan sparad med ett annat resultat.', 409);
      return { kronMatch: false as const, duel: existing };
    }
  }
  const players = await prisma.player.findMany({ where: { id: { in: [input.winnerId, input.loserId] } }, select: { id: true, name: true, isActive: true } });
  if (players.length !== 2) throw new WinError('Någon av spelarna finns inte.', 400);
  const afk = players.find((p) => !p.isActive);
  if (afk) throw new WinError(`${afk.name} är AFK. Aktivera spelaren innan hen kan spela en duell.`, 400);
  const duel = await prisma.duel.create({
    data: {
      winnerId: input.winnerId, loserId: input.loserId, requestId: input.requestId,
      winnerPoints: input.winnerPoints ?? null, loserPoints: input.loserPoints ?? null,
      winnerSets: input.winnerSets ?? null, loserSets: input.loserSets ?? null,
    },
  });
  const name = (id: string) => players.find((p) => p.id === id)!.name;
  const result = formatResult(duel);
  await audit('DUEL_RECORDED', `${name(duel.winnerId)} vann duellen mot ${name(duel.loserId)}${result ? ` (${result})` : ''}.`, actor);
  return { kronMatch: false as const, duel };
}

/** Säsongens 1 mot 1, i den form domänen räknar på. */
export async function seasonDuels(season: SeasonWindow): Promise<DuelMatch[]> {
  const rows = await prisma.duel.findMany({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }] });
  return rows.map(({ winEventId, requestId: _requestId, ...d }) => ({ ...d, crown: winEventId !== null }));
}
