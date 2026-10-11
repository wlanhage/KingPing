import { WinError, sameWinRequest } from './win-request';
import { countByWeekday } from './local-time';
import { dominance, stolenReign } from '../badges/player-stats';
import { EventType, NationState, type Prisma } from '@prisma/client';
import { differenceInDays, isFriday } from 'date-fns';
import { trace } from '@opentelemetry/api';
import { prisma } from '../prisma';
import { audit, describeWin, type Actor } from '../audit';
import { realm } from '../theme/themes/realm';
import { calculateGlobalStats, calculatePlayerStats } from '../badges/player-stats';
import { getPlayerBadges } from '../badges/badge-engine';
import { IMPLICIT_SEASON, previousSeasonOf, clampReignToSeason, getPreviousSeason, isWinInSeason, resolveSeason, scopePlayerToSeason, seasonNow, winOccurredAtFilter, type SeasonWindow } from './season';
import { isAfkAt, lockThrone } from './afk';
import { describeSeasonEcho, ECHO_WINDOW, pickSeasonEcho, type SeasonEcho } from './season-echo';
import { isStreakReturn } from './stage-triggers';
import { classicCrownRatings, crownRatings, START_RATING } from './crown-rating';
import { standingsError } from './standings';
import { getTheme } from '../theme';


// Read helpers accept the held transaction so nested reads never need an extra pool connection.
type ReadClient = Pick<Prisma.TransactionClient, 'player' | 'winEvent' | 'reign' | 'season'>;

// Hur länge efter en kröning man måste vänta innan en ny vinnare kan sättas (skydd mot dubbelsättningar).
const DEFAULT_COOLDOWN_MS = 20 * 60 * 1000;
// Lokalt kan cooldownen sättas till 0 i .env.local (WIN_COOLDOWN_MS=0) för att testa kröningar
// i följd. Överstyrningen gäller aldrig i produktion, hur miljön än är satt.
const cooldownOverride = process.env.NODE_ENV !== 'production' ? Number(process.env.WIN_COOLDOWN_MS) : NaN;
export const WIN_COOLDOWN_MS = Number.isFinite(cooldownOverride) ? cooldownOverride : DEFAULT_COOLDOWN_MS;

// För en pågående säsong: den som sitter på tronen nu. För en avslutad säsong: den som
// satt på tronen när säsongen tog slut.
export async function getCurrentKing(season?: SeasonWindow, db: ReadClient = prisma) {
  if (!season?.endedAt) return db.reign.findFirst({ where:{ endedAt:null }, include:{ player:true }, orderBy:{ startedAt:'desc' } });
  return db.reign.findFirst({
    where: { startedAt: { lte: season.endedAt }, OR: [{ endedAt: null }, { endedAt: { gt: season.endedAt } }] },
    include: { player: true },
    orderBy: { startedAt: 'desc' },
  });
}
export const COMEBACK_DAYS = 14; // ~2 veckor utan vinst räknas som en återkomst

