'use client';

import { useMemo, useState } from 'react';
import { crownMemory, simulateMultiverse, weekendRebellion } from '@/lib/domain/chaos-lab';
import { evaluateRanks, forecastSeason, LAB_MODELS, MODEL_NAMES, type LabData } from '@/lib/domain/season-lab';
import './chaos.css';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const days = (n: number) => `${(n / 86_400_000).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} d`;
const number = (n: number) => n.toLocaleString('sv-SE', { maximumFractionDigits: 2 });
const PALETTE = ['#75e1bd', '#ba9aff', '#ffc77b', '#ff91b5', '#77bfff', '#e7e392'];

export function ChaosLab({ data, seasonId, cutoff, horizon, actual }: { data: LabData; seasonId: string; cutoff: number; horizon: number; actual: { id: string; rank: number }[] }) {
  const [seed, setSeed] = useState(7);
  const [chaos, setChaos] = useState(25);
  const [boostId, setBoostId] = useState('');
  const [boost, setBoost] = useState(1);
  const [exileId, setExileId] = useState('');
  const [weekendWeight, setWeekendWeight] = useState(0);
  const [focusId, setFocusId] = useState('');
  const memory = useMemo(() => crownMemory(data, seasonId, cutoff), [data, seasonId, cutoff]);
  const activeBoost = memory.players.some((p) => p.id === boostId) ? boostId : null;
  const activeExile = memory.players.some((p) => p.id === exileId) ? exileId : null;
  const universes = useMemo(() => simulateMultiverse(data, seasonId, cutoff, horizon, { seed, chaos: chaos / 100, boostId: activeBoost, boost, exileId: activeExile }), [data, seasonId, cutoff, horizon, seed, chaos, activeBoost, boost, activeExile]);
  const rebellion = useMemo(() => weekendRebellion(data, seasonId, cutoff, weekendWeight / 100), [data, seasonId, cutoff, weekendWeight]);
  const models = useMemo(() => LAB_MODELS.map((model) => forecastSeason(data, seasonId, cutoff, horizon, model)), [data, seasonId, cutoff, horizon]);
  const conflict = memory.players.map((p) => {
    const ranks = models.map((m) => m.rows.find((r) => r.id === p.id)?.rank ?? null);
    const observed = ranks.filter((r): r is number => r !== null);
    return { ...p, ranks, spread: observed.length > 1 ? Math.max(...observed) - Math.min(...observed) : null };
  }).sort((a, b) => (b.spread ?? -1) - (a.spread ?? -1) || a.id.localeCompare(b.id));
  const focus = universes.rows.find((r) => r.id === focusId) ?? universes.rows[0];
  const score = evaluateRanks(universes.rows, actual);
  const paths = focus?.paths ?? [];
  const rankY = (rank: number) => 38 + (rank - 1) / Math.max(1, universes.rows.length - 1) * 172;

  return <div className='chaos-lab'>
    <section className='chaos-opening'><div><span className='lab-kicker'>EXPERIMENTAL / ABSOLUT INTE EN KRISTALLKULA</span><h2>Välkommen till fel framtid.</h2><p>Skruva upp slumpen. Ge en underdog superkrafter. Avskaffa helgen. Här får modellerna göra konstiga saker — och visa vad som händer.</p></div><div className='chaos-reactor' aria-hidden='true'><span /><i /><b>256</b><small>PARALLELLA<br />FRAMTIDER</small></div></section>
    <nav className='chaos-jumps' aria-label='Experiment'><a href='#crown-multiverse'>01 / Multiversum</a><a href='#weekend-rebellion'>02 / Helgrevolution</a><a href='#model-civil-war'>03 / Orakelkriget</a><a href='#crown-memory'>04 / Kronans minne</a></nav>

    <section className='chaos-card chaos-multiverse' id='crown-multiverse'>
      <div className='lab-section-heading'><div><span className='lab-kicker'>01 / KRONANS MULTIVERSUM</span><h2>En krona. 256 möjliga framtider.</h2><p>Vem vinner efter vem? En enkel kronkedja lär av tidigare vinnarföljder och låter framtiden förgrena sig.</p></div><span className='chaos-badge'>STOKASTISKT EXPERIMENT</span></div>
      <div className='chaos-console'>
        <label>Kaos: {chaos}%<input type='range' min='0' max='100' step='5' value={chaos} onChange={(e) => setChaos(Number(e.target.value))} /><small>0 = följ kronkedjan · 100 = lika grundchans</small></label>
        <label>Comeback-boost<select value={activeBoost ?? ''} onChange={(e) => setBoostId(e.target.value)}><option value=''>Ingen superkraft</option>{memory.players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><small>Ändrar framtida chans, inte historiska meriter</small></label>
        <label>Styrka: ×{number(boost)}<input type='range' min='.25' max='4' step='.25' value={boost} disabled={!activeBoost} onChange={(e) => setBoost(Number(e.target.value))} /><small>Multiplikator före normalisering</small></label>
        <label>Framtida frånvaro<select value={activeExile ?? ''} onChange={(e) => setExileId(e.target.value)}><option value=''>Alla är kvar</option>{memory.players.map((p) => <option key={p.id} value={p.id}>{p.name} lämnar fältet</option>)}</select><small>Intjänad trontid stannar kvar</small></label>
      </div>
      <div className='chaos-runbar'><span className='chaos-live'>● Seed {seed} · {memory.transitions} kända övergångar</span><button onClick={() => setSeed((s) => s + 1)}>↻ Skapa nya universum</button><button onClick={() => { setSeed(7); setChaos(25); setBoostId(''); setBoost(1); setExileId(''); }}>Återställ experiment</button></div>
      {!universes.rows.length ? <div className='lab-empty'><h3>Universum väntar på en första observation.</h3><p>Välj en senare tidpunkt eller behåll minst en spelare i det framtida fältet.</p></div> : <>
        <div className='chaos-multiverse-grid'><div className='chaos-branching'><div className='chaos-figure-title'><h3>Tolv tidslinjer för en spelare</h3><label>Följ spelare<select value={focus?.id ?? ''} onChange={(e) => setFocusId(e.target.value)}>{universes.rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div>
          <svg viewBox='0 0 600 260' role='img' aria-label={`Tolv simulerade rankbanor för ${focus?.name}. Tid från prognosdatum till horisonten.`}>
            {Array.from({ length: universes.rows.length }, (_, i) => <g key={i}><line x1='45' x2='575' y1={rankY(i + 1)} y2={rankY(i + 1)} className='chaos-gridline' /><text x='12' y={rankY(i + 1) + 4}>#{i + 1}</text></g>)}
            {paths.map((path, i) => <polyline key={i} points={path.map((rank, point) => `${45 + point / 12 * 530},${rankY(rank)}`).join(' ')} fill='none' stroke={PALETTE[i % PALETTE.length]} strokeWidth='1.8' opacity='.55' />)}
            <text x='45' y='246'>NU</text><text x='505' y='246'>HORISONT</text>
          </svg><p>Tolv av de 256 körningarna. Rank 1 är högst upp; linjerna visar alternativa förlopp, inte historiska resultat.</p></div>
          <div className='chaos-density'><h3>Var landar kronan?</h3>{universes.rows.map((r) => <div className='chaos-density-row' key={r.id}><div><strong>{r.name}</strong><span>{pct(r.titleChance)} titelscenarier</span></div><div className='chaos-histogram' role='img' aria-label={`${r.name}: rankfördelning ${r.histogram.map((count, i) => `plats ${i + 1}: ${count} av ${universes.runs}`).join(', ')}`}>{r.histogram.map((count, i) => <div key={i} title={`#${i + 1}: ${count} av ${universes.runs} scenarier`}><i style={{ height: `${count / universes.runs * 100}%`, background: PALETTE[i % PALETTE.length] }} /><small>{i + 1}</small></div>)}</div></div>)}</div></div>
        <div className='lab-table-scroll'><table><thead><tr><th>Spelare</th><th>Medeltrontidens rank</th><th>Nu</th><th>Titelscenarier</th><th>Podiumscenarier</th><th>Medeltrontid</th>{actual.length > 0 && <th>Verkligt utfall</th>}</tr></thead><tbody>{universes.rows.map((r) => <tr key={r.id}><th scope='row'>{r.name}{r.id === activeExile && <small>Frånvarande i framtiden</small>}</th><td className='lab-rank'>#{r.rank}</td><td>#{r.currentRank}</td><td>{pct(r.titleChance)}</td><td>{pct(r.podiumChance)}</td><td>{days(r.projectedMs)}</td>{actual.length > 0 && <td>{actual.find((a) => a.id === r.id)?.rank ? `#${actual.find((a) => a.id === r.id)!.rank}` : 'Ej rankad'}</td>}</tr>)}</tbody></table></div>
        {score && <div className='lab-verdict'><strong>Referens mot verklig säsong: {number(score.mae)} placeringars snittfel.</strong><span>Det verkliga utfallet är en jämförelsepunkt. Ett ändrat framtidsscenario beskriver en annan värld; felet bevisar inte att interventionen skulle fungera.</span></div>}
      </>}
      <p className='lab-caption'>Kronkedjan använder endast vinnarföljder före prognosdatum och tre pseudohändelser mot säsongens vinstandel. {universes.timingObserved ? 'Framtida tidsluckor dras från observerade luckor mellan registrerade rundor, begränsade till 5 minuter–7 dagar.' : 'För få tidsluckor finns: experimentet antar en runda per dygn.'} {universes.cappedRuns > 0 && `${universes.cappedRuns} körningar nådde gränsen på 512 framtida händelser; sista kronan behöll resten av tiden.`} Inga nya spelare, verkliga matcher eller planerade speltider simuleras. Procenten är scenarier, inte kalibrerade sannolikheter.</p>
    </section>

    <div className='chaos-duo'>
      <section className='chaos-card' id='weekend-rebellion'><span className='lab-kicker'>02 / HELGREVOLUTIONEN</span><h2>Avskaffa helgkungarna.</h2><p>En fredagskrona kan väga tungt utan ett enda bollbyte. Hur ser tabellen ut om helgen förlorar sin makt?</p><label className='chaos-weekend'>Helgens trontid räknas till {weekendWeight}%<input type='range' min='0' max='100' step='10' value={weekendWeight} onChange={(e) => setWeekendWeight(Number(e.target.value))} /></label>
        <div className='lab-table-scroll'><table><thead><tr><th>Spelare</th><th>Ny rank</th><th>Förändring</th><th>Helgtid</th></tr></thead><tbody>{rebellion.rows.map((r) => <tr key={r.id}><th scope='row'>{r.name}</th><td>#{r.rank}</td><td className={r.officialRank > r.rank ? 'chaos-gain' : ''}>{r.officialRank === r.rank ? '—' : `${r.officialRank > r.rank ? '↑' : '↓'} ${Math.abs(r.officialRank - r.rank)}`}</td><td>{days(r.weekendMs)}</td></tr>)}</tbody></table></div><p className='lab-caption'>Alternativ historisk poängregel, inte en prognos. Regeringar klipps vid prognosdatum; lördag och söndag räknas i Stockholm. Spelets riktiga tabell påverkas inte.</p></section>
      <section className='chaos-card' id='model-civil-war'><span className='lab-kicker'>03 / ORAKELKRIGET</span><h2>När modellerna börjar bråka.</h2><p>Vem är svårast att placera? Samma data, samma horisont — olika svar.</p><div className='lab-table-scroll'><table><thead><tr><th>Spelare</th>{LAB_MODELS.map((m) => <th key={m} title={MODEL_NAMES[m]}>{m === 'current' ? 'Tabell' : m === 'form' ? 'Form' : 'ML'}</th>)}<th>Rankspann</th></tr></thead><tbody>{conflict.map((r) => <tr key={r.id}><th scope='row'>{r.name}</th>{r.ranks.map((rank, i) => <td key={i}>{rank === null ? '—' : `#${rank}`}</td>)}<td><span className='chaos-conflict' style={{ opacity: .35 + Math.min(1, (r.spread ?? 0) / 4) * .65 }}>{r.spread === null ? '—' : r.spread}</span></td></tr>)}</tbody></table></div><p className='lab-caption'>Största skillnaden i föreslagen rank visas först. Oenighet är en känslighetssignal, inte ett mått på säkert fel. {models.some((m) => !m.available) && 'ML saknas när färre än två användbara tidigare säsonger finns.'}</p></section>
    </div>

    <section className='chaos-card' id='crown-memory'><div className='lab-section-heading'><div><span className='lab-kicker'>04 / KRONANS MINNE</span><h2>Vem kommer efter vem?</h2><p>Varje cell är ett observerat steg i vinnarföljden. Diagonalen visar försvar av kronan.</p></div><span className='chaos-badge'>{memory.transitions} OBSERVERADE STEG</span></div>
      {!memory.transitions ? <div className='lab-empty'><p>Minst två registrerade vinnare i prognosfältet behövs för ett observerat steg.</p></div> : <div className='lab-table-scroll'><table className='chaos-memory'><thead><tr><th>Från ↓ / Nästa →</th>{memory.players.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead><tbody>{memory.players.map((p) => <tr key={p.id}><th scope='row'>{p.name}</th>{memory.players.map((q) => {
        const cell = memory.cells.find((c) => c.from === p.id && c.to === q.id)!;
        return <td key={q.id} style={{ background: `rgba(186,154,255,${cell.count ? .12 + .5 * cell.probability : .025})` }} title={`${p.name} → ${q.name}: ${cell.count} observationer; ${pct(cell.probability)} utjämnad modellandel`}><strong>{cell.count || '·'}</strong><small>{pct(cell.probability)} modell</small></td>;
      })}</tr>)}</tbody></table></div>}
      <p className='lab-caption'>Antal är observerad historik; modellandelar inkluderar utjämning. Ett steg betyder nästa registrerade vinnare, inte att spelarna möttes i en duell. Fältet innehåller spelare som var tillgängliga vid prognosdatum.</p>
    </section>
  </div>;
}
