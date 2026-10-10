'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { backtestSeasons, forecastSeason, labSnapshot, evaluateRanks, evaluateScenarios, comparableBacktests, labCsv, LAB_MODELS, MODEL_NAMES, type LabData, type LabModel, type RankMetrics, type ScenarioMetrics } from '@/lib/domain/season-lab';
import './lab.css';
import { ChaosLab } from './ChaosLab';

const DAY = 86_400_000;
const pct = (n: number) => `${Math.round(n * 100)}%`;
const num = (n: number) => n.toLocaleString('sv-SE', { maximumFractionDigits: 2 });
const date = (n: number) => new Date(n).toLocaleDateString('sv-SE', { timeZone: 'Europe/Stockholm', day: 'numeric', month: 'short', year: 'numeric' });
const days = (n: number) => `${num(n / DAY)} d`;
const descriptions: Record<LabModel, string> = {
  current: 'Dagens ordning består. En enkel, deterministisk referens som en bättre modell måste slå.',
  form: 'Återstående trontid fördelas efter 65% senaste form och 35% säsongens vinstandel. En extra pseudovinst per spelare ger nya spelare en chans.',
  ridge: 'Ridge-regression lär sig återstående trontidsandel från tidigare säsonger. Modellen väger också in senaste trontid, vinstandel i kända deltaganden och hur mycket tid som återstår. Indata skalas från träningshistoriken; regularisering väljs med tidigare säsonger.',
};
function aggregate(metrics: RankMetrics[]) {
  const count = metrics.reduce((s, m) => s + m.count, 0);
  const pairs = metrics.reduce((s, m) => s + m.pairs, 0);
  const winners = metrics.filter((m) => m.winner !== null);
  return { count, mae: count ? metrics.reduce((s, m) => s + m.mae * m.count, 0) / count : null,
    exact: count ? metrics.reduce((s, m) => s + m.exact * m.count, 0) / count : null,
    pair: pairs ? metrics.reduce((s, m) => s + (m.pairAccuracy ?? 0) * m.pairs, 0) / pairs : null,
    winner: winners.length ? winners.reduce((s, m) => s + m.winner!, 0) / winners.length : null };
}
function aggregateScenarios(metrics: ScenarioMetrics[]) {
  const ranks = metrics.reduce((s, m) => s + m.rankCount, 0);
  const title = metrics.filter((m) => m.titleBrier !== null);
  return { coverage: ranks ? metrics.reduce((s, m) => s + m.covered, 0) / ranks : null,
    brier: title.length ? title.reduce((s, m) => s + m.titleBrier!, 0) / title.length : null };
}
export function SeasonLab({ data, initialSeason, now, experimental = false }: { data: LabData; initialSeason: string; now: number; experimental?: boolean }) {
  const [seasonId, setSeasonId] = useState(initialSeason);
  const [model, setModel] = useState<LabModel>('form');
  const [progress, setProgress] = useState(50);
  const [horizonDays, setHorizonDays] = useState(30);
  const [view, setView] = useState<'forecast' | 'backtests'>('forecast');
  const season = data.seasons.find((s) => s.id === seasonId)!;
  const closed = season.end !== null && season.end <= now;
  const cutoff = closed ? season.start + (season.end! - season.start) * progress / 100 : now;
  const horizon = closed ? season.end! : now + horizonDays * DAY;
  const forecast = useMemo(() => forecastSeason(data, seasonId, cutoff, horizon, model), [data, seasonId, cutoff, horizon, model]);
  const final = useMemo(() => closed ? labSnapshot(data, seasonId, season.end!).rows.map((r) => ({ id: r.id, rank: r.currentRank })) : [], [data, seasonId, closed, season.end]);
  const metrics = evaluateRanks(forecast.rows, final);
  const scenarioMetrics = evaluateScenarios(forecast.rows, final);
  const backtests = useMemo(() => backtestSeasons(data, progress / 100, now), [data, progress, now]);
  // Rank and probability diagnostics need different eligibility criteria.
  const shared = comparableBacktests(backtests);
  const finalRanks = new Map(final.map((r) => [r.id, r.rank]));
  const leader = forecast.rows[0];
  const movers = [...forecast.rows].sort((a, b) => (b.currentRank - b.rank) - (a.currentRank - a.rank));
  function exportCsv() {
    const url = URL.createObjectURL(new Blob([labCsv(forecast.rows, final, model)], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = `season-lab-${season.slug}-${model}-${new Date(cutoff).toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  return <main className='page lab-report'>
    <header className='lab-header'>
      <div className='lab-eyebrow'><span className='lab-beacon' /> EXPERIMENT / SÄSONGER <span>OBSERVATION → PROGNOS → UTFALL</span></div>
      <div className='lab-title'><div><h1><span className='lab-title-prefix'>{experimental ? 'Experimental' : 'Season'}</span><em>Lab.</em></h1><p>{experimental ? 'Skruva på verkligheten. Se vad som går sönder.' : 'Prognoser som får möta verkligheten.'}</p></div><div className='lab-stamp'><span>{closed ? 'HISTORISK REPLAY' : 'LEVANDE EXPERIMENT'}</span><strong>{season.name}</strong><small>Underlag till {date(cutoff)}</small></div></div>
      <p className='lab-intro'>{experimental ? 'Ett separat laboratorium för kronkedjor, alternativa regler och möjliga framtider. Skruva på antagandena och utforska vad som händer.' : 'Jämför tabellreferens, formprognos och inlärd regression. Följ föreslagna placeringar mot verkliga utfall och utvärdera modellerna på tidigare säsonger.'}</p>
      <div className='lab-controls'>
        <label>Säsong<select value={seasonId} onChange={(e) => setSeasonId(e.target.value)}>{[...data.seasons].reverse().map((s) => <option key={s.id} value={s.id}>{s.name}{s.end ? ' · avslutad' : ' · pågår'}</option>)}</select></label>
        {!experimental && <label>Modell<select value={model} onChange={(e) => setModel(e.target.value as LabModel)}>{LAB_MODELS.map((m) => <option key={m} value={m}>{MODEL_NAMES[m]}</option>)}</select></label>}
        {closed ? <label className='lab-range'>Prognos vid {progress}% av säsongen<input type='range' min='10' max='90' step='5' value={progress} onChange={(e) => setProgress(Number(e.target.value))} /></label>
          : <label className='lab-range'>Antagen horisont: +{horizonDays} dagar<input type='range' min='7' max='90' value={horizonDays} onChange={(e) => setHorizonDays(Number(e.target.value))} /></label>}
        {!experimental && <button onClick={exportCsv} disabled={!forecast.rows.length}>↓ Exportera prognos</button>}
      </div>
    </header>
    <div className='lab-tabs' role='group' aria-label='Labvy'>{!experimental && <><button aria-pressed={view === 'forecast'} onClick={() => setView('forecast')}>01 / Prognos & facit</button><button aria-pressed={view === 'backtests'} onClick={() => setView('backtests')}>02 / Modellernas provbänk</button></>}<Link href={`${experimental ? '/lab' : '/lab/experimental'}?season=${encodeURIComponent(season.slug)}`}>{experimental ? 'Season Lab →' : '⚗ Experimental Lab →'}</Link><Link href='/elo'>Utforska kronrating →</Link></div>
    {experimental ? <ChaosLab key={seasonId} data={data} seasonId={seasonId} cutoff={cutoff} horizon={horizon} actual={final} /> : view === 'forecast' ? <>
      <section className='lab-stats' aria-label='Sammanfattning'>
        <article><span>Observerade rundor</span><strong>{forecast.rounds}</strong><small>{forecast.placementRounds} med rundplaceringar</small></article>
        <article><span>{closed ? 'Placeringens snittfel' : 'Prognosens favorit'}</span><strong>{closed ? metrics ? num(metrics.mae) : '—' : leader?.name ?? '—'}</strong><small>{closed ? 'Placeringar från facit · lägre är bättre' : leader ? `${pct(leader.titleChance)} av modellens titelscenarier` : 'Inget underlag ännu'}</small></article>
        <article><span>{closed ? 'Exakt placering' : 'Antaget slutdatum'}</span><strong>{closed ? metrics ? pct(metrics.exact) : '—' : date(horizon)}</strong><small>{closed ? `${metrics?.count ?? 0} jämförbara spelare` : 'Scenariodatum — inget fast säsongsslut'}</small></article>
        <article><span>ML-träning</span><strong>{forecast.trainingSeasons} <em>säsonger</em></strong><small>{forecast.trainingSamples} spelarobservationer från tidigare säsonger</small></article>
      </section>
      {model === 'ridge' && forecast.available && <div className='lab-tuning'><strong>Ridge λ = {num(forecast.tuning.penalty)}</strong><span>{forecast.tuning.validationSeasons ? `Valt med ${forecast.tuning.validationSeasons} tidigare valideringssäsonger. Den visade säsongen ingår inte i modellvalet.` : 'Standardvärde: det behövs minst tre tidigare träningssäsonger för tidsordnad validering.'}</span></div>}
      {!forecast.available ? <section className='lab-empty'><span className='lab-kicker'>MER HISTORIA BEHÖVS</span><h2>Modellen behöver två tidigare säsonger.</h2><p>Minst två avslutade säsonger med användbara resultat krävs för regressionen. Välj formprognosen för ett experiment redan nu.</p><button onClick={() => setModel('form')}>Visa formprognos</button></section>
        : !forecast.rows.length ? <section className='lab-empty'><h2>Ett experiment börjar med en observation.</h2><p>Ingen trontid eller vinst finns före den valda tidpunkten för spelare som är aktiva då. Flytta tidpunkten framåt eller välj en annan säsong.</p><Link href='/'>Till spelet →</Link></section> : <>
          <section className='lab-experiment'><div className='lab-section-heading'><div><span className='lab-kicker'>01 / FÖRESLAGEN PLACERING</span><h2>{closed ? 'Prognosen möter verkligheten' : 'En möjlig framtida tabell'}</h2><p>{closed ? `Fryst vid ${date(cutoff)}. Facit kommer från ${date(season.end!)}.` : `Observerat till ${date(now)}, projicerat till ${date(horizon)}.`}</p></div><span className='lab-tag'>{MODEL_NAMES[model]}</span></div>
            <div className='lab-rank-key'><span><i className='lab-dot forecast' /> Prognos</span><span><i className='lab-dot actual' /> {closed ? 'Utfall' : 'Nuvarande rank'}</span><span>Linje: P10–P90 i 400 modellscenarier</span></div>
            <div className='lab-table-scroll'><table className='lab-rank-table'><thead><tr><th>Spelare</th><th>Prognos</th><th>{closed ? 'Utfall' : 'Nu'}</th><th>Rank & scenariospann</th><th>Titelscenarier</th><th>Podium</th><th>Prognos trontid</th></tr></thead><tbody>{forecast.rows.map((r) => {
              const outcome = closed ? finalRanks.get(r.id) : r.currentRank;
              const pos = (rank: number) => `${(rank - 1) / Math.max(1, Math.max(forecast.rows.length, final.length) - 1) * 100}%`;
              return <tr key={r.id}><th scope='row'><Link href={`/players/${r.id}`}>{r.name}</Link><small>{r.wins} vinster · {days(r.throneMs)} hittills</small></th><td className='lab-rank'>#{r.rank}</td><td>{outcome ? `#${outcome}` : 'AFK / ej rankad'}</td><td><div className='lab-rank-track' aria-label={`Prognos ${r.rank}, ${closed ? 'utfall' : 'nu'} ${outcome ?? 'ej rankad'}, scenariospann ${r.lowRank} till ${r.highRank}`}><span className='lab-interval' style={{ left: pos(r.lowRank), width: `${(r.highRank - r.lowRank) / Math.max(1, Math.max(forecast.rows.length, final.length) - 1) * 100}%` }} /><i className='lab-track-dot forecast' style={{ left: pos(r.rank) }} />{outcome && <i className='lab-track-dot actual' style={{ left: pos(outcome) }} />}</div></td><td><div className='lab-chance'><span style={{ width: pct(r.titleChance) }} /><strong>{pct(r.titleChance)}</strong></div></td><td>{pct(r.podiumChance)}</td><td>{days(r.projectedMs)}</td></tr>;
            })}</tbody></table></div>
            <p className='lab-caption'>Placering 1 ligger till vänster. Spann och procent beskriver antagna scenarier, inte kalibrerade sannolikheter. Form och regression varierar framtida trontidsandelar; referensmodellen behåller ordningen. Lika trontid bryts deterministiskt med spelar-id.</p>
            {(metrics || scenarioMetrics) && <div className='lab-verdict'><strong>{!metrics ? 'Inga spelare rankades både vid prognosen och slutet.' : metrics.winner === null ? 'Ingen rankad slutvinnare finns.' : metrics.winner ? 'Prognosen hittade säsongens vinnare.' : 'Prognosen missade säsongens vinnare.'}</strong>{metrics && <span>{metrics.pairAccuracy === null ? 'För få spelare för parjämförelse.' : `${pct(metrics.pairAccuracy)} av spelarparen i rätt ordning.`} {metrics.entered} nytillkomna / återvändande och {metrics.departed} ej längre rankade vid slutet.</span>}{scenarioMetrics && <span>Scenariospannet täckte {scenarioMetrics.coverage === null ? '—' : pct(scenarioMetrics.coverage)} av slutplaceringarna. Titel-Brier: {scenarioMetrics.titleBrier === null ? '—' : num(scenarioMetrics.titleBrier)} (0 är bäst, 2 sämst).</span>}</div>}
          </section>
          <section className='lab-notes'><article><span className='lab-kicker'>MODELLENS HYPOTES</span><h2>{MODEL_NAMES[model]}</h2><p>{descriptions[model]}</p></article><article><span className='lab-kicker'>STÖRSTA FÖRESLAGNA LYFT</span><h2>{movers[0].currentRank > movers[0].rank ? movers[0].name : 'Ingen uppflyttning'}</h2><p>{movers[0].currentRank > movers[0].rank ? `Från #${movers[0].currentRank} till #${movers[0].rank}. Senaste utjämnade vinstandel: ${pct(movers[0].recentShare)}; hela säsongen: ${pct(movers[0].winShare)}.` : 'Modellen behåller fältets nuvarande ordning.'}</p></article></section>
        </>}
    </> : <section className='lab-experiment'><div className='lab-section-heading'><div><span className='lab-kicker'>02 / WALK-FORWARD BACKTEST</span><h2>Hur bra var förslagen?</h2><p>Varje avslutad säsong spelas upp vid samma kalenderandel. Modellerna får bara se tidigare data.</p></div><label className='lab-range'>Tidpunkt: {progress}%<input type='range' min='10' max='90' step='5' value={progress} onChange={(e) => setProgress(Number(e.target.value))} /></label></div>
      {!backtests.length ? <div className='lab-empty'><h3>Facit finns när första säsongen är avslutad.</h3><p>Den pågående säsongen ingår aldrig i modellernas utvärdering.</p></div> : <>
        <div className='lab-model-cards'>{LAB_MODELS.map((m) => {
          const all = backtests.flatMap((b) => b.models.filter((r) => r.model === m && r.available && r.metrics).map((r) => r.metrics!));
          const score = aggregate(all);
          const comparable = aggregate(shared.ranks.flatMap((b) => b.models.filter((r) => r.model === m).map((r) => r.metrics!)));
          const uncertainty = aggregateScenarios(shared.scenarios.flatMap((b) => b.models.filter((r) => r.model === m && r.scenarios).map((r) => r.scenarios!)));
          return <article key={m}><span className='lab-kicker'>{MODEL_NAMES[m]}</span><strong>{comparable.mae === null ? '—' : num(comparable.mae)}</strong><p>Snittfel på {shared.ranks.length} gemensamma testsäsonger</p><dl><div><dt>Exakt rank</dt><dd>{comparable.exact === null ? '—' : pct(comparable.exact)}</dd></div><div><dt>Rätt vinnare</dt><dd>{comparable.winner === null ? '—' : pct(comparable.winner)}</dd></div><div><dt>Par i rätt ordning</dt><dd>{comparable.pair === null ? '—' : pct(comparable.pair)}</dd></div><div><dt>Spann täckte facit</dt><dd>{uncertainty.coverage === null ? '—' : pct(uncertainty.coverage)}</dd></div><div><dt>Titel-Brier ↓ ({shared.scenarios.length} säs.)</dt><dd>{uncertainty.brier === null ? '—' : num(uncertainty.brier)}</dd></div></dl><small>Alla tillgängliga: {all.length} säsonger, {score.count} jämförelser, snittfel {score.mae === null ? '—' : num(score.mae)}.</small></article>;
        })}</div>
        {!shared.ranks.length && <p className='lab-caption'>Ingen testsäsong har ännu tillräckligt med tidigare träningshistoria för alla tre modeller. Säsongsraderna nedan visar de jämförelser som finns.</p>}
        <div className='lab-table-scroll'><table className='lab-backtest-table'><thead><tr><th>Säsong · prognosdatum</th>{LAB_MODELS.map((m) => <th key={m}>{MODEL_NAMES[m]}<small>Snittfel / exakt rank</small></th>)}</tr></thead><tbody>{backtests.map((b) => <tr key={b.seasonId}><th scope='row'><button onClick={() => { setSeasonId(b.seasonId); setView('forecast'); }}>{b.seasonName} ↗</button><small>{date(b.at)}</small></th>{b.models.map((m) => <td key={m.model}>{!m.available ? 'För lite träningsdata' : m.metrics ? <><strong>{num(m.metrics.mae)}</strong> / {pct(m.metrics.exact)}<small>{m.metrics.count} spelare · {m.metrics.entered} tillkom · {m.metrics.departed} avgick</small></> : m.scenarios ? <>Inga gemensamt rankade<small>Titel-Brier: {m.scenarios.titleBrier === null ? '—' : num(m.scenarios.titleBrier)}</small></> : 'Inget prognosunderlag'}</td>)}</tr>)}</tbody></table></div>
        <p className='lab-caption'>Huvudjämförelsen använder samma testsäsonger för alla modeller. Snittfel och exakt rank viktas per spelare; vinnare per utvärderad säsong; parordning per spelarpar. Endast spelare som rankades både vid prognosen och slutet poängsätts. Slutplaceringen behåller hela slutfältets rank. Spanntäckning mäter hur ofta P10–P90 inkluderar facit. Titel-Brier mäter titelprocentens fel, från 0 (perfekt) till 2 (säkert fel); även en oförutsedd slutvinnare räknas som ett missat utfall. Brier viktas per säsong och använder alla gemensamt utvärderbara titelsäsonger, även när hela prognosfältet avgick. Rankfel kräver minst en spelare som rankades vid båda tidpunkterna.</p>
      </>}
    </section>}
    {!experimental && <section className='lab-method'><span className='lab-kicker'>03 / ÖPPEN METOD</span><h2>Vad experimentet vet — och antar</h2><div><p><strong>Tiden räknas på riktigt.</strong> Regeringar klipps vid säsongsstart och prognosdatum. En helg på tronen väger lika mycket här som i spelets tabell. Vinster och rundplaceringar efter prognosdatum används aldrig som indata.</p><p><strong>Historiken är träningsdata.</strong> Regressionens träningspunkter ligger vid 25, 50 och 75% av tidigare avslutade säsonger. Indata standardiseras från enbart träningsdata. Ridge-straff väljs bland 0,1 / 1 / 10 / 100 med tidsordnad validering av hela tidigare säsonger; målet är minsta fel i framtida trontidsandel. Minst två träningssäsonger krävs. Utan en tidigare valideringssäsong används straff 1. Spelarobservationer från samma säsong hålls ihop i varje uppdelning.</p><p><strong>Fältet kan förändras.</strong> Bara spelare som fanns och inte var AFK vid prognosdatum ingår. Scenarierna antar att det fältet består, att tronen är besatt resten av perioden och att framtida trontidsandelar följer modellen. De simulerar inte enskilda matcher eller kalendern. Deltagandebaserad vinstfrekvens använder bara rundor med kända placeringar; okända deltagare blir aldrig antagna förluster.</p><p><strong>Experimentet är rekonstruerat.</strong> Historiska prognoser räknas om från sparade händelser; de är inte låsta förhandstips. Procenten är inte kalibrerad mot facit. En modell har visat värde först när den slår referensen på gemensamma, avslutade testsäsonger.</p></div></section>}
  </main>;
}
