import { prisma } from '../prisma';
import { getLeaderboard } from './riket';
import { clampedReignMs, listSeasons, winOccurredAtFilter, type SeasonWindow } from './season';
import type { WeaveTransfer } from './weave';

export type FinaleEventRow = {
  winnerId: string; previousKingId: string | null; occurredAt: Date; eventType: string;
  streakCount: number; previousStreakCount: number | null; announcementText: string;
  note: string | null; isFridayFinal: boolean;
};

export type FinaleTimelineItem =
  | { kind: 'transfer'; transfer: WeaveTransfer }
  | { kind: 'defence'; playerId: string; occurredAt: string };

/** Delar säsongens vinster i tronskiften (kurvor) och försvar (pulser). Ren funktion. */
export function extractTransfers(events: FinaleEventRow[]): {
  transfers: WeaveTransfer[]; defences: Record<string, number>; timeline: FinaleTimelineItem[];
} {
  const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const transfers: WeaveTransfer[] = [];
  const defences: Record<string, number> = {};
  const timeline: FinaleTimelineItem[] = [];
  for (const e of sorted) {
    if (e.previousKingId === e.winnerId) {
      defences[e.winnerId] = (defences[e.winnerId] ?? 0) + 1;
      timeline.push({ kind: 'defence', playerId: e.winnerId, occurredAt: e.occurredAt.toISOString() });
    } else {
      const t: WeaveTransfer = { fromId: e.previousKingId, toId: e.winnerId, eventType: e.eventType, occurredAt: e.occurredAt.toISOString(), announcementText: e.announcementText };
      transfers.push(t);
      timeline.push({ kind: 'transfer', transfer: t });
    }
  }
  return { transfers, defences, timeline };
}

export type FinaleSummary = {
  season: { slug: string; name: string; theme: string; startedAt: string; endedAt: string | null };
  standings: Awaited<ReturnType<typeof getLeaderboard>>;
  transfers: WeaveTransfer[];
  defences: Record<string, number>;
  timeline: FinaleTimelineItem[];
  peaks: {
    longestStreak: { playerId: string; name: string; streak: number } | null;
    biggestBreak: { announcementText: string; brokenStreak: number; byName: string } | null;
  };
  wrapped: { crownings: number; transfers: number; defences: number; players: number; shortestReignMs: number | null; averageReignMs: number | null };
  notes: { text: string; byName: string }[];
  nextSeason: { name: string; theme: string } | null;
};

export async function buildFinaleSummary(season: SeasonWindow): Promise<FinaleSummary> {
  const [standings, events, reigns, seasons] = await Promise.all([
    getLeaderboard(season),
    prisma.winEvent.findMany({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: { occurredAt: 'asc' } }) as Promise<FinaleEventRow[]>,
    prisma.reign.findMany(),
    listSeasons(),
  ]);
  const name = (id: string | null | undefined) => standings.find((s) => s.id === id)?.name ?? 'okänd';
  const { transfers, defences, timeline } = extractTransfers(events);

  const topStreakEvent = [...events].sort((a, b) => b.streakCount - a.streakCount)[0] ?? null;
  const breakEvent = [...events].filter((e) => (e.previousStreakCount ?? 0) >= 2 && e.previousKingId !== e.winnerId)
    .sort((a, b) => (b.previousStreakCount ?? 0) - (a.previousStreakCount ?? 0))[0] ?? null;

  const clamped = reigns.map((r) => clampedReignMs(r, season)).filter((ms) => ms > 0);
  const wrapped = {
    crownings: events.length,
    transfers: transfers.length,
    defences: Object.values(defences).reduce((a, b) => a + b, 0),
    players: standings.length,
    shortestReignMs: clamped.length ? Math.min(...clamped) : null,
    averageReignMs: clamped.length ? Math.round(clamped.reduce((a, b) => a + b, 0) / clamped.length) : null,
  };

  const next = season.endedAt
    ? seasons.filter((s) => s.startedAt.getTime() >= season.endedAt!.getTime() && s.slug !== season.slug)
        .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0] ?? null
    : null;

  return {
    season: { slug: season.slug, name: season.name, theme: season.theme, startedAt: season.startedAt.toISOString(), endedAt: season.endedAt?.toISOString() ?? null },
    standings,
    transfers, defences, timeline,
    peaks: {
      longestStreak: topStreakEvent && topStreakEvent.streakCount >= 2 ? { playerId: topStreakEvent.winnerId, name: name(topStreakEvent.winnerId), streak: topStreakEvent.streakCount } : null,
      biggestBreak: breakEvent ? { announcementText: breakEvent.announcementText, brokenStreak: breakEvent.previousStreakCount ?? 0, byName: name(breakEvent.winnerId) } : null,
    },
    wrapped,
    notes: events.filter((e) => e.note?.trim()).map((e) => ({ text: e.note!.trim(), byName: name(e.winnerId) })),
    nextSeason: next ? { name: next.name, theme: next.theme } : null,
  };
}