export function determineEventType(ctx:{isSameKing:boolean; streakCount:number; previousStreakCount?:number|null; isFirstWin?:boolean; daysSinceLastWin?:number|null;}):EventType {
 if (ctx.isSameKing) return ctx.streakCount===2?EventType.SAME_KING_STREAK_2:ctx.streakCount===3?EventType.SAME_KING_STREAK_3:ctx.streakCount===4?EventType.SAME_KING_STREAK_4:EventType.SAME_KING_STREAK_5_PLUS;
 const p=ctx.previousStreakCount??0;
 // Stora störtanden är alltid huvudnyheten.
 if(p>=5)return EventType.STREAK_BREAK_LEGENDARY; if(p===4)return EventType.STREAK_BREAK_MAJOR;
 // Spelarens egen historia: första vinsten någonsin, eller återkomst efter lång torka.
 if(ctx.isFirstWin)return EventType.FIRST_WIN;
 if((ctx.daysSinceLastWin??0)>=COMEBACK_DAYS)return EventType.COMEBACK;
 // Mindre störtanden, annars helt vanlig kröning (t.ex. snabbt återtagande – inget ovanligt med 8 spelare).
 if(p===3)return EventType.STREAK_BREAK_MEDIUM; if(p===2)return EventType.STREAK_BREAK_SMALL; return EventType.NEW_KING;
}
export function determineNationState(ctx:{recentWinnerIds:string[]; currentStreak:number; brokeBigStreak:boolean;}):NationState { if(ctx.currentStreak>=5)return NationState.TYRANNY; if(ctx.currentStreak>=3)return NationState.DYNASTY; if(ctx.brokeBigStreak)return NationState.REVOLUTION; const u=new Set(ctx.recentWinnerIds).size; if(u>=5)return NationState.INSTABILITY; if(u>=3)return NationState.TENSION; return NationState.STABLE_ERA; }
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Texterna kommer från temat. Default är riddartemat, så befintliga anrop (och tester)
// beter sig oförändrat.
export function generateAnnouncement(ctx:any, announcements = realm.announcements){
  const { streakTemplates, nationIntros, fridayIntros } = announcements;
  const variants: string[] = (streakTemplates as any)[ctx.eventType] ?? [`👑 @{winner} har krönts.`];
  const echo: SeasonEcho | null = ctx.echo ?? null;
  const render = (template: string) => template
    .replaceAll('@{winner}', ctx.winnerName)
    .replaceAll('@{previousKing}', ctx.previousKingName ?? 'den förra regenten')
    .replaceAll('{previousStreakCount}', String(ctx.previousStreakCount ?? 0))
    .replaceAll('{days}', String(ctx.days ?? ctx.daysSinceLastWin ?? 0))
    .replaceAll('{lastSeason}', echo?.lastSeason ?? '')
    .replaceAll('{lastRank}', String(echo?.lastRank ?? ''))
    .replaceAll('{lastWins}', String(echo?.lastWins ?? ''))
    .replaceAll('{lastChampion}', echo?.lastChampion ?? '');
  // Texter som nyss stått i krönikan väljs bort — annars upprepade sig de små
  // kategorierna (första vinsten, fredag, tre raka) hela tiden.
  const recent: string[] = ctx.recentTexts ?? [];
  // Utan förra kung (t.ex. säsongens första vinst): raderna om den tomma tronen plus de som
  // inte nämner någon förra kung. Med förra kung används aldrig tomma-tronen-raderna.
  const empty: string[] = ctx.eventType === 'NEW_KING' && !ctx.previousKingName ? (streakTemplates as any).NEW_KING_EMPTY ?? [] : [];
  const nobodyNamed = variants.filter((t) => !t.includes('@{previousKing}'));
  const applicable = ctx.previousKingName ? variants : [...empty, ...(nobodyNamed.length ? nobodyNamed : variants)];
  const rendered = applicable.map(render);
  const fresh = rendered.filter((t) => !recent.some((r) => r.endsWith(t)));
  let text = pick(fresh.length ? fresh : rendered);
  // Lägg på en nations-intro ibland. Det tråkiga "stabila" läget hålls sällsynt
  // så att det inte upprepas, medan dramatiska lägen får synas oftare.
  const intros = (nationIntros as any)[ctx.nationState];
  const introChance = ctx.nationState === 'STABLE_ERA' ? 0.2 : 0.5;
  if (intros && Math.random() < introChance) text = `${pick(intros)}\n${text}`;
  if (ctx.isFridayFinal) text = `${pick(fridayIntros)}\n${text}`;
  // En blick bakåt på förra säsongen — ibland, och bara i början av en ny.
  const echoLine = pickSeasonEcho(announcements.seasonEchoes ?? {}, echo, recent, render, ctx.rand);
  if (echoLine) text = `${text}\n${echoLine}`;
  return { text, layout: 'royal', persona: 'ROYAL_DECREE' };
}
export async function calculateStreak(winnerId:string){ const events=await prisma.winEvent.findMany({where:{winnerId}, orderBy:{occurredAt:'desc'}, take:10}); return events.length===0?0:events.reduce((acc,e,i)=> i===0?1: acc + (events[i-1].occurredAt>=e.occurredAt?1:0),0); }
/**
 * Underlag för krönikans tillbakablickar: bara under säsongens första ECHO_WINDOW händelser,
 * och bara om det finns en förra säsong som vinnaren var med i.
 */
