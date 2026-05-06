export function PlayerRankComparison({ stats }: { stats: any }) {
  return <div className='card'><h2 style={{ marginTop: 0 }}>Rikets statistik</h2><ul className='muted' style={{ lineHeight: 1.8, marginBottom: 0 }}><li>Rank trontid: #{stats.currentRankByThroneTime ?? '-'}</li><li>Rank vinster: #{stats.rankByWins ?? '-'}</li><li>Rank längsta streak: #{stats.rankByLongestStreak ?? '-'}</li><li>Rank fredagsvinster: #{stats.rankByFridayWins ?? '-'}</li></ul></div>;
}
