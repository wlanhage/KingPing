import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { isAfkAt } from '@/lib/domain/afk';
import { crownRatingHistory } from '@/lib/domain/crown-rating';
import { listSeasons, resolveSeason, winOccurredAtFilter } from '@/lib/domain/season';
import { EloReport } from '@/components/elo/EloReport';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Elo Lab', description: 'Kronrating över tid: utveckling, form, volatilitet och jämförelse mellan ratingmodeller.' };

export default async function EloPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { season: slug } = await searchParams;
  const season = await resolveSeason(slug);
  const [players, wins, seasons] = await Promise.all([
    prisma.player.findMany({ select: { id: true, name: true, afkPeriods: true }, orderBy: { name: 'asc' } }),
    prisma.winEvent.findMany({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }], select: { id: true, winnerId: true, previousKingId: true, occurredAt: true, standings: true } }),
    listSeasons(),
  ]);
  const afk = new Map(players.map((p) => [p.id, p.afkPeriods]));
  const history = crownRatingHistory(wins, (id, at) => isAfkAt(afk.get(id) ?? [], at));
  return <EloReport key={season.slug} players={players.map(({ id, name }) => ({ id, name }))} history={history}
    season={{ slug: season.slug, name: season.name, ended: Boolean(season.endedAt), start: (season.id === 'implicit' ? wins[0]?.occurredAt ?? new Date() : season.startedAt).toISOString() }}
    seasons={seasons.map((s) => ({ slug: s.slug, name: s.name, ended: Boolean(s.endedAt) }))} />;
}