async function loadSeasonEcho(season: SeasonWindow, winnerId: string, previousKingId: string | null, db: ReadClient): Promise<SeasonEcho | null> {
  const previous = previousSeasonOf(await db.season.findMany(), season);
  if (!previous) return null;
  const eventsSoFar = await db.winEvent.count({ where: { occurredAt: winOccurredAtFilter(season) } });
  if (eventsSoFar >= ECHO_WINDOW) return null;
  const winner = await db.player.findUnique({ where: { id: winnerId }, select: { createdAt: true } });
  if (!winner || winner.createdAt.getTime() >= season.startedAt.getTime()) return null;
  return describeSeasonEcho(previous, (await getLeaderboard(previous, db)).filter(isRanked), winnerId, previousKingId);
}

export async function recordWin(winnerId: string, note?: string, opts: { ignoreCooldown?: boolean; actor?: Actor; standings?: string[]; requestId?: string } = {}) {
  const standings = opts.standings ?? [];
  const cleanNote = note?.trim() || undefined;
  if (cleanNote && cleanNote.length > 500) throw new WinError('Anteckningen får vara högst 500 tecken.', 400);
  if (standings.length) {
    const error = standingsError(winnerId, standings);
    if (error) throw new WinError(error, 400);
  }
  const saved = await prisma.$transaction(async (tx) => {
    // All crown/streak state is read AFTER the same lock used by AFK.
    await lockThrone(tx);
    if (opts.requestId) {
      const existing = await tx.winEvent.findUnique({ where: { requestId: opts.requestId }, include: { announcement: true } });
      if (existing) {
        if (!sameWinRequest(existing, winnerId, standings, cleanNote)) {
          throw new WinError('Den här rundan är redan sparad med ett annat resultat. Öppna krönikan för att kontrollera.', 409);
        }
        const { announcement, ...win } = existing;
        if (!announcement) throw new WinError('Rundan är sparad, men bekräftelsen kunde inte hämtas. Kontrollera krönikan.', 503);
        // A retry must work even during cooldown or after participants go AFK.
        return { result: { win, a: announcement, stage: { returningStreak: false, beatRival: false }, replayed: true as boolean }, context: null };
      }
    }
    const now = new Date();
    if (!opts.ignoreCooldown) {
      const latest = await tx.winEvent.findFirst({ orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], select: { occurredAt: true } });
      const remainingMs = latest ? WIN_COOLDOWN_MS - (now.getTime() - latest.occurredAt.getTime()) : 0;
      if (remainingMs > 0) throw new WinError(`En vinnare sattes nyligen. Vänta ${Math.ceil(remainingMs / 60000)} min innan en ny kan krönas.`, 429, remainingMs);
    }
    const season = (await tx.season.findFirst({ where: { endedAt: null }, orderBy: { startedAt: 'desc' } })) ?? IMPLICIT_SEASON;
    const current = await tx.reign.findFirst({ where: { endedAt: null }, include: { player: true }, orderBy: { startedAt: 'desc' } });
    const isSameKing = current?.playerId === winnerId;
    const previousEvents = await tx.winEvent.findMany({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], take: 7 });
    const previousStreakCount = previousEvents[0]?.streakCount ?? 0;
    const streakCount = isSameKing ? previousStreakCount + 1 : 1;
    const winnerWinCount = await tx.winEvent.count({ where: { winnerId } });
    const lastWin = await tx.winEvent.findFirst({ where: { winnerId }, orderBy: { occurredAt: 'desc' } });
    const isFirstWin = winnerWinCount === 0;
    const daysSinceLastWin = lastWin ? differenceInDays(now, lastWin.occurredAt) : null;
    const winner = await tx.player.findUniqueOrThrow({ where: { id: winnerId } });
    if (!winner.isActive) throw new WinError(`${winner.name} är AFK. Aktivera spelaren innan hen kan krönas.`, 400);
    let runnerUpName: string | undefined;
    if (standings.length) {
      const inRound = await tx.player.findMany({ where: { id: { in: standings } }, select: { id: true, name: true, isActive: true } });
      if (inRound.length !== standings.length) throw new WinError('Någon i placeringen finns inte som spelare.', 400);
      const afk = inRound.find((p) => !p.isActive);
      if (afk) throw new WinError(`${afk.name} är AFK. Aktivera spelaren innan hen kan stå i placeringen.`, 400);
      runnerUpName = inRound.find((p) => p.id === standings[1])?.name;
    }
    const eventType = determineEventType({ isSameKing, streakCount, previousStreakCount, isFirstWin, daysSinceLastWin });
    const nationState = determineNationState({ recentWinnerIds: previousEvents.map((e) => e.winnerId), currentStreak: streakCount, brokeBigStreak: !isSameKing && previousStreakCount >= 3 });
    const echo = await loadSeasonEcho(season, winnerId, current?.playerId ?? null, tx);
    const ann = generateAnnouncement({ eventType, winnerName: winner.name, previousKingName: current?.player.name, previousStreakCount, nationState, isFridayFinal: isFriday(now), daysSinceLastWin, recentTexts: previousEvents.map((e) => e.announcementText), echo }, getTheme(season.theme).announcements);
    const returningStreak = !isSameKing && isStreakReturn(previousEvents, winnerId);
    const nemesis = !isSameKing && current ? await getPlayerNemesis(winnerId, season, tx) : null;
    const beatRival = !!nemesis && nemesis.rival.id === current?.playerId;
    if (current && !isSameKing) {
      await tx.reign.update({ where: { id: current.id }, data: { endedAt: now } });
      await tx.reign.create({ data: { playerId: winnerId, startedAt: now } });
    } else if (!current) {
      await tx.reign.create({ data: { playerId: winnerId, startedAt: now } });
    }
    const win = await tx.winEvent.create({ data: { winnerId, previousKingId: current?.playerId, occurredAt: now, eventType, streakCount, previousStreakCount, note: cleanNote, announcementText: ann.text, nationState, isFridayFinal: isFriday(now), standings, requestId: opts.requestId } });
    const a = await tx.announcement.create({ data: { winEventId: win.id, text: ann.text, layout: ann.layout, persona: ann.persona } });
    return {
      result: { win, a, stage: { returningStreak, beatRival }, replayed: false as boolean },
      context: { winnerName: winner.name, previousKingName: current?.player.name ?? null, eventType, nationState, streakCount, previousStreakCount, isFirstWin, isFridayFinal: isFriday(now), beatRival, season, daysSinceLastWin, runnerUpName },
    };
  }, { maxWait: 10_000, timeout: 15_000 });
  if (!saved.context) return saved.result;
  const c = saved.context;
  // A committed retry never adds another audit row or a second recording span.
  await audit('WIN_RECORDED', describeWin({ winner: c.winnerName, previousKing: c.previousKingName, streakCount: c.streakCount }), opts.actor);
  const span = trace.getActiveSpan();
  span?.setAttributes({
    'pingis.winner': c.winnerName, 'pingis.previous_king': c.previousKingName ?? 'ingen',
    'pingis.event_type': c.eventType, 'pingis.nation_state': c.nationState,
    'pingis.streak': c.streakCount, 'pingis.previous_streak': c.previousStreakCount,
    'pingis.first_win': c.isFirstWin, 'pingis.friday_final': c.isFridayFinal,
    'pingis.beat_rival': c.beatRival, 'pingis.season': c.season.slug,
    'pingis.theme': c.season.theme, 'pingis.actor': opts.actor ?? 'web',
  });
  if (c.daysSinceLastWin !== null) span?.setAttribute('pingis.days_since_last_win', c.daysSinceLastWin);
  if (standings.length) span?.setAttribute('pingis.participants', standings.length);
  if (c.runnerUpName) span?.setAttribute('pingis.runner_up', c.runnerUpName);
  return saved.result;
}

