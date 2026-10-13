import Link from 'next/link';
import type { DuelTable } from '@/lib/domain/duel';
import { FORM_WINDOW } from '@/lib/domain/duel';

const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(Math.round(n))}`;
const streakText = (s: number) => (s > 0 ? `${s} V` : s < 0 ? `${-s} F` : '—');

/** Elo-tabellen och inbördes-matrisen för 1 mot 1. */
export function DuelBoard({ table, names, seasonSlug }: { table: DuelTable; names: Record<string, string>; seasonSlug?: string }) {
  const href = (id: string) => `/players/${id}${seasonSlug ? `?season=${seasonSlug}` : ''}`;
  if (!table.players.length) {
    return <section className='card duel-empty'><h2>Inga matcher än</h2><p className='muted'>Den första 1 mot 1 den här säsongen sätter tabellen. Alla börjar på 1000.</p></section>;
  }
  const ids = table.players.map((p) => p.id);
  return (
    <>
      <section className='duel-section'>
        <h2>Duell-Elo</h2>
        <p className='muted'>Vanlig Elo från 1000, säsong för säsong. Både vanliga dueller och KronMatcher räknas. Form = Elo-förändring över de senaste {FORM_WINDOW} egna matcherna.</p>
        <div className='lb-table-wrap'>
          <table className='duel-table'>
            <thead><tr><th>#</th><th>Spelare</th><th>Elo</th><th>V–F</th><th>Vinst</th><th>Svit</th><th>Längsta</th><th>Form</th></tr></thead>
            <tbody>
              {table.players.map((p, i) => {
                const played = p.wins + p.losses;
                return (
                  <tr key={p.id}>
                    <td className='lb-rank' data-label='#'>{i + 1}</td>
                    <td className='lb-player' data-label='Spelare'><Link href={href(p.id)} className='lb-name'>{names[p.id] ?? '?'}</Link></td>
                    <td data-label='Elo'><span className='lb-rating'>{Math.round(p.rating)}</span></td>
                    <td data-label='V–F'>{p.wins}–{p.losses}</td>
                    <td data-label='Vinst'>{Math.round((p.wins / played) * 100)} %</td>
                    <td data-label='Svit' className={p.streak > 0 ? 'duel-up' : p.streak < 0 ? 'duel-down' : ''}>{streakText(p.streak)}</td>
                    <td data-label='Längsta'>{p.longestWinStreak}</td>
                    <td data-label='Form' className={p.form > 0 ? 'duel-up' : p.form < 0 ? 'duel-down' : ''}>{p.form > 0 ? '▲' : p.form < 0 ? '▼' : ''} {signed(p.form)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className='duel-section'>
        <h2>Inbördes</h2>
        <p className='muted'>Radspelarens vinster–förluster mot kolumnspelaren. Under står snittpoängen i matcher som spelades i ett set med poängen ifyllda.</p>
        <div className='duel-scroll'>
          <table className='duel-matrix'>
            <thead><tr><th>Rad mot kolumn</th>{ids.map((id) => <th key={id}>{names[id]}</th>)}</tr></thead>
            <tbody>
              {ids.map((a) => (
                <tr key={a}>
                  <th>{names[a]}</th>
                  {ids.map((b) => {
                    if (a === b) return <td key={b}>—</td>;
                    const cell = table.pairs[a]?.[b];
                    if (!cell) return <td key={b} className='muted' title='Har inte mötts'>·</td>;
                    const lead = cell.wins - cell.losses;
                    return (
                      <td key={b} className={lead > 0 ? 'duel-up' : lead < 0 ? 'duel-down' : ''} title={`${names[a]} mot ${names[b]}`}>
                        {cell.wins}–{cell.losses}
                        {cell.pointGames > 0 && <small>{(cell.pointsFor / cell.pointGames).toFixed(1)}–{(cell.pointsAgainst / cell.pointGames).toFixed(1)}</small>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
