import { prisma } from '../prisma';
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
    theme: season.theme,
    // Spelare raderas aldrig; en okänd id i placeringen hoppas över i stället för att fälla sidan.
    standings: win.standings.flatMap((pid) => {
      const p = byId.get(pid);
      return p ? [{ id: p.id, name: p.name, createdAt: p.createdAt.toISOString() }] : [];
    }),
  };
}
