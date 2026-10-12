'use client';

import { useMemo, useState } from 'react';
import { lineupOdds, type ForecastCheck, type HeadToHead, type PlacementRating, type SurvivalCurve } from '@/lib/domain/placement-models';
import { Figure } from './EloReport';

const COLORS = ['#f4c76b', '#6cd9ce', '#ab9cff', '#f58fa5', '#80b7ff', '#bce081', '#ffae79', '#e79df0', '#a1c8c2', '#cfbba1'];
const number = (n: number, digits = 0) => n.toLocaleString('sv-SE', { maximumFractionDigits: digits, minimumFractionDigits: digits });
const percent = (p: number) => `${number(p * 100)} %`;
const W = 920, LEFT = 150, RIGHT = 880;

export type PlacementData = {
  players: { id: string; name: string }[];
  placedRounds: number;
  totalRounds: number;
  ratings: PlacementRating[];
  strengths: Record<string, number>;
  headToHead: HeadToHead;
  check: ForecastCheck | null;
  survival: SurvivalCurve[];
  lastLineup: string[];
};

/** Modellerna som bara går att räkna när hela placeringen är känd. Ligger som avsnitt 04 i Elo Lab. */
export function PlacementModels({ data }: { data: PlacementData }) {
  const name = (id: string) => data.players.find((p) => p.id === id)?.name ?? '?';
  const color = (id: string) => COLORS[Math.max(0, data.players.findIndex((p) => p.id === id)) % COLORS.length];
  const rated = data.ratings.map((r) => r.id);
  const [lineup, setLineup] = useState<string[]>(() => (data.lastLineup.length >= 2 ? data.lastLineup : rated.slice(0, 4)));
  const odds = useMemo(() => (lineup.length >= 2 ? lineupOdds(data.strengths, lineup) : null), [data.strengths, lineup]);

  if (!data.placedRounds) {
    return <section className='elo-empty'><span className='elo-section-label'>04 / PLACERINGSMODELLER</span><h2>Inga hela placeringar den här säsongen.</h2><p>Modellerna nedan räknar på hela utslagsordningen. Registrera rundor med alla deltagare så fylls avsnittet i.</p></section>;
  }

  const lo = Math.floor((Math.min(...data.ratings.map((r) => r.low)) - 20) / 50) * 50;
  const hi = Math.ceil((Math.max(...data.ratings.map((r) => r.high)) + 20) / 50) * 50;
  const px = (v: number) => LEFT + (v - lo) / (hi - lo) * (RIGHT - LEFT);
  const longest = Math.max(1, ...data.survival.map((c) => c.survival.length - 1));
  const sx = (k: number) => 62 + k / longest * (RIGHT - 62);
  const sy = (s: number) => 268 - s * (268 - 25);

  return <>
    <section className='elo-abstract'>
      <span className='elo-section-label'>04 / PLACERINGSMODELLER</span>
      <h2>Hela utslagsordningen, inte bara vinnaren</h2>
      <p>{data.placedRounds} av {data.totalRounds} rundor den här säsongen har hel placering. Modellerna här bygger bara på dem.</p>
    </section>

    <div className='elo-figures'>
      <Figure n='07' title='Placeringsrating' description='Plackett–Luce: styrka skattad ur alla placeringar på en gång.' wide caption='Punkten är skattningen, strecket ett 80 %-intervall från 100 omdragningar av rundorna (bootstrap). Brett streck = osäkert. Samma skala som kronratingen: 400 poängs skillnad betyder att den starkare vinner tio gånger av elva i en duell. Spelare med få rundor dras mot 1000.'>
        <svg viewBox={`0 0 ${W} ${data.ratings.length * 40 + 60}`} role='img' aria-label='Placeringsrating med osäkerhetsintervall' className='elo-svg'>
          {[0, 1, 2, 3, 4].map((i) => { const v = lo + (hi - lo) * i / 4; return <g key={i}><line x1={px(v)} x2={px(v)} y1={10} y2={data.ratings.length * 40 + 20} className='elo-gridline' /><text x={px(v)} y={data.ratings.length * 40 + 42} textAnchor='middle'>{number(v)}</text></g>; })}
          <line x1={px(1000)} x2={px(1000)} y1={10} y2={data.ratings.length * 40 + 20} className='elo-baseline' />
          {data.ratings.map((r, i) => { const y = 30 + i * 40; return <g key={r.id}>
            <text x='8' y={y + 4}>{name(r.id)} <tspan opacity='.6'>· {r.rounds} r</tspan></text>
            <line x1={px(r.low)} x2={px(r.high)} y1={y} y2={y} stroke={color(r.id)} strokeWidth='5' opacity='.35' strokeLinecap='round' />
            <circle cx={px(r.rating)} cy={y} r='6' fill={color(r.id)}><title>{`${name(r.id)}: ${number(r.rating)} (80 %: ${number(r.low)}–${number(r.high)})`}</title></circle>
            <text x={RIGHT + 8} y={y + 4}>{number(r.rating)}</text>
          </g>; })}
        </svg>
      </Figure>

      <Figure n='08' title='Vinstchans före rundan' description='Välj vilka som står vid bordet.' caption='Räknat exakt ur placeringsratingen för just den uppställningen. Spelare utan hela placeringar räknas som 1000. Det är en modell, ingen garanti.'>
        <div className='elo-player-chips'>
          {data.players.map((p) => <button key={p.id} aria-pressed={lineup.includes(p.id)} onClick={() => setLineup((l) => (l.includes(p.id) ? l.filter((id) => id !== p.id) : [...l, p.id]))}><i style={{ background: color(p.id) }} />{p.name}{!rated.includes(p.id) && <small>utan placeringar</small>}</button>)}
        </div>
        {!odds ? <p className='elo-chart-empty'>Välj minst två spelare.</p> : <div className='elo-scroll'><table className='elo-stats'>
          <thead><tr><th>Spelare</th><th>Vinner</th><th>Sist</th><th>Väntad plats</th></tr></thead>
          <tbody>{[...lineup].sort((a, b) => odds[b].win - odds[a].win).map((id) => <tr key={id}><th><i style={{ background: color(id), display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginRight: 8 }} />{name(id)}</th><td>{percent(odds[id].win)}</td><td>{percent(odds[id].last)}</td><td>{number(odds[id].expectedPlace, 1)}</td></tr>)}</tbody>
        </table></div>}
        {data.check && <p className='elo-note'>
          Kontroll mot hur det faktiskt gick: varje runda förutsagd med bara rundorna före den ({data.check.rounds} rundor).
          Modellen gav vinnaren i snitt {percent(data.check.meanWinnerOdds)} chans mot {percent(data.check.meanBaselineOdds)} vid jämn gissning,
          och favoriten vann {data.check.favouriteHits} gånger. {data.check.logLoss < data.check.baselineLogLoss ? 'Bättre än att gissa jämnt.' : 'Inte bättre än att gissa jämnt ännu — för lite data eller jämnt fält.'}
        </p>}
      </Figure>

      <Figure n='09' title='Överlevnadskurva' description='Andel rundor en spelare fortfarande står kvar efter k utslagningar.' caption='Kaplan–Meier. En kurva som håller sig hög länge = svår att slå ut. Rundor med färre spelare tar slut tidigare; vinnaren där räknas inte som utslagen. Kurvans sista steg bygger ofta på få rundor.'>
        <svg viewBox={`0 0 ${W} 320`} role='img' aria-label='Överlevnadskurvor per spelare' className='elo-svg'>
          {[0, 0.25, 0.5, 0.75, 1].map((s) => <g key={s}><line x1={62} x2={RIGHT} y1={sy(s)} y2={sy(s)} className='elo-gridline' /><text x={50} y={sy(s) + 4} textAnchor='end'>{percent(s)}</text></g>)}
          {Array.from({ length: longest + 1 }, (_, k) => <text key={k} x={sx(k)} y={290} textAnchor='middle'>{k}</text>)}
          <text x={62} y={313}>Utslagningar i rundan</text>
          {data.survival.map((c) => <path key={c.id} d={c.survival.map((s, k) => (k === 0 ? `M ${sx(0)} ${sy(s)}` : `H ${sx(k)} V ${sy(s)}`)).join(' ')} fill='none' stroke={color(c.id)} strokeWidth='2.5'><title>{`${name(c.id)} · ${c.rounds} rundor`}</title></path>)}
        </svg>
        <div className='elo-readout'>{data.survival.map((c) => <span key={c.id}><i style={{ background: color(c.id) }} />{name(c.id)} <small>{c.rounds} rundor</small></span>)}</div>
      </Figure>

      <Figure n='10' title='Inbördes ur placeringar' description='Hur ofta radspelaren slutade före kolumnspelaren.' wide caption='Räknat på rundor där båda var med. Siffran under är antalet sådana rundor. Grönt = raden slutar oftast före, rosa = efter. Inget behövs utöver placeringen: varje runda med n spelare ger n·(n−1)/2 sådana jämförelser.'>
        <div className='elo-scroll'><table className='elo-matrix'>
          <thead><tr><th>Rad före kolumn</th>{rated.map((id) => <th key={id}>{name(id)}</th>)}</tr></thead>
          <tbody>{rated.map((a) => <tr key={a}><th>{name(a)}</th>{rated.map((b) => {
            const cell = data.headToHead[a]?.[b];
            if (a === b) return <td key={b}>—</td>;
            if (!cell?.met) return <td key={b} title='Har inte varit med i samma runda'>·</td>;
            const share = cell.ahead / cell.met;
            return <td key={b} style={{ background: `rgba(${share >= 0.5 ? '108,217,206' : '245,143,165'},${Math.abs(share - 0.5) * 1.2 + 0.08})` }} title={`${name(a)} före ${name(b)} ${cell.ahead} av ${cell.met}`}>{percent(share)}<br /><small>{cell.met}</small></td>;
          })}</tr>)}</tbody>
        </table></div>
      </Figure>
    </div>
  </>;
}
