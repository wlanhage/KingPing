import Link from 'next/link';
import { formatDate, formatDuration } from '@/lib/format';
import type { Theme } from '@/lib/theme';

const headers = ['#', 'Spelare', 'Status', 'Trontid', 'Vinster', 'Längsta regering', 'Nuvarande streak', 'Längsta streak', 'Fredagsvinster', 'Senaste vinst'];

function Trend({ delta }: { delta: number | null | undefined }) {
  if (delta === null || delta === undefined) return null;
  if (delta === 0) return <span className='lb-trend flat' title='Oförändrad placering senaste veckan'>–</span>;
  const up = delta > 0;
  return (
    <span className={`lb-trend ${up ? 'up' : 'down'}`} title={`${up ? 'Klättrat' : 'Tappat'} ${Math.abs(delta)} placering${Math.abs(delta) === 1 ? '' : 'ar'} senaste veckan`}>
      {up ? '▲' : '▼'}{Math.abs(delta)}
    </span>
  );
}

/** `trend` är placeringsskillnad mot för en vecka sedan (positivt = klättrat); utelämnas visas inga pilar. */
export function LeaderboardTable({ rows, theme, trend, seasonSlug }: { rows: any[]; theme: Theme; trend?: Record<string, number | null>; seasonSlug?: string }) {
  const playerHref = (id: string) => `/players/${id}${seasonSlug ? `?season=${seasonSlug}` : ''}`;
  if (!rows.length) return <div className='card'>Inga spelare än.</div>;
  return (
    <div className='lb-table-wrap'>
      <table>
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const epithet = r.rank === 1 ? theme.epithets.rank1 : r.rank === 2 ? theme.epithets.rank2 : r.rank === 3 ? theme.epithets.rank3 : '';
            return (
              <tr key={r.id} className={r.isCurrentKing ? 'lb-king-row' : ''}>
                <td className='lb-rank' data-label='#'>{r.rank}<Trend delta={trend?.[r.id]} /></td>
                <td className='lb-player' data-label='Spelare'>
                  <Link href={playerHref(r.id)} className='lb-name'>{r.name}</Link>
                  {epithet && <div className='lb-epithet'>{epithet}</div>}
                </td>
                <td data-label='Status'>{r.isCurrentKing ? `👑 Nuvarande ${theme.roles.monarchLower}` : theme.roles.challenger}</td>
                <td data-label='Trontid'>{formatDuration(r.totalReignMs)}</td>
                <td data-label='Vinster'>{r.totalWins}</td>
                <td data-label='Längsta regering'>{formatDuration(r.longestReignMs)}</td>
                <td data-label='Nuvarande streak'>{r.currentStreak}</td>
                <td data-label='Längsta streak'>{r.longestStreak}</td>
                <td data-label='Fredagsvinster'>{r.fridayWins}</td>
                <td data-label='Senaste vinst'>{formatDate(r.lastWinAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
