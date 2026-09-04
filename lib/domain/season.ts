import { prisma } from '../prisma';

/**
 * En säsong avgränsas av ett datumintervall [startedAt, endedAt), där endedAt === null
 * betyder "pågår". Vinster filtreras mot intervallet och regeringar KLAMPAS mot det —
 * att bara filtrera bort regeringar ger fel siffror, eftersom en regering kan spänna
 * över en säsongsgräns och då bara delvis tillhör säsongen.
 */
export type SeasonWindow = {
  id: string;
  slug: string;
  name: string;
  theme: string;
  startedAt: Date;
  endedAt: Date | null;
};

export const DEFAULT_THEME = 'realm';

/** Används när ingen Season-rad finns ännu: hela historiken som en implicit pågående säsong. */
export const IMPLICIT_SEASON: SeasonWindow = {
  id: 'implicit',
  slug: 'all',
  name: 'Rundpingisriket',
  theme: DEFAULT_THEME,
  startedAt: new Date(0),
  endedAt: null,
};

/** "Nu" sett från säsongen. För en avslutad säsong står tiden still vid säsongsslutet. */
export function seasonNow(season: SeasonWindow, now: Date = new Date()): Date {
  return season.endedAt ?? now;
}

/** Prisma-filter för vinster inom säsongen. */
export function winOccurredAtFilter(season: SeasonWindow) {
  return season.endedAt
    ? { gte: season.startedAt, lt: season.endedAt }
    : { gte: season.startedAt };
}

export function isWinInSeason(occurredAt: Date, season: SeasonWindow): boolean {
  const t = new Date(occurredAt).getTime();
  if (t < season.startedAt.getTime()) return false;
  return season.endedAt ? t < season.endedAt.getTime() : true;
}

type ReignLike = { startedAt: Date; endedAt: Date | null };

/**
 * Klipper en regering mot säsongsfönstret. Returnerar null om den inte överlappar alls.
 *
 * En regering som fortfarande pågår behåller endedAt === null ENDAST om säsongen också
 * pågår — annars skulle en öppen regering fortsätta ticka in tid i en sedan länge
 * avslutad säsong.
 */
export function clampReignToSeason<T extends ReignLike>(reign: T, season: SeasonWindow, now: Date = new Date()): T | null {
  const seasonStart = season.startedAt.getTime();
  const seasonEnd = seasonNow(season, now).getTime();
  const reignStart = new Date(reign.startedAt).getTime();
  const reignEndRaw = reign.endedAt ? new Date(reign.endedAt).getTime() : null;
  const reignEnd = reignEndRaw ?? now.getTime();

  if (reignEnd < seasonStart || reignStart > seasonEnd) return null;

  const stillOpen = reignEndRaw === null && season.endedAt === null;
  return {
    ...reign,
    startedAt: new Date(Math.max(reignStart, seasonStart)),
    endedAt: stillOpen ? null : new Date(Math.min(reignEnd, seasonEnd)),
  };
}

/** Regeringstid inom säsongen, i millisekunder. */
export function clampedReignMs(reign: ReignLike, season: SeasonWindow, now: Date = new Date()): number {
  const clamped = clampReignToSeason(reign, season, now);
  if (!clamped) return 0;
  const end = clamped.endedAt ? clamped.endedAt.getTime() : seasonNow(season, now).getTime();
  return Math.max(0, end - clamped.startedAt.getTime());
}

/** Skalar ner en spelares wins/reigns till säsongen. Formen behålls så att stats-beräkningen kan användas oförändrad. */
export function scopePlayerToSeason<T extends { wins?: any[]; reigns?: any[] }>(player: T, season: SeasonWindow, now: Date = new Date()): T {
  return {
    ...player,
    wins: (player.wins ?? []).filter((w: any) => isWinInSeason(w.occurredAt, season)),
    reigns: (player.reigns ?? []).map((r: any) => clampReignToSeason(r, season, now)).filter(Boolean),
  };
}

/* ───────────────────────────── Databas ───────────────────────────── */

export async function getActiveSeason(): Promise<SeasonWindow | null> {
  return prisma.season.findFirst({ where: { endedAt: null }, orderBy: { startedAt: 'desc' } });
}

export async function getSeasonBySlug(slug: string): Promise<SeasonWindow | null> {
  return prisma.season.findUnique({ where: { slug } });
}

export async function listSeasons(): Promise<SeasonWindow[]> {
  return prisma.season.findMany({ orderBy: { startedAt: 'desc' } });
}

/** Säsongen som slutade närmast före den givna, eller null för den första (och den implicita). */
export function previousSeasonOf(seasons: SeasonWindow[], season: SeasonWindow): SeasonWindow | null {
  const before = seasons.filter((s) => s.id !== season.id && s.endedAt && s.endedAt.getTime() <= season.startedAt.getTime());
  return before.sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())[0] ?? null;
}

export async function getPreviousSeason(season: SeasonWindow): Promise<SeasonWindow | null> {
  return previousSeasonOf(await listSeasons(), season);
}

/**
 * Löser ut vilken säsong som ska visas. Utan slug: den pågående. Finns ingen Season-rad
 * alls faller vi tillbaka på hela historiken, så appen fungerar även före bootstrap.
 */
export async function resolveSeason(slug?: string | null): Promise<SeasonWindow> {
  if (slug) {
    const bySlug = await getSeasonBySlug(slug);
    if (bySlug) return bySlug;
  }
  return (await getActiveSeason()) ?? IMPLICIT_SEASON;
}

/** Säsongens ordningsnummer räknat från den första (1-baserat). */
export function seasonNumber(seasons: SeasonWindow[], season: SeasonWindow): number {
  const ordered = [...seasons].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const index = ordered.findIndex((s) => s.id === season.id);
  return index === -1 ? ordered.length + 1 : index + 1;
}

export function toRoman(n: number): string {
  const table: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  for (const [value, symbol] of table) while (n >= value) { out += symbol; n -= value; }
  return out;
}
