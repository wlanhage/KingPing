import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { WIN_COOLDOWN_MS } from '@/lib/domain/riket';
import { resolveSeason } from '@/lib/domain/season';
import { duelTable } from '@/lib/domain/duel';
import { seasonDuels } from '@/lib/duel/server';
import { getTheme } from '@/lib/theme';
import { formatDate } from '@/lib/format';
import { DuelForm } from '@/components/duel/DuelForm';
import { DuelBoard } from '@/components/duel/DuelBoard';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '1 mot 1' };

/**
 * 1 mot 1-spåret: registrera, Elo-tabell och inbördes. `?mot=<id>` kommer från "Utmana kungen"
 * och förifyller en KronMatch mot den spelaren.
 */
export default async function DuelPage({ searchParams }: { searchParams: Promise<{ season?: string; mot?: string }> }) {
  const { season: slug, mot } = await searchParams;
  const season = await resolveSeason(slug);
  const theme = getTheme(season.theme);
  const [players, matches, lastEvent] = await Promise.all([
    prisma.player.findMany({ select: { id: true, name: true, isActive: true }, orderBy: { name: 'asc' } }),
    seasonDuels(season),
    prisma.winEvent.findFirst({ orderBy: { occurredAt: 'desc' }, select: { occurredAt: true } }),
  ]);
  const table = duelTable(matches);
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const active = players.filter((p) => p.isActive).map(({ id, name }) => ({ id, name }));
  const ratings = Object.fromEntries(table.players.map((p) => [p.id, p.rating]));
  const ended = Boolean(season.endedAt);

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>1 mot 1</h1>
        <p className='subtitle'>Två spelare, en vinnare. Eget Elo-spår — och kryssa i KronMatch om kronan står på spel.</p>
      </section>
      {ended ? (
        <p className='season-banner'>
          Visar <strong>{season.name}</strong> · {formatDate(season.startedAt)} — {formatDate(season.endedAt!)}
          <Link href='/duell'>Till pågående säsong →</Link>
        </p>
      ) : (
        <section className='dash-crown-panel'>
          <h2>Ny match</h2>
          <DuelForm
            key={mot ?? 'duel'}
            players={active}
            ratings={ratings}
            challenge={active.some((p) => p.id === mot) ? mot! : null}
            lastWinAt={lastEvent?.occurredAt.toISOString() ?? null}
            cooldownMs={WIN_COOLDOWN_MS}
            copy={{ crown: theme.verbs.crown, crowning: theme.verbs.crowning, crowningNow: theme.verbs.crowningNow, coronation: theme.coronation, lane: { crowning: theme.verbs.crowning, tyranny: theme.nationStates.TYRANNY.name } }}
          />
        </section>
      )}
      <DuelBoard table={table} names={names} seasonSlug={ended ? season.slug : undefined} />
    </main>
  );
}
