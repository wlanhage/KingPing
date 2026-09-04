import Link from 'next/link';
import { LeaderboardSummaryCards } from '@/components/leaderboard/LeaderboardSummaryCards';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { getKingdomStats, getLeaderboard } from '@/lib/domain/riket';
import { resolveSeason } from '@/lib/domain/season';
import { formatDate } from '@/lib/format';
import { getActiveTheme } from '@/lib/theme/server';

export const dynamic = 'force-dynamic';

/** Utan ?season= visas den pågående säsongen; arkivet länkar hit med slug för avslutade. */
export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { theme } = await getActiveTheme();
  const { season: slug } = await searchParams;
  const season = await resolveSeason(slug);
  const rows = await getLeaderboard(season);
  const summary = await getKingdomStats(season);
  // En avslutad säsong har ingen sittande kung — visa den som stod överst när ridån gick ner.
  const ended = Boolean(season.endedAt);
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
      <LeaderboardSummaryCards data={summaryData} kingLabel={ended ? 'Säsongens härskare' : 'Nuvarande kung'} />
      <LeaderboardTable rows={rows} theme={theme} />
    </main>
  );
}
