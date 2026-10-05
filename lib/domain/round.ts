import { prisma } from '../prisma';
import { hourOfDay } from './local-time';
import { isWinInSeason, listSeasons, resolveSeason } from './season';

/**
 * En runda för reprisen: placeringen med namn, vinnaren först, och temat från säsongen rundan
 * spelades i — en gammal runda visas i sin egen säsongs ord. null om id:t inte finns.
 */
export async function getRound(id: string) {
  const win = await prisma.winEvent.findUnique({ where: { id }, select: { id: true, occurredAt: true, standings: true } });
  if (!win) return null;
  const players = await prisma.player.findMany({ where: { id: { in: win.standings } }, select: { id: true, name: true, createdAt: true } });
  const byId = new Map(players.map((p) => [p.id, p]));
  const season = (await listSeasons()).find((s) => isWinInSeason(win.occurredAt, s)) ?? (await resolveSeason());
  return {
    id: win.id,
    occurredAt: win.occurredAt,
    // svensk tid med minuter som decimaler: reprisens Coruscant följer dygnet rundan spelades i
    hour: hourOfDay(win.occurredAt) + win.occurredAt.getUTCMinutes() / 60,
    merits: await meritsAt(win.standings, win.occurredAt),
    theme: season.theme,
    // Spelare raderas aldrig; en okänd id i placeringen hoppas över i stället för att fälla sidan.
    standings: win.standings.flatMap((pid) => {
      const p = byId.get(pid);
      return p ? [{ id: p.id, name: p.name, createdAt: p.createdAt.toISOString() }] : [];
    }),
  };
}

/**
 * Meriterna som de stod när rundan spelades (inte i dag, så att en gammal repris ser likadan ut):
 * längst sammanhängande regeringstid, flest vinster, och vilka som aldrig vunnit. Reprisen klär
 * ut dem till fraktskepp, jedimästare och padawaner (components/stage/rundan.ts: outfit).
 */
export async function meritsAt(ids: string[], at: Date): Promise<{ falcon?: string; master?: string; padawans: string[] }> {
  if (!ids.length) return { padawans: [] };
  const [wins, reigns] = await Promise.all([
    prisma.winEvent.groupBy({ by: ['winnerId'], where: { winnerId: { in: ids }, occurredAt: { lte: at } }, _count: { _all: true } }),
    prisma.reign.findMany({ where: { playerId: { in: ids }, startedAt: { lte: at } }, select: { playerId: true, startedAt: true, endedAt: true } }),
  ]);
  return pickMerits(ids, at, wins.map((w) => ({ id: w.winnerId, wins: w._count._all })), reigns);
}

/** Den rena delen av meritsAt. Lika är lika: först i placeringen vinner, så att valet är stabilt. */
export function pickMerits(ids: string[], at: Date, wins: { id: string; wins: number }[], reigns: { playerId: string; startedAt: Date; endedAt: Date | null }[]) {
  const winsOf = new Map(wins.map((w) => [w.id, w.wins]));
  const longest = new Map<string, number>();
  for (const r of reigns) {
    const ms = Math.min((r.endedAt ?? at).getTime(), at.getTime()) - r.startedAt.getTime();
    longest.set(r.playerId, Math.max(longest.get(r.playerId) ?? 0, ms));
  }
  const best = (score: (id: string) => number, skip?: string) => ids.filter((id) => id !== skip && score(id) > 0).reduce<string | undefined>((b, id) => (b === undefined || score(id) > score(b) ? id : b), undefined);
  const master = best((id) => winsOf.get(id) ?? 0);
  return { master, falcon: best((id) => longest.get(id) ?? 0, master), padawans: ids.filter((id) => !winsOf.get(id)) };
}
