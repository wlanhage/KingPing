import { LeaderboardSummaryCards } from '@/components/leaderboard/LeaderboardSummaryCards';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { getKingdomStats, getLeaderboard } from '@/lib/domain/riket';

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  const summary = await getKingdomStats();

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>Rikets främsta</h1>
        <p className='subtitle'>Rankat efter total tid på tronen.</p>
      </section>
      <LeaderboardSummaryCards data={summary} />
      <LeaderboardTable rows={rows} />
    </main>
  );
}
