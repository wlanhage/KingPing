const RANKS: { key: string; label: string; icon: string }[] = [
  { key: 'currentRankByThroneTime', label: 'Trontid', icon: '👑' },
  { key: 'rankByWins', label: 'Vinster', icon: '🏓' },
  { key: 'rankByLongestStreak', label: 'Längsta streak', icon: '🔥' },
  { key: 'rankByFridayWins', label: 'Fredagsvinster', icon: '📅' },
];

function ordinalSuffix(rank: number): string {
  return rank === 1 ? 'Bäst i riket' : rank === 2 ? 'Tvåa i riket' : rank === 3 ? 'Trea i riket' : `Plats ${rank}`;
}

export function PlayerRankComparison({ stats }: { stats: any }) {
  return (
    <section className='royal-rank-panel'>
      <h2>Rikets rang</h2>
      <p className='royal-panel-sub'>Var spelaren står mot alla andra i riket.</p>
      <div className='royal-rank-grid'>
        {RANKS.map(({ key, label, icon }) => {
          const rank: number | null = stats?.[key] ?? null;
          const isFirst = rank === 1;
          const isPodium = rank !== null && rank <= 3;
          return (
            <article key={key} className={`royal-rank-card${isFirst ? ' is-first' : ''}${isPodium && !isFirst ? ' is-podium' : ''}`}>
              <div className='royal-rank-medal' aria-hidden>{isFirst ? '👑' : icon}</div>
              <p className='royal-rank-label'>{label}</p>
              <p className='royal-rank-value'>{rank ? `#${rank}` : '—'}</p>
              <p className='royal-rank-note'>{rank ? ordinalSuffix(rank) : 'Ingen ranking'}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