// Utan säsong: oförändrat all-time-beteende (används av testerna). Med säsong: spelarens
// vinster filtreras och regeringar klampas mot fönstret, och "nu" fryses vid säsongsslutet
// så att rullande 7/30-dagarsfönster blir meningsfulla även historiskt.
export function buildPlayerStats(player: any, currentKingId?: string | null, season?: SeasonWindow, now: Date = new Date(), previousSeason?: SeasonWindow | null) {
  const scoped = season ? scopePlayerToSeason(player, season, now) : player;
  const asOf = season ? seasonNow(season, now) : now;
  const base = calculatePlayerStats(scoped, currentKingId, asOf);
  // Bara spelare som fanns innan säsongen började kan ha en utvecklingskurva att jämföra med.
  const existedBefore = season && player.createdAt && new Date(player.createdAt).getTime() < season.startedAt.getTime();
  const previousSeasonWins = previousSeason && existedBefore ? (player.wins ?? []).filter((w: any) => isWinInSeason(w.occurredAt, previousSeason)).length : null;
  return { ...base, previousSeasonWins, lastWinAt: scoped.wins?.[0]?.occurredAt ?? null };
}

export async function getLeaderboard(season?: SeasonWindow, db: ReadClient = prisma) {
  const s = season ?? (await resolveSeason());
  const now = new Date();
  // Hela historiken hämtas och skalas ner i minnet: regeringsklampning kan ändå inte
  // uttryckas i en Prisma-query, och datamängden är i storleksordningen tiotal rader.
  const players = await db.player.findMany({ include: { wins: { orderBy: { occurredAt: 'desc' } }, reigns: true, afkPeriods: true } });
  const current = await getCurrentKing(s, db);
  const previous = previousSeasonOf(await db.season.findMany(), s);
  // AFK avgörs vid säsongens "nu": en arkiverad säsong visas som den såg ut när den tog slut.
  const afkPeriods = Object.fromEntries(players.map((p) => [p.id, p.afkPeriods]));
  const afkAt = (playerId: string, at: Date) => isAfkAt(afkPeriods[playerId] ?? [], at);
  const asOf = seasonNow(s, now);
  // Parvis övertag kräver allas vinster i säsongen — räknas här, inte per spelare.
  const seasonWins = players.flatMap((p) => p.wins.filter((w) => isWinInSeason(w.occurredAt, s)));
  const dom = dominance(seasonWins);
  // Kronratingen räknas på samma underlag som övertagen, men är ordningsberoende —
  // crownRatings sorterar därför själv, seasonWins kommer grupperat per spelare.
  const ratings = crownRatings(seasonWins, afkAt);
  // Klassisk kronrating: samma underlag, men bara kronbytet räknas — som innan placeringarna fanns.
  const classicRatings = classicCrownRatings(seasonWins, afkAt);
  const seasonReigns = players.flatMap((p) => p.reigns.flatMap((r) => { const c = clampReignToSeason(r, s, now); return c ? [{ playerId: p.id, startedAt: c.startedAt, endedAt: c.endedAt }] : []; }));
  const stolen = stolenReign(seasonWins, seasonReigns);
  const rawRows = players.map((p) => ({ id: p.id, name: p.name, ...buildPlayerStats(p, current?.playerId, s, now, previous), maxNetTakeovers: dom[p.id]?.net ?? 0, dominatedRivalId: dom[p.id]?.rivalId ?? null, stolenReignMs: stolen[p.id] ?? 0, crownRating: ratings[p.id]?.rating ?? START_RATING, ratedRounds: ratings[p.id]?.played ?? 0, classicCrownRating: classicRatings[p.id]?.rating ?? START_RATING, classicRatedRounds: classicRatings[p.id]?.played ?? 0, isAfk: afkAt(p.id, asOf) })).sort((a,b)=>Number(a.isAfk)-Number(b.isAfk) || b.totalReignMs-a.totalReignMs);
  // AFK-spelare står sist utan placering, så att ingen av dem kan bli "sist i tabellen".
  const ranked = rawRows.map((row, i) => ({ ...row, rank: row.isAfk ? null : i + 1 }));
  const statMap = Object.fromEntries(ranked.map((r) => [r.id, r]));
  const globalStats = calculateGlobalStats(ranked.filter(isRanked) as any, current?.playerId ?? null);
  return ranked.map((row) => ({ ...row, badges: getPlayerBadges(row.id, { playerStats: statMap as any, globalStats }) }));
}

