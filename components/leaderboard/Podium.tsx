import Link from 'next/link';
import { formatDuration } from '@/lib/format';
import type { Theme } from '@/lib/theme';

const MEDAL: Record<number, string> = { 1: '👑', 2: '🥈', 3: '🥉' };

/** Pallen för topp 3 — tvåan till vänster, ettan i mitten, trean till höger. */
export function Podium({ rows, theme, seasonSlug }: { rows: any[]; theme: Theme; seasonSlug?: string }) {
  const top = rows.filter((r) => r.totalReignMs > 0).slice(0, 3);
  if (top.length < 3) return null;
  const epithet = (rank: number) => (rank === 1 ? theme.epithets.rank1 : rank === 2 ? theme.epithets.rank2 : theme.epithets.rank3);
  const order = [top[1], top[0], top[2]];

  return (
    <section className='podium' aria-label='Pallplatser'>
      {order.map((r) => (
        <Link key={r.id} href={`/players/${r.id}${seasonSlug ? `?season=${seasonSlug}` : ''}`} className={`podium-step podium-rank-${r.rank}`}>
          <span className='podium-medal' aria-hidden>{MEDAL[r.rank]}</span>
          <span className='podium-initial' aria-hidden>{r.name.trim()[0]?.toUpperCase() ?? '–'}</span>
          <strong className='podium-name'>{r.name}</strong>
          <span className='podium-epithet'>{epithet(r.rank)}</span>
          <span className='podium-stat'>{formatDuration(r.totalReignMs)} · {r.totalWins} vinster</span>
          <span className='podium-base'>{r.rank}</span>
        </Link>
      ))}
    </section>
  );
}
