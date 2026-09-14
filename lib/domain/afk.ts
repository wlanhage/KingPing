import { prisma } from '../prisma';

/**
 * AFK: spelaren finns kvar i riket men spelar inte just nu. En AFK-spelare rankas inte och
 * jämförs inte med fältet — hen kan varken hamna sist i tabellen eller få badges som mäts
 * mot de andra. Egna meriter (antal kronor, längsta svit) står kvar.
 */

type AfkPeriodLike = { startedAt: Date; endedAt: Date | null };

const DAY_MS = 86_400_000;

export function isAfkAt(periods: AfkPeriodLike[], at: Date): boolean {
  return periods.some((p) => p.startedAt <= at && (!p.endedAt || p.endedAt > at));
}

export type AfkSummary = { times: number; totalDays: number; longestDays: number; currentDays: number | null };

/** Underlag för texter om frånvaron: hur ofta, hur länge sammanlagt, och om det pågår. */
export function afkSummary(periods: AfkPeriodLike[], now: Date = new Date()): AfkSummary {
  const days = periods.map((p) => Math.floor(((p.endedAt ?? now).getTime() - p.startedAt.getTime()) / DAY_MS));
  const open = periods.findIndex((p) => !p.endedAt);
  return {
    times: periods.length,
    totalDays: days.reduce((sum, d) => sum + d, 0),
    longestDays: Math.max(0, ...days),
    currentDays: open === -1 ? null : days[open],
  };
}

export async function setPlayerAfk(playerId: string, afk: boolean) {
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUniqueOrThrow({ where: { id: playerId } });
    if (afk === !player.isActive) return player;
    if (afk) {
      // En AFK-kung skulle samla trontid utan att någon kan utmana hen på riktigt.
      const reigning = await tx.reign.findFirst({ where: { playerId, endedAt: null }, select: { id: true } });
      if (reigning) throw new Error(`${player.name} sitter på tronen och kan inte gå AFK. Kronan måste tas först.`);
      await tx.afkPeriod.create({ data: { playerId, startedAt: now } });
    } else {
      await tx.afkPeriod.updateMany({ where: { playerId, endedAt: null }, data: { endedAt: now } });
    }
    return tx.player.update({ where: { id: playerId }, data: { isActive: !afk } });
  });
}