export type LeaderboardRow = Awaited<ReturnType<typeof getLeaderboard>>[number];
export const isRanked = <T extends { rank: number | null }>(row: T): row is T & { rank: number } => row.rank !== null;

export async function getKingdomStats(season?: SeasonWindow) {
  const rows = (await getLeaderboard(season)).filter(isRanked);
  const currentKing = rows.find((r) => r.isCurrentKing) ?? null;
  const fridayChampion = [...rows].sort((a,b)=>b.fridayWins-a.fridayWins)[0] ?? null;
  const longestStreak = [...rows].sort((a,b)=>b.longestStreak-a.longestStreak)[0] ?? null;
  return { currentKing, fridayChampion, longestStreak, mostThroneTime: rows[0] ?? null };
}

export async function getPlayerTimeline(playerId: string, season?: SeasonWindow) {
  const s = season ?? (await resolveSeason());
  const wins = await prisma.winEvent.findMany({ where: { winnerId: playerId, occurredAt: winOccurredAtFilter(s) }, include: { winner: true }, orderBy: { occurredAt: 'desc' }, take: 20 });
  return wins.map((w) => ({ id: w.id, date: w.occurredAt, eventType: w.eventType, announcementText: w.announcementText, previousKingId: w.previousKingId, reignDurationMs: null }));
}

