import Link from 'next/link';
import type { PlayerPerformanceData } from '@/lib/domain/performance';
import { formatDateTime } from '@/lib/format';

export function PlayerPerformance({ stats, playerName, seasonSlug }: { stats: PlayerPerformanceData; playerName: string; seasonSlug?: string }) {
  const suffix = seasonSlug ? `?season=${encodeURIComponent(seasonSlug)}` : '';
  return (
    <section className='performance' aria-labelledby='performance-title'>
      <header className='performance-head'>
        <div><p className='performance-eyebrow'>Spelet bakom kronan</p><h2 id='performance-title'>Så går det för {playerName}</h2></div>
        <span className='performance-sample'>{stats.played} registrerade rundor</span>
      </header>
      {!stats.played ? <p className='performance-empty'>Spela in en runda med hela placeringen för att se vinstprocent, form och rivaler här.</p> : <>
        <dl className='performance-numbers'>
          <div><dt>Vinstprocent</dt><dd>{Math.round(stats.winRate!)}<small>%</small></dd><span>{stats.wins} vunna · {stats.losses} förlorade</span></div>
          <div><dt>Snittplacering</dt><dd>{stats.averagePlace!.toLocaleString('sv-SE', { maximumFractionDigits: 1 })}</dd><span>Av olika stora startfält</span></div>
          <div><dt>Vinstsvit</dt><dd>{stats.currentStreak}</dd><span>Personbästa: {stats.bestStreak} raka</span></div>
        </dl>
        <div className='performance-form'>
          <div className='performance-form-heading'><h3>Senaste formen</h3><span>Senaste rundan först</span></div>
          <ol className='performance-results' aria-label='Senaste placeringar'>
            {stats.recent.map((r) => <li key={r.roundId}><Link href={`/rundor/${r.roundId}`} className={r.won ? 'is-win' : ''} aria-label={`${formatDateTime(new Date(r.at))}: plats ${r.place} av ${r.participants}${r.won ? ', vinst' : ''}`} title={`${formatDateTime(new Date(r.at))} · ${r.place}/${r.participants}`}><strong>{r.place}</strong><small>/{r.participants}</small></Link></li>)}
          </ol>
        </div>
        {!!stats.rivals.length && <div className='performance-rivals'>
          <h3>Du & dina rivaler</h3>
          <p>Vem placerar sig före när ni spelar samma runda?</p>
          <ul>{stats.rivals.slice(0, 4).map((r) => <li key={r.id}>
            <div className='rival-name'><Link href={`/players/${r.id}${suffix}`}>{r.name} →</Link><small>{r.played} gemensamma rundor</small></div>
            <div className='rival-record'><span><b>{r.ahead}</b> Före</span><span><b>{r.behind}</b> Efter</span></div>
            <div className='rival-meter' role='img' aria-label={`Före ${r.name} i ${r.ahead} av ${r.played} rundor`}><span style={{ width: `${r.winRate}%` }} /></div>
          </li>)}</ul>
        </div>}
      </>}
      <p className='performance-footnote'>Bara rundor med känd placering räknas. Frånvaro räknas aldrig som förlust.{stats.legacyWins > 0 && ` ${stats.legacyWins} vinster utan placering finns i dina övriga meriter.`}</p>
    </section>
  );
}
