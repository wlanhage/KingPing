'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { START_RATING, K_FACTOR, type RatingSnapshot } from '@/lib/domain/crown-rating';
import { analyzeRatings, ratingHistoryCsv, type RatingModel, type RatingPlayer } from '@/lib/domain/rating-analysis';
import './elo.css';

const COLORS = ['#f4c76b', '#6cd9ce', '#ab9cff', '#f58fa5', '#80b7ff', '#bce081', '#ffae79', '#e79df0', '#a1c8c2', '#cfbba1'];
const number = (n: number, digits = 0) => n.toLocaleString('sv-SE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const signed = (n: number) => `${n > 0 ? '+' : ''}${number(n, 1)}`;
const date = (at: string) => new Date(at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' });
const timestamp = (at: string) => new Date(at).toLocaleString('sv-SE', { timeZone: 'Europe/Stockholm' });
const kinds = { placement: 'Full placering', defense: 'Kronförsvar', takeover: 'Kronbyte', opening: 'Tom tron' };
const W = 920, H = 320, LEFT = 62, RIGHT = 892, TOP = 25, BOTTOM = 268;

export function Figure({ n, title, description, children, caption, wide = false }: { n: string; title: string; description: string; children: ReactNode; caption: string; wide?: boolean }) {
  return <section className={`elo-figure ${wide ? 'elo-wide' : ''}`}>
    <div className='elo-figure-heading'><span className='elo-figure-number'>{n}</span><div><h2>{title}</h2><p>{description}</p></div></div>
    {children}<p className='elo-caption'><strong>Figur {n}.</strong> {caption}</p>
  </section>;
}

function Grid({ min, max, label }: { min: number; max: number; label: string }) {
  return <>{[0, 1, 2, 3, 4].map((i) => {
    const y = TOP + (BOTTOM - TOP) * i / 4;
    return <g key={i}><line x1={LEFT} x2={RIGHT} y1={y} y2={y} className='elo-gridline' /><text x={LEFT - 12} y={y + 4} textAnchor='end'>{number(max - (max - min) * i / 4)}</text></g>;
  })}<text x={LEFT} y={H - 7}>{label}</text></>;
}

export function EloReport({ players, history, season, seasons, children }: {
  players: RatingPlayer[]; history: RatingSnapshot[]; children?: ReactNode;
  season: { slug: string; name: string; ended: boolean; start: string };
  seasons: { slug: string; name: string; ended: boolean }[];
}) {
  const router = useRouter();
  const [model, setModel] = useState<RatingModel>('current');
  const [axis, setAxis] = useState<'calendar' | 'round'>('calendar');
  const [selected, setSelected] = useState<string[]>(() => analyzeRatings(players, history, 'current').filter((r) => r.played > 0).sort((a, b) => b.rating - a.rating).slice(0, 6).map((r) => r.id));
  const [round, setRound] = useState(history.length);
  const [sort, setSort] = useState<'rating' | 'played' | 'momentum' | 'volatility' | 'drawdown'>('rating');
  const rows = useMemo(() => analyzeRatings(players, history, model), [players, history, model]);
  const observed = rows.filter((r) => r.played > 0);
  const chosen = rows.filter((r) => selected.includes(r.id));
  const color = (id: string) => COLORS[players.findIndex((p) => p.id === id) % COLORS.length];
  const point = history[round - 1];
  const placementCount = history.filter((p) => p.kind === 'placement').length;
  const leader = [...observed].sort((a, b) => b.rating - a.rating)[0];
  const rising = [...observed].sort((a, b) => b.momentum - a.momentum)[0];
  const divergence = [...observed].sort((a, b) => Math.abs(b.modelGap) - Math.abs(a.modelGap))[0];
  const fieldMean = observed.length ? observed.reduce((a, b) => a + b.rating, 0) / observed.length : START_RATING;
  const range = chosen.flatMap((r) => r.trajectory);
  const lo = Math.floor((Math.min(START_RATING, ...range) - 20) / 20) * 20;
  const hi = Math.ceil((Math.max(START_RATING, ...range) + 20) / 20) * 20;
  const y = (value: number) => BOTTOM - (value - lo) / (hi - lo) * (BOTTOM - TOP);
  const start = new Date(season.start).getTime();
  const end = history.length ? new Date(history.at(-1)!.at).getTime() : start;
  const x = (i: number) => LEFT + (RIGHT - LEFT) * (axis === 'round' || end === start ? i / Math.max(1, history.length) : ((i === 0 ? start : new Date(history[i - 1].at).getTime()) - start) / (end - start));
  const deltaLimit = Math.max(1, ...chosen.flatMap((r) => r.changes.map((d) => Math.abs(d ?? 0))));
  const last40 = Math.max(0, history.length - 40);
  const momentumLimit = Math.max(20, ...chosen.map((r) => Math.abs(r.momentum))) * 1.15;
  const volatilityLimit = Math.max(5, ...chosen.map((r) => r.volatility ?? 0)) * 1.25;
  const sx = (v: number) => LEFT + (v + momentumLimit) / (2 * momentumLimit) * (RIGHT - LEFT);
  const sy = (v: number) => BOTTOM - v / volatilityLimit * (BOTTOM - TOP);

  function exportCsv() {
    const url = URL.createObjectURL(new Blob([ratingHistoryCsv(chosen, history, model)], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `elo-${season.slug}-${model}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className='elo-report'>
    <header className='elo-header'>
      <div className='elo-eyebrow'><span className='elo-live-dot' /> KINGPING / PERFORMANCE RESEARCH <span>RAPPORT 01</span></div>
      <div className='elo-title-row'><div><h1>Elo <em>Lab.</em></h1><p>Spelet bakom siffrorna.</p></div><div className='elo-edition'><span>{season.ended ? 'AVSLUTAD SÄSONG' : 'PÅGÅENDE STUDIE'}</span><strong>{season.name}</strong><small>{history.length ? `${date(history[0].at)} — ${date(history.at(-1)!.at)}` : 'Inväntar första rundan'}</small></div></div>
      <p className='elo-intro'>Hur förändras vår spelstyrka över tid? En studie av kronrating, form och konkurrens — återskapad runda för runda från rikets historia.</p>
      <div className='elo-toolbar'>
        <label>Säsong <select value={season.slug} onChange={(e) => router.push(`/elo?season=${encodeURIComponent(e.target.value)}`)}>{!seasons.some((s) => s.slug === season.slug) && <option value={season.slug}>{season.name}</option>}{seasons.map((s) => <option key={s.slug} value={s.slug}>{s.name}{s.ended ? ' · arkiv' : ' · pågår'}</option>)}</select></label>
        <fieldset><legend>Ratingmodell</legend><button aria-pressed={model === 'current'} onClick={() => setModel('current')}>Med placeringar</button><button aria-pressed={model === 'classic'} onClick={() => setModel('classic')}>Klassisk</button></fieldset>
        <button className='elo-export' onClick={exportCsv} disabled={!history.length || !chosen.length}>↓ Exportera CSV</button>
      </div>
    </header>

    <section className='elo-summary' aria-label='Sammanfattning'>
      {[
        ['Registrerade rundor', number(history.length), `${placementCount} med full placering`],
        ['Observerade spelare', number(observed.length), `${players.length - observed.length} utan ratingrundor i modellen`],
        ['Datatäckning', `${number(history.length ? placementCount / history.length * 100 : 0)}%`, 'Rundor med känd utslagsordning'],
        ['Fältets snittrating', observed.length ? number(fieldMean, 1) : '—', observed.length ? `${signed(fieldMean - START_RATING)} från startnivån` : 'Inget ratingunderlag ännu'],
      ].map(([label, value, detail]) => <div key={label}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>)}
    </section>

    {!history.length ? <section className='elo-empty'><h2>En studie börjar med en runda.</h2><p>Den här säsongen har inga registrerade rundor. När resultat finns här byggs diagram och insikter automatiskt.</p><Link href='/'>Till spelet →</Link></section> : <>
      <section className='elo-abstract'><span className='elo-section-label'>01 / SAMMANFATTNING</span><h2>Vad historiken visar</h2>
        {!observed.length ? <p>Rundor är registrerade, men den valda modellen har ännu inga ratinggrundande resultat. En kröning på tom tron ändrar ingen rating.</p> : <div className='elo-insights'>
          <article><span>HÖGST RATING</span><h3>{leader?.name}</h3><p>{number(leader!.rating, 1)} poäng efter {leader!.played} ratingrundor. Avståndet till spelarens högsta noterade nivå är {number(leader!.peak - leader!.rating, 1)} poäng.</p></article>
          <article><span>{rising!.momentum > 0 ? 'STARKAST SENASTE FORM' : 'HÖGST SENASTE NETTO'}</span><h3>{rising?.name} <em>{signed(rising!.momentum)}</em></h3><p>Netto över de senaste {Math.min(5, rising!.played)} egna ratingrundorna. Ett kort formfönster beskriver senaste utvecklingen; det är ingen prognos.</p></article>
          <article><span>STÖRST MODELLSKILLNAD</span><h3>{divergence?.name} <em>{signed(divergence!.modelGap)}</em></h3><p>Poäng med placeringar minus klassisk kronrating. {Math.abs(divergence!.modelGap) < 0.05 ? 'Modellerna ger samma slutrating här.' : 'Skillnaden visar hur utslagsordningen och dess följdeffekter påverkar ratingen.'}</p></article>
        </div>}
      </section>

      <section className='elo-player-picker'><div><span className='elo-section-label'>02 / UTFORSKA DATA</span><h2>Välj spelare att följa</h2><p>Urvalet styr figurerna. Sammanfattning och tabell visar hela fältet.</p></div><div className='elo-player-chips'>{rows.map((r) => <button key={r.id} aria-pressed={selected.includes(r.id)} onClick={() => setSelected((s) => s.includes(r.id) ? s.filter((id) => id !== r.id) : [...s, r.id])}><i style={{ background: color(r.id) }} />{r.name}{!r.played && <small>utan underlag</small>}</button>)}<button onClick={() => setSelected(observed.map((r) => r.id))}>Alla observerade</button><button onClick={() => setSelected([])}>Rensa</button></div></section>

      <div className='elo-figures'>
        <Figure n='01' title='Ratingens resa' description='Varje steg är ett registrerat resultat. Pauser ger ingen ratingförändring.' wide caption='Stegkurvor visar rating efter varje runda, från startnivån 1000. Kalenderaxeln behåller uppehållens längd; rundaxeln ger alla resultat lika mycket plats. Samma tidsstämpel ger överlappande steg på kalenderaxeln.'>
          <div className='elo-chart-controls'><fieldset><legend>Horisontell axel</legend><button aria-pressed={axis === 'calendar'} onClick={() => setAxis('calendar')}>Kalendertid</button><button aria-pressed={axis === 'round'} onClick={() => setAxis('round')}>Rundor</button></fieldset><span>{chosen.length} valda spelare</span></div>
          {!chosen.length ? <p className='elo-chart-empty'>Välj en spelare för att visa kurvorna.</p> : <svg viewBox={`0 0 ${W} ${H}`} role='img' aria-label='Kronrating över tid för valda spelare' className='elo-svg'>
            <Grid min={lo} max={hi} label={axis === 'calendar' ? 'Kalendertid · Europe/Stockholm' : 'Registrerad runda'} />
            <line x1={LEFT} x2={RIGHT} y1={y(1000)} y2={y(1000)} className='elo-baseline' />
            {chosen.map((r) => <path key={r.id} d={r.trajectory.map((v, i) => i === 0 ? `M ${x(i)} ${y(v)}` : `H ${x(i)} V ${y(v)}`).join(' ')} fill='none' stroke={color(r.id)} strokeWidth='2.5'><title>{`${r.name}: ${number(r.rating, 1)} poäng`}</title></path>)}
            {[0, 1, 2, 3, 4].map((i) => { const index = Math.round(history.length * i / 4); return <text key={i} x={x(index)} y={BOTTOM + 22} textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}>{axis === 'round' ? index : date(index === 0 ? season.start : history[index - 1].at)}</text>; })}
            <line x1={x(round)} x2={x(round)} y1={TOP} y2={BOTTOM} className='elo-inspector-line' />
            {chosen.map((r) => <circle key={r.id} cx={x(round)} cy={y(r.trajectory[round])} r='4' fill={color(r.id)} />)}
          </svg>}
          <div className='elo-inspector'><label htmlFor='elo-round'>Inspektera runda <strong>{round === 0 ? 'Startnivå' : `${round} / ${history.length}`}</strong></label><input id='elo-round' type='range' min='0' max={history.length} value={round} onChange={(e) => setRound(Number(e.target.value))} />
            <p>{point ? `${timestamp(point.at)} · ${kinds[point.kind]} · vinnare: ${players.find((p) => p.id === point.winnerId)?.name ?? point.winnerId}` : 'Alla börjar på 1000. Ingen spelstyrka har ännu observerats.'}</p>
            <div className='elo-readout'>{chosen.map((r) => <span key={r.id}><i style={{ background: color(r.id) }} />{r.name} <strong>{number(r.trajectory[round], 1)}</strong><small>{round && r.changes[round - 1] !== null ? signed(r.changes[round - 1]!) : 'ingen ratingrunda'}</small></span>)}</div>
          </div>
        </Figure>

        <Figure n='02' title='Resultatens fingeravtryck' description='En värmekarta över de senaste 40 rundorna.' wide caption='Grönt betyder ratingvinst, rosa ratingförlust, 0 en registrerad ratingrunda utan förändring. Ett streck betyder att modellen saknar en ratingrunda för spelaren. Intensiteten skalar med största absoluta förändringen bland valda spelare under hela säsongen.'>
          <div className='elo-heat-legend'><span>−{number(deltaLimit, 1)}</span><i /><span>+{number(deltaLimit, 1)}</span><small>— ingen observation</small></div>
          <div className='elo-scroll'><table className='elo-heatmap'><thead><tr><th>Spelare / runda</th>{history.slice(last40).map((_, i) => <th key={i}>{last40 + i + 1}</th>)}</tr></thead><tbody>{chosen.map((r) => <tr key={r.id}><th>{r.name}</th>{r.changes.slice(last40).map((d, i) => <td key={i}><button onClick={() => setRound(last40 + i + 1)} aria-label={`${r.name}, runda ${last40 + i + 1}: ${d === null ? 'ingen ratingrunda' : signed(d) + ' poäng'}`} style={{ background: d === null ? 'transparent' : `rgba(${d >= 0 ? '108,217,206' : '245,143,165'},${0.12 + Math.abs(d) / deltaLimit * 0.7})` }} title={`${date(history[last40 + i].at)} · ${d === null ? 'Ingen ratingrunda' : signed(d)}`}>{d === null ? '—' : number(d)}</button></td>)}</tr>)}</tbody></table></div>
          {!chosen.length && <p className='elo-chart-empty'>Välj spelare för att visa resultaten.</p>}
        </Figure>

        <Figure n='03' title='Form × svängningar' description='Vem stiger just nu — och hur stora är svängningarna?' caption='X: netto över senaste fem egna ratingrundorna (eller färre). Y: stickprovsstandardavvikelse för alla egna ratingändringar. Minst två ratingrundor krävs för volatilitet. Svängningar mäter inte säkerhet i uppskattad spelstyrka.'>
          <svg viewBox={`0 0 ${W} ${H}`} role='img' aria-label='Punktdiagram för momentum och volatilitet' className='elo-svg'>
            <Grid min={0} max={volatilityLimit} label='← Negativ form                  Netto, senaste 5 ratingrundor                  Positiv form →' />
            <line x1={sx(0)} x2={sx(0)} y1={TOP} y2={BOTTOM} className='elo-baseline' />
            <text x={LEFT} y={15}>Volatilitet · poäng</text>
            {[-1, 0, 1].map((i) => <text key={i} x={sx(i * momentumLimit)} y={BOTTOM + 22} textAnchor={i < 0 ? 'start' : i > 0 ? 'end' : 'middle'}>{signed(i * momentumLimit)}</text>)}
            {chosen.filter((r) => r.volatility !== null).map((r) => <g key={r.id}><circle cx={sx(r.momentum)} cy={sy(r.volatility!)} r={7} fill={color(r.id)} opacity='.85'><title>{`${r.name}: form ${signed(r.momentum)}, volatilitet ${number(r.volatility!, 1)}`}</title></circle><text x={Math.min(RIGHT - 80, sx(r.momentum) + 12)} y={sy(r.volatility!) - 10} fill={color(r.id)}>{r.name}</text></g>)}
          </svg>
          {chosen.some((r) => r.volatility === null) && <p className='elo-note'>För lite underlag för volatilitet: {chosen.filter((r) => r.volatility === null).map((r) => r.name).join(', ')}.</p>}
        </Figure>

        <Figure n='04' title='Fältets styrkeförhållanden' description='Modellens förväntade poäng för radspelaren mot kolumnspelaren.' caption='E(A,B) = 1 / (1 + 10^((Rᴮ − Rᴬ)/400)). 50 % betyder jämn rating. Dessa modellvärden är inte validerade vinstprognoser för en rundpingisrunda. Oratade spelare utesluts.'>
          <div className='elo-scroll'><table className='elo-matrix'><thead><tr><th>Rad mot kolumn</th>{chosen.filter((r) => r.played).map((r) => <th key={r.id}>{r.name}</th>)}</tr></thead><tbody>{chosen.filter((r) => r.played).map((a) => <tr key={a.id}><th>{a.name}</th>{chosen.filter((r) => r.played).map((b) => { const odds = 1 / (1 + 10 ** ((b.rating - a.rating) / 400)); return <td key={b.id} style={{ background: a.id === b.id ? 'transparent' : `rgba(${odds >= .5 ? '108,217,206' : '245,143,165'},${Math.abs(odds - .5) * 1.2 + .08})` }}>{a.id === b.id ? '—' : `${number(odds * 100)}%`}</td>; })}</tr>)}</tbody></table></div>
          {!chosen.some((r) => r.played) && <p className='elo-chart-empty'>Välj spelare med ratingunderlag för att jämföra fältet.</p>}
        </Figure>

        <Figure n='05' title='När mer data ändrar bilden' description='Skillnaden mellan rating med placeringar och klassisk kronrating.' caption='Positivt: högre slutrating när utslagsordningen räknas. Negativt: lägre. Skillnaden omfattar både direkta placeringsresultat och senare följdeffekter via motståndarnas rating. Modellerna använder samma startvärde och historik.'>
          <div className='elo-divergence'>{chosen.map((r) => { const limit = Math.max(1, ...chosen.map((p) => Math.abs(p.modelGap))); return <div className='elo-divergence-row' key={r.id}><span>{r.name}</span><div className='elo-bar-track'><span style={{ left: r.modelGap < 0 ? `${50 - Math.abs(r.modelGap) / limit * 48}%` : '50%', width: `${Math.abs(r.modelGap) / limit * 48}%`, background: r.modelGap < 0 ? '#f58fa5' : '#6cd9ce' }} /></div><strong>{signed(r.modelGap)}</strong></div>; })}</div>
          {!chosen.length && <p className='elo-chart-empty'>Välj spelare för att jämföra modellerna.</p>}
        </Figure>

        <Figure n='06' title='Högsta nivå & motgång' description='Slutrating i förhållande till spelarens historiska topp.' caption='Linjen går från startnivån eller lägsta noterade rating till toppen; punkten visar slutrating. Maximal drawdown i tabellen är den största nedgången från en tidigare topp till en senare botten, med 1000 som första topp.'>
          <svg viewBox={`0 0 ${W} ${Math.max(150, chosen.length * 48 + 65)}`} role='img' aria-label='Intervall för historisk rating med slutrating och topp' className='elo-svg'>
            {[0, 1, 2, 3, 4].map((i) => { const px = 180 + i * 650 / 4; return <g key={i}><line x1={px} x2={px} y1={15} y2={chosen.length * 48 + 25} className='elo-gridline' /><text x={px} y={chosen.length * 48 + 48} textAnchor='middle'>{number(lo + (hi - lo) * i / 4)}</text></g>; })}
            {chosen.map((r, i) => { const px = (v: number) => 180 + (v - lo) / (hi - lo) * 650; const py = 35 + i * 48; return <g key={r.id}><text x='8' y={py + 4}>{r.name}</text><line x1={px(Math.min(...r.trajectory))} x2={px(r.peak)} y1={py} y2={py} stroke={color(r.id)} strokeWidth='4' opacity='.4' /><line x1={px(r.peak)} x2={px(r.peak)} y1={py - 8} y2={py + 8} stroke={color(r.id)} /><circle cx={px(r.rating)} cy={py} r='6' fill={color(r.id)}><title>{`${r.name}: slut ${number(r.rating, 1)}, topp ${number(r.peak, 1)}`}</title></circle><text x='860' y={py + 4}>{number(r.rating)}</text></g>; })}
          </svg>
        </Figure>
      </div>

      <section className='elo-figure'><div className='elo-table-title'><div><span className='elo-section-label'>03 / RESULTATTABELL</span><h2>Alla spelare, alla nyckeltal</h2></div><label>Sortera <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}><option value='rating'>Rating</option><option value='played'>Ratingrundor</option><option value='momentum'>Form</option><option value='volatility'>Volatilitet</option><option value='drawdown'>Maximal drawdown</option></select></label></div>
        <div className='elo-scroll'><table className='elo-stats'><thead><tr><th>Spelare</th><th>Rating</th><th>Δ från 1000</th><th>Rundor</th><th>Topp</th><th>Max drawdown</th><th>Form (≤5)</th><th>Volatilitet</th><th>Modellskillnad</th></tr></thead><tbody>{[...rows].sort((a, b) => Number(b.played > 0) - Number(a.played > 0) || (b[sort] ?? -Infinity) - (a[sort] ?? -Infinity) || a.name.localeCompare(b.name, 'sv')).map((r) => <tr key={r.id}><th><Link href={`/players/${r.id}?season=${encodeURIComponent(season.slug)}`}><i style={{ background: color(r.id) }} />{r.name} →</Link>{!r.played && <small>Ingen observerad ratingrunda</small>}</th><td>{r.played ? number(r.rating, 1) : '—'}</td><td>{r.played ? signed(r.rating - 1000) : '—'}</td><td>{r.played}</td><td>{r.played ? number(r.peak, 1) : '—'}</td><td>{r.played ? number(r.drawdown, 1) : '—'}</td><td className={r.momentum > 0 ? 'elo-positive' : r.momentum < 0 ? 'elo-negative' : ''}>{r.played ? signed(r.momentum) : '—'}</td><td>{r.volatility === null ? '—' : number(r.volatility, 1)}</td><td>{r.played ? signed(r.modelGap) : '—'}</td></tr>)}</tbody></table></div>
        <p className='elo-caption'>Ratingrundor räknar modellens observationer per spelare, inte alla matcher spelaren faktiskt deltagit i. Historiken kan sakna deltagare. Streck markerar saknat underlag.</p>
      </section>
      {children}
    </>}

    <section className='elo-methodology'><span className='elo-section-label'>05 / METOD & TOLKNING</span><h2>Så läser du studien</h2><div className='elo-method-grid'>
      <article><span>01</span><h3>Elo-liknande kronrating</h3><p>Varje säsong börjar på {START_RATING}. K-faktorn är {K_FACTOR}. Vid ett kronbyte får vinnaren K × (1 − förväntad poäng), och den avsatta kungen förlorar lika mycket. Kronrating är en anpassning till rundpingis och den information vi registrerar.</p></article>
      <article><span>02</span><h3>Placering ger fler observationer</h3><p>När hela utslagsordningen finns jämförs varje par av spelare. Varje par använder ratingen före rundan och K / (n − 1). Deltagarnas sammanlagda förändring är noll. Klassisk kronrating ignorerar placeringarna.</p></article>
      <article><span>03</span><h3>Försvar höjer ratingens snitt</h3><p>Utan placering jämförs ett kronförsvar med snittratingen hos andra spelare som hittills finns i modellens tabell. Historiskt AFK-spelare utesluts. Saknas andra används 1000. Bara kungen får poäng: därför kan fältets snitt stiga utan att spelstyrkan har stigit.</p></article>
      <article><span>04</span><h3>Form, risk och små stickprov</h3><p>Form är netto över senaste fem egna ratingrundorna. Volatilitet är stickprovsstandardavvikelsen i alla egna ändringar, med nämnaren n − 1. En liten historik ger instabila mått. Diagrammen visar beskrivande mönster; de bevisar varken förbättrad förmåga eller statistisk signifikans.</p></article>
      <article><span>05</span><h3>Ingen match — ingen förändring</h3><p>Ratingen sjunker inte av inaktivitet. En tom tron ger ingen ratingändring om placering saknas. Vi fyller inte i okända deltagare som förlorare. Ett plant steg kan därför betyda ett uppehåll, en oregistrerad observation eller en verklig nollförändring.</p></article>
      <article><span>06</span><h3>Jämför inom samma säsong</h3><p>Ratingen räknas om kronologiskt från säsongens händelser. Exakt samma tidsstämpel bryts med händelse-id, konsekvent i rapport och tabell. Säsonger börjar om från 1000 och kan ha olika deltagare och datatäckning. Jämför därför utveckling och relativa styrkeförhållanden inom samma säsong. Snittratingen här omfattar enbart spelare med ratingrundor i vald modell.</p></article>
      <article><span>07</span><h3>Placeringsmodeller</h3><p>Placeringsratingen (Plackett–Luce) skattas ur alla hela placeringar på en gång i stället för runda för runda, så ordningen rundorna spelades i spelar ingen roll. Varje spelare får en låtsasvinst och en låtsasförlust mot en spelare på 1000, så att få rundor inte ger extrema värden. Vinstchanserna och kontrollen framåt bygger på samma modell. Rundor med bara vinnaren registrerad ingår inte.</p></article>
    </div><footer>Datakälla: KingPings registrerade rundor och AFK-perioder. Tidszon: Europe/Stockholm. <Link href={`/history?season=${encodeURIComponent(season.slug)}`}>Granska historiken →</Link></footer></section>
  </main>;
}
