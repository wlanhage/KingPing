import { prisma } from '../prisma';
import { clampedReignMs, IMPLICIT_SEASON, listSeasons, seasonNumber, toRoman, type SeasonWindow } from './season';
import { dayKey, hourOfDay, weekdayIndex } from './local-time';
import { getLeaderboard } from './riket';
import { getTheme } from '../theme';

/**
 * Hela historien på en gång, för sidan "Genom tiderna". Allt räknas i minnet ur tre tabeller:
 * datamängden är hundratals rader, och regeringar som spänner över säsongsgränser kan ändå
 * inte klampas i en query (se season.ts).
 */

const DAY = 86_400_000;
/** Kategoriska färger finns för åtta spelare; fler viks in i "Övriga" (grått) i stället för att hitta på en nionde nyans. */
export const SERIES_SLOTS = 8;

type InPlayer = { id: string; name: string; createdAt: Date; isActive: boolean };
type InWin = { id: string; winnerId: string; previousKingId: string | null; occurredAt: Date; streakCount: number; previousStreakCount: number | null; standings: string[] };
type InReign = { playerId: string; startedAt: Date; endedAt: Date | null };
type InSeason = SeasonWindow & { label: string; championId: string | null };

export type AllTimeInput = { players: InPlayer[]; wins: InWin[]; reigns: InReign[]; seasons: InSeason[]; now: Date };

export type Feat = { key: string; title: string; holderId: string; value: string; detail: string; href?: string };

const reignEnd = (r: InReign, now: Date) => (r.endedAt ?? now).getTime();
const maxBy = <T,>(xs: T[], f: (x: T) => number): T | undefined => xs.reduce<T | undefined>((best, x) => (best === undefined || f(x) > f(best) ? x : best), undefined);
const days = (ms: number) => Math.floor(ms / DAY);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const fmtDay = (d: Date) => d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' });