export async function getPlayerWeekdayWins(playerId: string, season?: SeasonWindow) {
  const s = season ?? (await resolveSeason());
  const wins = await prisma.winEvent.findMany({ where: { winnerId: playerId, occurredAt: winOccurredAtFilter(s) }, select: { occurredAt: true } });
  return countByWeekday(wins.map((w) => w.occurredAt));
}

export async function getPlayerStats(playerId: string, season?: SeasonWindow) {
  const s = season ?? (await resolveSeason());
  const current = await getCurrentKing(s);
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { wins: { orderBy: { occurredAt: 'desc' } }, reigns: true } });
  if (!player) return null;
  const stats = buildPlayerStats(player, current?.playerId, s, new Date(), await getPreviousSeason(s));
  const everyone = await getLeaderboard(s);
  const statMap = Object.fromEntries(everyone.map((r) => [r.id, r]));
  // Placeringarna räknas bara bland de rankade — en AFK-spelare får "Ingen ranking" överallt.
  const board = everyone.filter(isRanked);
  return {
    ...stats,
    isAfk: statMap[playerId]?.isAfk ?? false,
    badges: statMap[playerId]?.badges ?? [],
    currentRankByThroneTime: board.findIndex((r) => r.id === playerId) + 1 || null,
    rankByWins: [...board].sort((a,b)=>b.totalWins-a.totalWins).findIndex((r)=>r.id===playerId)+1 || null,
    rankByLongestStreak: [...board].sort((a,b)=>b.longestStreak-a.longestStreak).findIndex((r)=>r.id===playerId)+1 || null,
    rankByFridayWins: [...board].sort((a,b)=>b.fridayWins-a.fridayWins).findIndex((r)=>r.id===playerId)+1 || null,
    // Ratingen räknas fram över hela säsongen på en gång, så den hämtas ur tabellen.
    crownRating: statMap[playerId]?.crownRating ?? START_RATING,
    ratedRounds: statMap[playerId]?.ratedRounds ?? 0,
    classicCrownRating: statMap[playerId]?.classicCrownRating ?? START_RATING,
    classicRatedRounds: statMap[playerId]?.classicRatedRounds ?? 0,
    // Bara spelare som varit med i ett kronbyte rankas. Övriga ligger kvar på startvärdet,
    // och deras inbördes ordning vore ren gissning — samma skäl som trendpilarna utelämnas.
    rankByCrownRating: board.filter((r)=>r.ratedRounds>0).sort((a,b)=>b.crownRating-a.crownRating).findIndex((r)=>r.id===playerId)+1 || null,
  };
}

