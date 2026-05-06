import { LeaderboardSummaryCards } from '@/components/leaderboard/LeaderboardSummaryCards';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';
import { getKingdomStats, getLeaderboard } from '@/lib/domain/riket';

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();
  const summary = await getKingdomStats();
  return <main className='space-y-6'><div><h1 className='text-4xl font-bold'>Rikets främsta</h1><p className='text-zinc-400'>Rankat efter total tid på tronen.</p></div><LeaderboardSummaryCards data={summary} /><LeaderboardTable rows={rows} /></main>;
}
