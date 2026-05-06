export function PlayerRankComparison({ stats }: { stats: any }) {
  return <div className='rounded-2xl bg-zinc-900 p-6 shadow'><h2 className='text-xl font-semibold mb-3'>Rikets statistik</h2><ul className='space-y-1 text-zinc-300'><li>Rank trontid: #{stats.currentRankByThroneTime ?? '-'}</li><li>Rank vinster: #{stats.rankByWins ?? '-'}</li><li>Rank längsta streak: #{stats.rankByLongestStreak ?? '-'}</li><li>Rank fredagsvinster: #{stats.rankByFridayWins ?? '-'}</li></ul></div>;
}
