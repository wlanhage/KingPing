import Link from 'next/link';
import { formatDate, formatDuration } from '@/lib/format';
import type { Theme } from '@/lib/theme';
import { SortableTable, type SortColumn, type SortValue } from './SortableTable';

const columns: SortColumn[] = [
  { key: 'rank', label: '#' },
  { key: 'name', label: 'Spelare' },
  { key: 'status', label: 'Status' },
  { key: 'totalReignMs', label: 'Trontid', desc: true },
  { key: 'crownRating', label: 'Kronrating', desc: true },
  { key: 'totalWins', label: 'Vinster', desc: true },
  { key: 'longestReignMs', label: 'Längsta regering', desc: true },
  { key: 'currentStreak', label: 'Nuvarande streak', desc: true },
  { key: 'longestStreak', label: 'Längsta streak', desc: true },
  { key: 'fridayWins', label: 'Fredagsvinster', desc: true },
  { key: 'lastWinAt', label: 'Senaste vinst', desc: true },
];

/** Det som visas som "—" eller "Aldrig" är null här, så att det sorteras sist i stället för som ett tal. */
const sortValues = (r: any): Record<string, SortValue> => ({
  rank: r.rank ?? null,
  name: r.name,
  status: r.isCurrentKing ? 0 : r.isAfk ? 2 : 1,
  totalReignMs: r.totalReignMs,
  crownRating: r.ratedRounds ? r.crownRating : null,
  totalWins: r.totalWins,
  longestReignMs: r.longestReignMs,
  currentStreak: r.currentStreak,
  longestStreak: r.longestStreak,
  fridayWins: r.fridayWins,
  lastWinAt: r.lastWinAt ? new Date(r.lastWinAt).getTime() : null,
});

/**
 * Kronratingen står bredvid trontiden med flit: de mäter olika saker. Trontiden räknar
 * kalendern med — en fredagsvinst ger kronan hela helgen — medan ratingen bara rör sig
 * när någon faktiskt vinner en runda.
 */
function CrownRating({ rating, rounds }: { rating?: number; rounds?: number }) {
  if (!rounds) return <span className='lb-rating-empty' title='Har inte varit inblandad i något kronbyte den här säsongen'>—</span>;
  return <span className='lb-rating' title={`${rounds} kröningar har flyttat ratingen`}>{Math.round(rating ?? 0)}</span>;
}

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
      <SortableTable
        columns={columns}
        rows={rows.map((r) => {
          const epithet = r.rank === 1 ? theme.epithets.rank1 : r.rank === 2 ? theme.epithets.rank2 : r.rank === 3 ? theme.epithets.rank3 : '';
          const tr = (
            <tr className={r.isCurrentKing ? 'lb-king-row' : r.isAfk ? 'lb-afk-row' : ''}>
              <td className='lb-rank' data-label='#'>{r.rank ?? '—'}<Trend delta={trend?.[r.id]} /></td>
              <td className='lb-player' data-label='Spelare'>
                <Link href={playerHref(r.id)} className='lb-name'>{r.name}</Link>
                {epithet && <div className='lb-epithet'>{epithet}</div>}
              </td>
              <td data-label='Status'>{r.isCurrentKing ? `👑 Nuvarande ${theme.roles.monarchLower}` : r.isAfk ? '💤 AFK' : theme.roles.challenger}</td>
              <td data-label='Trontid'>{formatDuration(r.totalReignMs)}</td>
              <td data-label='Kronrating'><CrownRating rating={r.crownRating} rounds={r.ratedRounds} /></td>
              <td data-label='Vinster'>{r.totalWins}</td>
              <td data-label='Längsta regering'>{formatDuration(r.longestReignMs)}</td>
              <td data-label='Nuvarande streak'>{r.currentStreak}</td>
              <td data-label='Längsta streak'>{r.longestStreak}</td>
              <td data-label='Fredagsvinster'>{r.fridayWins}</td>
              <td data-label='Senaste vinst'>{formatDate(r.lastWinAt)}</td>
            </tr>
          );
          return { id: r.id, values: sortValues(r), tr };
        })}
      />
    </div>
  );
}