// Ärkefiende: spelaren man bytt kronan med mest — summan av krona snott + krona snodd ifrån.
// Returnerar null tills minst 2 sådana händelser finns med samma motståndare (annars för tunt underlag).
export async function getPlayerNemesis(playerId: string, season?: SeasonWindow, db: ReadClient = prisma) {
  const s = season ?? (await resolveSeason());
  const events = await db.winEvent.findMany({
    where: { OR: [{ winnerId: playerId }, { previousKingId: playerId }], occurredAt: winOccurredAtFilter(s) },
    select: { winnerId: true, previousKingId: true },
  });
  const tally = new Map<string, { stolenFrom: number; stolenBy: number }>();
  const bump = (id: string, key: 'stolenFrom' | 'stolenBy') => {
    const t = tally.get(id) ?? { stolenFrom: 0, stolenBy: 0 };
    t[key] += 1;
    tally.set(id, t);
  };
  for (const e of events) {
    if (e.winnerId === playerId && e.previousKingId && e.previousKingId !== playerId) {
      bump(e.previousKingId, 'stolenFrom'); // spelaren tog kronan från motståndaren
    } else if (e.previousKingId === playerId && e.winnerId !== playerId) {
      bump(e.winnerId, 'stolenBy'); // motståndaren tog kronan från spelaren
    }
  }
  let bestId: string | null = null;
  let best = { stolenFrom: 0, stolenBy: 0 };
  let bestTotal = 0;
  for (const [id, t] of tally) {
    const total = t.stolenFrom + t.stolenBy;
    if (total > bestTotal) { bestTotal = total; bestId = id; best = t; }
  }
  if (!bestId || bestTotal < 2) return null;
  const rival = await db.player.findUnique({ where: { id: bestId }, select: { id: true, name: true } });
  if (!rival) return null;
  return { rival, stolenFrom: best.stolenFrom, stolenBy: best.stolenBy, total: bestTotal };
}

export async function getPlayerProfile(playerId: string, season?: SeasonWindow) {
  const s = season ?? (await resolveSeason());
  const player = await prisma.player.findUnique({ where: { id: playerId }, include: { afkPeriods: { orderBy: { startedAt: 'asc' } } } });
  if (!player) return null;
  const stats = await getPlayerStats(playerId, s);
  const timeline = await getPlayerTimeline(playerId, s);
  const nemesis = await getPlayerNemesis(playerId, s);
  return { player, stats, timeline, nemesis, season: s };
}

export async function calculateLeaderboard(){ return getLeaderboard(); }
