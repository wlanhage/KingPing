'use client';
import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { seriesColor } from './palette';

type Series = { playerId: string; name: string; slot: number | null; throneDays: number[]; wins: number[] };
type Metric = 'throneDays' | 'wins';

const H = 300;
const METRICS: { key: Metric; label: string; unit: (v: number) => string }[] = [
  { key: 'throneDays', label: 'Trontid', unit: (v) => `${v.toLocaleString('sv-SE', { maximumFractionDigits: 1 })} d` },
  { key: 'wins', label: 'Vinster', unit: (v) => String(v) },
];
const day = (t: number) => new Date(t).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' });

/** Runda axelmax med 4–5 jämna steg (1, 2, 5 × 10ⁿ). */
function niceTicks(max: number) {
  const raw = Math.max(max, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const top = Math.ceil(max / step) * step || step;
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}

/**
 * Kapplöpningen genom tiderna: ackumulerad trontid (eller vinster) per spelare. Ett y-axelmått
 * åt gången — växeln byter mått, den lägger aldrig två skalor på samma yta. Hårkorset snäpper
 * till närmaste dygn och listar alla spelare där; legenden lyfter fram en linje och tonar de andra.
 */
export function RaceChart({ ticks, series, seasons }: { ticks: number[]; series: Series[]; seasons: { at: number; label: string }[] }) {
  const [metric, setMetric] = useState<Metric>('throneDays');
  const [hover, setHover] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const m = METRICS.find((x) => x.key === metric)!;
  const n = ticks.length;
  const max = Math.max(...series.map((s) => s[metric][n - 1] ?? 0));
  const yTicks = niceTicks(max);
  const top = yTicks[yTicks.length - 1];
  const px = (i: number) => (n > 1 ? (i / (n - 1)) * 1000 : 0);
  const py = (v: number) => H - (v / top) * H;
  const pct = (t: number) => ((t - ticks[0]) / (ticks[n - 1] - ticks[0] || 1)) * 100;

  // Slutetiketter bara där de inte krockar (14 px isär); övriga bärs av legenden och hårkorset.
  const byEnd = [...series].sort((a, b) => b[metric][n - 1] - a[metric][n - 1]);
  let lastY = -Infinity;
  const endLabels = byEnd.filter((s) => { const y = py(s[metric][n - 1]); if (y - lastY < 14) return false; lastY = y; return true; });

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.round(Math.min(Math.max((e.clientX - box.left) / box.width, 0), 1) * (n - 1)));
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const step = e.shiftKey ? 7 : 1;
    setHover((h) => Math.min(Math.max((h ?? n - 1) + (e.key === 'ArrowRight' ? step : -step), 0), n - 1));
  };
  const rows = hover === null ? [] : [...series].sort((a, b) => b[metric][hover] - a[metric][hover]);

  return (
    <div className='race'>
      <div className='race-controls'>
        <div className='vz-segmented' role='group' aria-label='Mått'>
          {METRICS.map((x) => <button key={x.key} type='button' aria-pressed={metric === x.key} onClick={() => setMetric(x.key)}>{x.label}</button>)}
        </div>
        <ul className='vz-legend'>
          {series.map((s) => (
            <li key={s.playerId}>
              <button type='button' aria-pressed={focus === s.playerId} onPointerEnter={() => setFocus(s.playerId)} onPointerLeave={() => setFocus(null)} onFocus={() => setFocus(s.playerId)} onBlur={() => setFocus(null)}>
                <i className='vz-line-key' style={{ background: seriesColor(s.slot) }} />{s.name}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className='race-frame'>
        <div className='race-yaxis' aria-hidden>
          {yTicks.map((t) => <span key={t} style={{ top: py(t) }}>{t}</span>)}
        </div>
        <div
          className='race-plot'
          tabIndex={0}
          role='img'
          aria-label={`${m.label} genom tiderna. Ledare: ${byEnd.slice(0, 3).map((s) => `${s.name} ${m.unit(s[metric][n - 1])}`).join(', ')}. Piltangenter flyttar hårkorset.`}
          onPointerMove={pick}
          onPointerLeave={() => setHover(null)}
          onKeyDown={keys}
          onBlur={() => setHover(null)}
        >
          {yTicks.map((t) => <span key={t} className='race-grid' style={{ top: py(t) }} />)}
          {seasons.map((s) => <span key={s.at} className='race-season' style={{ left: `${pct(s.at)}%` }}><em>{s.label}</em></span>)}
          <svg viewBox={`0 0 1000 ${H}`} preserveAspectRatio='none' aria-hidden>
            {series.map((s) => (
              <polyline
                key={s.playerId}
                points={s[metric].map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(' ')}
                stroke={seriesColor(s.slot)}
                className={focus && focus !== s.playerId ? 'is-faded' : undefined}
              />
            ))}
          </svg>
          {endLabels.map((s) => (
            <span key={s.playerId} className={`race-end${focus && focus !== s.playerId ? ' is-faded' : ''}`} style={{ top: py(s[metric][n - 1]) }}>
              {s.name} <b>{m.unit(s[metric][n - 1])}</b>
            </span>
          ))}
          {hover !== null && (
            <>
              <span className='race-cross' style={{ left: `${(hover / (n - 1 || 1)) * 100}%` }} />
              {series.map((s) => <span key={s.playerId} className='race-dot' style={{ left: `${(hover / (n - 1 || 1)) * 100}%`, top: py(s[metric][hover]), background: seriesColor(s.slot) }} />)}
              <div className={`race-tip${hover > (n - 1) / 2 ? ' is-left' : ''}`} style={{ left: `${(hover / (n - 1 || 1)) * 100}%` }}>
                <div className='race-tip-date'>{day(ticks[hover])}</div>
                {rows.map((s) => (
                  <div key={s.playerId} className='race-tip-row'>
                    <i className='vz-line-key' style={{ background: seriesColor(s.slot) }} />
                    <strong>{m.unit(s[metric][hover])}</strong>
                    <span>{s.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
