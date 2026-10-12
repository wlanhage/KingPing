import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { isAfkAt } from '@/lib/domain/afk';
import { crownRatingHistory } from '@/lib/domain/crown-rating';
import { listSeasons, resolveSeason, winOccurredAtFilter } from '@/lib/domain/season';
import { EloReport } from '@/components/elo/EloReport';
import { PlacementModels } from '@/components/elo/PlacementModels';
import { crownDuels, duelRatings } from '@/lib/domain/duel';
import { seasonDuels } from '@/lib/duel/server';
import { fitPlackettLuce, forecastCheck, headToHead, placedRounds, placementRatings, survivalCurves } from '@/lib/domain/placement-models';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Elo Lab', description: 'Kronrating över tid: utveckling, form, volatilitet och jämförelse mellan ratingmodeller.' };

export default async function EloPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { season: slug } = await searchParams;
  const season = await resolveSeason(slug);
  const [players, wins, seasons, duels] = await Promise.all([
    prisma.player.findMany({ select: { id: true, name: true, afkPeriods: true }, orderBy: { name: 'asc' } }),
    prisma.winEvent.findMany({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }], select: { id: true, winnerId: true, previousKingId: true, occurredAt: true, standings: true } }),
    listSeasons(),
    seasonDuels(season),
  ]);
  const afk = new Map(players.map((p) => [p.id, p.afkPeriods]));
  const history = crownRatingHistory(wins, (id, at) => isAfkAt(afk.get(id) ?? [], at));
  const placed = placedRounds(wins);
  const placement = {
    players: players.map(({ id, name }) => ({ id, name })),
    placedRounds: placed.length,
    totalRounds: wins.length,
    ratings: placementRatings(placed),
    strengths: fitPlackettLuce(placed),
    headToHead: headToHead(placed),
    check: forecastCheck(placed),
    survival: survivalCurves(placed),
    lastLineup: placed.at(-1)?.standings ?? [],
  };
  const matches = [...duels.map((d) => ({ id: d.id, winnerId: d.winnerId, loserId: d.loserId, occurredAt: d.occurredAt, crown: false })), ...crownDuels(placed)];
  const duel = {
    ratings: duelRatings(matches),
    recent: matches.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()).slice(0, 8).map((m) => ({ ...m, occurredAt: new Date(m.occurredAt).toISOString() })),
  };
  return <EloReport key={season.slug} players={players.map(({ id, name }) => ({ id, name }))} history={history}
    season={{ slug: season.slug, name: season.name, ended: Boolean(season.endedAt), start: (season.id === 'implicit' ? wins[0]?.occurredAt ?? new Date() : season.startedAt).toISOString() }}
    seasons={seasons.map((s) => ({ slug: s.slug, name: s.name, ended: Boolean(s.endedAt) }))}>
    <PlacementModels data={placement} duel={duel} />
  </EloReport>;
}
