export const TREND_DAYS = 7;

type Ranked = { id: string; rank: number; totalReignMs: number };

/**
 * Placeringsförändring per spelare: positivt tal = klättrat. Spelare utan trontid
 * i någon av tabellerna får null — deras inbördes ordning är godtycklig och en pil
 * skulle bara vara brus.
 */
export function rankDeltas(current: Ranked[], past: Ranked[]): Record<string, number | null> {
  const pastRank = new Map(past.filter((r) => r.totalReignMs > 0).map((r) => [r.id, r.rank]));
  return Object.fromEntries(current.map((r) => {
    const before = pastRank.get(r.id);
    return [r.id, r.totalReignMs > 0 && before !== undefined ? before - r.rank : null];
  }));
}

/** Tidpunkten att jämföra mot, eller null om säsongen är för ung för en meningsfull jämförelse. */
export function trendReferenceDate(season: { startedAt: Date; endedAt: Date | null }, now: Date = new Date()): Date | null {
  const end = season.endedAt && season.endedAt < now ? season.endedAt : now;
  const then = new Date(end.getTime() - TREND_DAYS * 86_400_000);
  return then > season.startedAt ? then : null;
}
