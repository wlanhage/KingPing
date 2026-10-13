import Link from 'next/link';
import type { PlayerDuelSummary } from '@/lib/domain/duel';
import { formatDateTime } from '@/lib/format';

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(Math.round(n))}`;

/** Spelarens 1 mot 1 den här säsongen. Visas bara när hen spelat minst en match. */
export function PlayerDuels({ summary, names, playerName, seasonSlug }: { summary: PlayerDuelSummary; names: Record<string, string>; playerName: string; seasonSlug?: string }) {
  const p = summary.player;
  if (!p) return null;
  const suffix = seasonSlug ? `?season=${encodeURIComponent(seasonSlug)}` : '';
  const record = (o: { wins: number; losses: number }) => `${o.wins}–${o.losses}`;
  return (
    <section className='performance' aria-labelledby='duels-title'>
      <header className='performance-head'>
        <div><p className='performance-eyebrow'>1 mot 1</p><h2 id='duels-title'>{playerName} i duell</h2></div>
        <Link href={`/duell${suffix}`} className='performance-sample'>Hela tabellen →</Link>
      </header>
      <dl className='performance-numbers'>
        <div><dt>Duell-Elo</dt><dd>{Math.round(p.rating)}</dd><span>Plats {summary.rank} i 1 mot 1</span></div>
        <div><dt>Vinster–förluster</dt><dd>{p.wins}–{p.losses}</dd><span>{Math.round((p.wins / (p.wins + p.losses)) * 100)} % vunna</span></div>
        <div><dt>Svit</dt><dd>{p.streak > 0 ? `${p.streak} V` : p.streak < 0 ? `${-p.streak} F` : '—'}</dd><span>Längsta vinstsvit: {p.longestWinStreak}</span></div>
      </dl>
      {(summary.favourite || summary.nemesis) && <dl className='performance-numbers'>
        {summary.favourite && <div><dt>Slår helst</dt><dd><Link href={`/players/${summary.favourite.id}${suffix}`}>{names[summary.favourite.id]}</Link></dd><span>{record(summary.favourite)}</span></div>}
        {summary.nemesis && <div><dt>Svårast mot</dt><dd><Link href={`/players/${summary.nemesis.id}${suffix}`}>{names[summary.nemesis.id]}</Link></dd><span>{record(summary.nemesis)}</span></div>}
        {p.giantKills > 0 && <div><dt>Jättedråp</dt><dd>{p.giantKills}</dd><span>Vinster mot 100+ högre Elo</span></div>}
      </dl>}
      <div className='performance-form'>
        <div className='performance-form-heading'><h3>Senaste matcherna</h3><span>Senaste först</span></div>
        <ul className='duel-recent'>
          {summary.recent.map((m) => <li key={m.id} className={m.won ? 'is-win' : ''}>
            <time dateTime={m.occurredAt}>{formatDateTime(new Date(m.occurredAt))}</time>
            <span>{m.won ? 'Vann mot' : 'Förlorade mot'} {names[m.opponentId]}{m.result && ` · ${m.result}`}{m.crown && ' · 👑 KronMatch'}</span>
            <strong className={m.shift >= 0 ? 'duel-up' : 'duel-down'}>{signed(m.shift)}</strong>
          </li>)}
        </ul>
      </div>
    </section>
  );
}
