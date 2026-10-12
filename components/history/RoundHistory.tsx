import Link from 'next/link';
import { formatDateTime } from '@/lib/format';
import { historyHref, type HistoryFilters } from '@/lib/domain/history';
import { standingsError } from '@/lib/domain/standings';

type HistoryEvent = { id: string; occurredAt: string; winnerId: string; standings: string[]; note: string | null; announcementText: string; finalWinnerPoints?: number | null; finalRunnerUpPoints?: number | null };
export function RoundHistory({ players, events, filters, seasonSlug, total, pageSize }: {
  players: { id: string; name: string }[]; events: HistoryEvent[]; filters: HistoryFilters; seasonSlug?: string; total: number; pageSize: number;
}) {
  const names = new Map(players.map((p) => [p.id, p.name]));
  const suffix = seasonSlug ? `?season=${encodeURIComponent(seasonSlug)}` : '';
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <>
    <form action='/history' className='history-filters' role='search' aria-label='Sök rundor'>
      {seasonSlug && <input type='hidden' name='season' value={seasonSlug} />}
      <label><span>Sök i krönikan</span><input type='search' name='q' maxLength={100} defaultValue={filters.q} placeholder='Spelare, anteckning eller händelse' /></label>
      <label><span>Spelare</span><select name='player' defaultValue={filters.player}><option value=''>Alla spelare</option>{players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <button className='btn' type='submit'>Visa rundor</button>
      {(filters.q || filters.player) && <Link href={historyHref({ season: seasonSlug })}>Rensa filter</Link>}
    </form>
    <div className='history-result-count' role='status'>{total} {total === 1 ? 'runda' : 'rundor'}{filters.player ? ` med ${names.get(filters.player)}` : ''}{filters.q ? ` som matchar ”${filters.q}”` : ''} · senaste först</div>
    {events.length === 0 && <div className='history-empty'><h2>{filters.q || filters.player ? 'Inga rundor matchar' : 'Din nästa runda börjar här'}</h2><p>{filters.q || filters.player ? 'Prova en annan spelare eller sökning.' : 'Spela in er första runda så samlas resultaten här.'}</p><Link href={filters.q || filters.player || filters.page > 1 ? historyHref({ season: seasonSlug }) : '/'}>{filters.q || filters.player || filters.page > 1 ? 'Rensa filter' : 'Spela in en runda →'}</Link></div>}
    <ol className='history-rounds'>
      {events.map((e) => {
        const known = !standingsError(e.winnerId, e.standings) && e.standings.every((id) => names.has(id));
        return <li key={e.id} className='history-round'>
          <div className='history-round-head'><span className='history-winner-mark' aria-hidden>👑</span><div><h2><Link href={`/players/${e.winnerId}${suffix}`}>{names.get(e.winnerId) ?? 'Okänd spelare'}</Link><span> vann rundan</span></h2><time dateTime={e.occurredAt}>{formatDateTime(new Date(e.occurredAt))}{known ? ` · ${e.standings.length} spelare` : ''}</time></div></div>
          {known ? <ol className='history-places' aria-label='Placering'>{e.standings.map((id, i) => <li key={id}><span className='history-place-number'>{i + 1}</span><Link href={`/players/${id}${suffix}`}>{names.get(id)}</Link></li>)}</ol> : <p className='history-unknown'>Placeringen spelades inte in. Bara vinnaren är känd.</p>}
          {known && e.finalWinnerPoints != null && <p className='history-final'>{e.standings.length === 2 ? 'Matchen' : 'Finalen'} {e.finalWinnerPoints}–{e.finalRunnerUpPoints} mot {names.get(e.standings[1])}</p>}
          {e.note && <p className='history-note'>”{e.note}”</p>}
          <details className='history-announcement'><summary>Häroldens ord</summary><p>{e.announcementText}</p></details>
          <Link href={`/rundor/${e.id}`} className='history-round-link'>{known ? 'Resultat, repris & delning →' : 'Visa & dela resultat →'}</Link>
        </li>;
      })}
    </ol>
    {pages > 1 && <nav className='history-pagination' aria-label='Sidor i krönikan'>
      {filters.page > 1 ? <Link href={historyHref({ ...filters, season: seasonSlug, page: filters.page - 1 })}>← Nyare rundor</Link> : <span />}
      <span>Sida {filters.page} av {pages}</span>
      {filters.page < pages ? <Link href={historyHref({ ...filters, season: seasonSlug, page: filters.page + 1 })}>Äldre rundor →</Link> : <span />}
    </nav>}
  </>;
}
