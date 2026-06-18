import Link from 'next/link';
import { formatDate, formatDuration } from '@/lib/format';

const headers = ['#', 'Spelare', 'Status', 'Trontid', 'Vinster', 'Längsta regering', 'Nuvarande streak', 'Längsta streak', 'Fredagsvinster', 'Senaste vinst'];

export function LeaderboardTable({ rows }: { rows: any[] }) {
  if (!rows.length) return <div className='card'>Inga spelare än.</div>;
  return (
    <div className='lb-table-wrap'>
      <table>
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const epithet = r.rank === 1 ? 'Kejsaren' : r.rank === 2 ? 'Kronprinsen' : r.rank === 3 ? 'Rikets tredje kraft' : '';
            return (
              <tr key={r.id} className={r.isCurrentKing ? 'lb-king-row' : ''}>
                <td className='lb-rank'>{r.rank}</td>
                <td>
                  <Link href={`/players/${r.id}`} className='lb-name'>{r.name}</Link>
                  {epithet && <div className='lb-epithet'>{epithet}</div>}
                </td>
                <td>{r.isCurrentKing ? '👑 Nuvarande kung' : 'Utmanare'}</td>
                <td>{formatDuration(r.totalReignMs)}</td>
                <td>{r.totalWins}</td>
                <td>{formatDuration(r.longestReignMs)}</td>
                <td>{r.currentStreak}</td>
                <td>{r.longestStreak}</td>
                <td>{r.fridayWins}</td>
                <td>{formatDate(r.lastWinAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
