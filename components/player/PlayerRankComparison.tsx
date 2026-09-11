import type { Theme } from '@/lib/theme';

const RANKS: { key: string; label: string; icon: string }[] = [
  { key: 'currentRankByThroneTime', label: 'Trontid', icon: '👑' },
  { key: 'rankByWins', label: 'Vinster', icon: '🏓' },
  { key: 'rankByLongestStreak', label: 'Längsta streak', icon: '🔥' },
  { key: 'rankByFridayWins', label: 'Fredagsvinster', icon: '📅' },
  { key: 'rankByCrownRating', label: 'Kronrating', icon: '⚔️' },
];

function ordinalSuffix(rank: number, top: [string, string, string]): string {
  return rank <= 3 ? top[rank - 1] : `Plats ${rank}`;
}

export function PlayerRankComparison({ stats, copy }: { stats: any; copy: Theme['profile'] }) {
  return (
    <section className='royal-rank-panel'>
      <h2>{copy.rankTitle}</h2>
      <p className='royal-panel-sub'>{copy.rankSubtitle}</p>
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
              <p className='royal-rank-note'>{rank ? ordinalSuffix(rank, copy.rankTop) : 'Ingen ranking'}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