export function buildAllTime({ players, wins, reigns, seasons, now }: AllTimeInput) {
  const sortedWins = [...wins].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const sortedReigns = [...reigns].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const from = Math.min(sortedWins[0]?.occurredAt.getTime() ?? now.getTime(), sortedReigns[0]?.startedAt.getTime() ?? now.getTime());
  const to = now.getTime();

  // Färgen följer spelaren, aldrig placeringen: ordningen spelarna kom till riket ändras inte när tabellen gör det.
  const bySeniority = [...players].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.name.localeCompare(b.name, 'sv'));
  const slot = Object.fromEntries(bySeniority.map((p, i) => [p.id, i < SERIES_SLOTS ? i : null]));

  /* ── Spelarna ── */
  const roster = players.map((p) => {
    const own = sortedWins.filter((w) => w.winnerId === p.id);
    const ownReigns = sortedReigns.filter((r) => r.playerId === p.id);
    return {
      id: p.id,
      name: p.name,
      slot: slot[p.id],
      isActive: p.isActive,
      wins: own.length,
      takeovers: own.filter((w) => w.previousKingId && w.previousKingId !== p.id).length,
      throneMs: ownReigns.reduce((sum, r) => sum + reignEnd(r, now) - r.startedAt.getTime(), 0),
      reigns: ownReigns.length,
      longestReignMs: Math.max(0, ...ownReigns.map((r) => reignEnd(r, now) - r.startedAt.getTime())),
      longestStreak: Math.max(0, ...own.map((w) => w.streakCount)),
      seasonsWon: seasons.filter((s) => s.championId === p.id).length,
      firstWinAt: own[0]?.occurredAt ?? null,
    };
  }).sort((a, b) => b.throneMs - a.throneMs || b.wins - a.wins);
  const name = Object.fromEntries(players.map((p) => [p.id, p.name]));

  /* ── Tronbandet: varje regering, med antal vinster under den ── */
  const lanes = sortedReigns.map((r) => {
    const end = reignEnd(r, now);
    const inReign = sortedWins.filter((w) => w.winnerId === r.playerId && w.occurredAt.getTime() >= r.startedAt.getTime() && (!r.endedAt || w.occurredAt.getTime() < end));
    return { playerId: r.playerId, start: r.startedAt.getTime(), end, open: !r.endedAt, wins: inReign.length };
  });

  /* ── Kapplöpningen: ackumulerad trontid och vinster, ett värde per dygn ── */
  // ponytail: dygn × regeringar per spelare (~300k steg i dag); svep i tidsordning om historien blir flera år lång.
  const ticks: number[] = [];
  for (let t = from; t < to; t += DAY) ticks.push(t);
  ticks.push(to);
  const race = roster.map((p) => {
    const rs = lanes.filter((l) => l.playerId === p.id);
    const ws = sortedWins.filter((w) => w.winnerId === p.id).map((w) => w.occurredAt.getTime());
    return {
      playerId: p.id,
      throneDays: ticks.map((t) => Math.round(rs.reduce((sum, l) => sum + Math.max(0, Math.min(l.end, t) - l.start), 0) / DAY * 100) / 100),
      wins: ticks.map((t) => ws.filter((w) => w <= t).length),
    };
  });

  /* ── Säsongerna: varje spelares andel av säsongens trontid ── */
  const seasonGrid = seasons.map((s) => {
    const cells = Object.fromEntries(players.map((p) => [p.id, {
      ms: reigns.filter((r) => r.playerId === p.id).reduce((sum, r) => sum + clampedReignMs(r, s, now), 0),
      wins: sortedWins.filter((w) => w.winnerId === p.id && w.occurredAt >= s.startedAt && (!s.endedAt || w.occurredAt < s.endedAt)).length,
    }]));
    const total = Object.values(cells).reduce((sum, c) => sum + c.ms, 0);
    return { slug: s.slug, name: s.name, label: s.label, theme: s.theme, ended: !!s.endedAt, start: s.startedAt.getTime(), end: (s.endedAt ?? now).getTime(), championId: s.championId, total, cells };
  });

  /* ── Fejderna: vem tog kronan från vem ── */
  const feuds: { [winner: string]: { [from: string]: number } } = {};
  for (const w of sortedWins) {
    if (!w.previousKingId || w.previousKingId === w.winnerId) continue;
    (feuds[w.winnerId] ??= {})[w.previousKingId] = (feuds[w.winnerId]?.[w.previousKingId] ?? 0) + 1;
  }

  /* ── Pulsen: kröningar per dygn, och per veckodag × timme ── */
  const perDay: { [day: string]: number } = {};
  const clock = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const w of sortedWins) {
    perDay[dayKey(w.occurredAt)] = (perDay[dayKey(w.occurredAt)] ?? 0) + 1;
    clock[weekdayIndex(w.occurredAt)][hourOfDay(w.occurredAt)] += 1;
  }

  /* ── Rekordboken ── */
  const records: Feat[] = [];
  const longest = maxBy(lanes, (l) => l.end - l.start);
  if (longest) records.push({ key: 'longest-reign', title: 'Längsta regeringen', holderId: longest.playerId, value: `${days(longest.end - longest.start)} d ${Math.floor(((longest.end - longest.start) % DAY) / 3_600_000)} h`, detail: `${fmtDay(new Date(longest.start))}${longest.open ? ', sitter fortfarande' : ` – ${fmtDay(new Date(longest.end))}`}` });
  const streak = maxBy(sortedWins, (w) => w.streakCount);
  if (streak && streak.streakCount > 1) records.push({ key: 'streak', title: 'Längsta sviten', holderId: streak.winnerId, value: `${streak.streakCount} raka`, detail: fmtDay(streak.occurredAt), href: streak.standings.length >= 2 ? `/rundor/${streak.id}` : undefined });
  const slayer = maxBy(sortedWins.filter((w) => w.previousKingId && w.previousKingId !== w.winnerId), (w) => w.previousStreakCount ?? 0);
  if (slayer && (slayer.previousStreakCount ?? 0) >= 2) records.push({ key: 'slayer', title: 'Största fallet', holderId: slayer.winnerId, value: `bröt ${slayer.previousStreakCount} raka`, detail: `${name[slayer.previousKingId!]} störtad ${fmtDay(slayer.occurredAt)}`, href: slayer.standings.length >= 2 ? `/rundor/${slayer.id}` : undefined });
  const shortest = [...lanes].filter((l) => !l.open).sort((a, b) => a.end - a.start - (b.end - b.start))[0];
  if (shortest) records.push({ key: 'shortest', title: 'Kortaste regeringen', holderId: shortest.playerId, value: `${Math.max(1, Math.round((shortest.end - shortest.start) / 60_000))} min`, detail: fmtDay(new Date(shortest.start)) });

  // Helgkungen: vem satt på tronen lördag mitt på dagen, flest helger.
  const weekends: { [id: string]: number } = {};
  for (let t = Math.floor(from / DAY) * DAY + 10 * 3_600_000; t < to; t += DAY) {
    if (weekdayIndex(new Date(t)) !== 5) continue;
    const king = lanes.find((l) => l.start <= t && l.end > t);
    if (king) weekends[king.playerId] = (weekends[king.playerId] ?? 0) + 1;
  }
  const weekendKing = maxBy(Object.entries(weekends), ([, n]) => n);
  if (weekendKing) records.push({ key: 'weekend', title: 'Helgkungen', holderId: weekendKing[0], value: plural(weekendKing[1], 'helg', 'helger'), detail: 'på tronen en lördag' });

  // Bästa dagen: flest vinster för en spelare under ett och samma dygn.
  const daily: { [k: string]: { id: string; day: Date; n: number } } = {};
  for (const w of sortedWins) {
    const k = `${w.winnerId}|${dayKey(w.occurredAt)}`;
    (daily[k] ??= { id: w.winnerId, day: w.occurredAt, n: 0 }).n += 1;
  }
  const bestDay = maxBy(Object.values(daily), (d) => d.n);
  if (bestDay && bestDay.n > 1) records.push({ key: 'best-day', title: 'Bästa dagen', holderId: bestDay.id, value: `${bestDay.n} vinster`, detail: fmtDay(bestDay.day) });

  // Längsta torkan: flest dagar mellan två vinster för samma spelare, slutet med en vinst.
  const droughts = roster.flatMap((p) => {
    const ts = sortedWins.filter((w) => w.winnerId === p.id).map((w) => w.occurredAt);
    return ts.slice(1).map((t, i) => ({ id: p.id, gap: t.getTime() - ts[i].getTime(), at: t }));
  });
  const drought = maxBy(droughts, (d) => d.gap);
  if (drought && days(drought.gap) >= 2) records.push({ key: 'drought', title: 'Längsta torkan', holderId: drought.id, value: plural(days(drought.gap), 'dag', 'dagar'), detail: `bröts ${fmtDay(drought.at)}` });

  const kingslayer = maxBy(roster, (p) => p.takeovers);
  if (kingslayer?.takeovers) records.push({ key: 'kingslayer', title: 'Flest kronor snodda', holderId: kingslayer.id, value: plural(kingslayer.takeovers, 'gång', 'gånger'), detail: 'tog kronan från en sittande kung' });

  return {
    from,
    to,
    totals: {
      crownings: sortedWins.length,
      takeovers: sortedWins.filter((w) => w.previousKingId && w.previousKingId !== w.winnerId).length,
      monarchs: new Set(sortedReigns.map((r) => r.playerId)).size,
      players: players.length,
      days: Math.max(1, Math.ceil((to - from) / DAY)),
      rounds: sortedWins.filter((w) => w.standings.length >= 2).length,
    },
    roster,
    lanes,
    race: { ticks, series: race },
    seasonGrid,
    feuds,
    perDay,
    clock,
    records,
  };
}

export type AllTime = ReturnType<typeof buildAllTime>;

export async function getAllTime(now = new Date()): Promise<AllTime> {
  const [players, wins, reigns, rows] = await Promise.all([
    prisma.player.findMany({ select: { id: true, name: true, createdAt: true, isActive: true } }),
    prisma.winEvent.findMany({ select: { id: true, winnerId: true, previousKingId: true, occurredAt: true, streakCount: true, previousStreakCount: true, standings: true } }),
    prisma.reign.findMany({ select: { playerId: true, startedAt: true, endedAt: true } }),
    listSeasons(),
  ]);
  // Säsongens mästare hämtas ur dess egen tabell, så att "Genom tiderna" och arkivet aldrig säger olika saker.
  const windows = rows.length ? [...rows].reverse() : [IMPLICIT_SEASON];
  const seasons = await Promise.all(windows.map(async (s) => ({
    ...s,
    label: s.id === 'implicit' ? s.name : `${getTheme(s.theme).seasonWord} ${toRoman(seasonNumber(rows, s))}`,
    championId: s.endedAt ? (await getLeaderboard(s))[0]?.id ?? null : null,
  })));
  return buildAllTime({ players, wins, reigns, seasons, now });
}
