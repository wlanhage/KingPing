import Link from 'next/link';
import { LeaderboardSummaryCards } from '@/components/leaderboard/LeaderboardSummaryCards';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { Podium } from '@/components/leaderboard/Podium';
import { getKingdomStats, getLeaderboard } from '@/lib/domain/riket';
import { rankDeltas, trendReferenceDate } from '@/lib/domain/rank-trend';
import { resolveSeason } from '@/lib/domain/season';
import { formatDate } from '@/lib/format';
import { getTheme } from '@/lib/theme';

export const dynamic = 'force-dynamic';

/** Utan ?season= visas den pågående säsongen; arkivet länkar hit med slug för avslutade. */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { season: slug } = await searchParams;
  const season = await resolveSeason(slug);
  // Säsongens eget tema: en arkiverad säsong visas med sina egna namn och epitet.
  const theme = getTheme(season.theme);
  const rows = await getLeaderboard(season);
  const summary = await getKingdomStats(season);
  // Trenden räknas fram ur historiken: samma tabell, men med säsongen "avslutad" för en vecka sedan.
  const then = trendReferenceDate(season);
  const trend = then ? rankDeltas(rows, await getLeaderboard({ ...season, endedAt: then })) : undefined;
  // En avslutad säsong har ingen sittande kung — visa den som stod överst när ridån gick ner.
  const ended = Boolean(season.endedAt);
  // Länkar vidare till profiler behåller säsongen så att arkivet hänger ihop.
  const seasonSlug = ended ? season.slug : undefined;
  const summaryData = ended ? { ...summary, currentKing: rows[0] ?? null } : summary;

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>{theme.pages.leaderboard.title}</h1>
        <p className='subtitle'>{theme.pages.leaderboard.subtitle}</p>
      </section>
      {season.endedAt && (
        <p className='season-banner'>
          Visar <strong>{season.name}</strong> · {formatDate(season.startedAt)} — {formatDate(season.endedAt)}
          <Link href='/leaderboard'>Till pågående säsong →</Link>
        </p>
      )}
      <Podium rows={rows} theme={theme} seasonSlug={seasonSlug} />
      <LeaderboardSummaryCards data={summaryData} kingLabel={ended ? 'Säsongens härskare' : 'Nuvarande kung'} />
      <LeaderboardTable rows={rows} theme={theme} trend={trend} seasonSlug={seasonSlug} />
    </main>
  );
}
