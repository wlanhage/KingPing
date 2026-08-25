import { LeaderboardSummaryCards } from '@/components/leaderboard/LeaderboardSummaryCards';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { getKingdomStats, getLeaderboard } from '@/lib/domain/riket';
import { getActiveTheme } from '@/lib/theme/server';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  const { theme } = await getActiveTheme();
  const rows = await getLeaderboard();
  const summary = await getKingdomStats();

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>{theme.pages.leaderboard.title}</h1>
        <p className='subtitle'>{theme.pages.leaderboard.subtitle}</p>
      </section>
      <LeaderboardSummaryCards data={summary} />
      <LeaderboardTable rows={rows} theme={theme} />
    </main>
  );
}
