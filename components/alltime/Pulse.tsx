import type { AllTime } from '@/lib/domain/alltime';
import { dayKey, weekdayIndex, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '@/lib/domain/local-time';
import { heat } from './palette';

const DAY = 86_400_000;
const label = (t: number) => new Date(t).toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Stockholm' });
const monthName = (t: number) => new Date(t).toLocaleDateString('sv-SE', { month: 'short', timeZone: 'Europe/Stockholm' });
const kr = (n: number) => `${n} ${n === 1 ? 'kröning' : 'kröningar'}`;

/** Skalans förklaring: samma fem steg som cellerna använder. */
function HeatLegend({ max }: { max: number }) {
  return (
    <div className='vz-heat-legend' aria-hidden>
      <span>färre</span>
      {[0, 0.25, 0.5, 0.75, 1].map((f) => <i key={f} className='vz-heat-swatch' style={heat(f * max, max) ?? undefined} />)}
      <span>fler</span>
    </div>
  );
}

/** Rikets puls: en ruta per dygn, en kolumn per vecka. Mitt på dagen (12 UTC) så att sommartid aldrig flyttar en ruta. */
export function PulseCalendar({ data }: { data: AllTime }) {
  const { perDay, from, to } = data;
  let start = Math.floor(from / DAY) * DAY + 12 * 3_600_000;
  start -= weekdayIndex(new Date(start)) * DAY;
  const weeks: number[][] = [];
  for (let t = start; t <= to; t += 7 * DAY) weeks.push(Array.from({ length: 7 }, (_, i) => t + i * DAY));
  const max = Math.max(1, ...Object.values(perDay));
  const busiest = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className='pulse'>
      <div className='vz-scroll'>
        <div className='pulse-cal' style={{ gridTemplateColumns: `2rem repeat(${weeks.length}, 14px)` }}>
          <span />
          {weeks.map((w, i) => {
            const first = w.find((t) => new Date(t).getUTCDate() === 1);
            return <span key={w[0]} className='pulse-month'>{first || i === 0 ? monthName(first ?? w[0]) : ''}</span>;
          })}
          {WEEKDAYS_SHORT.map((d, row) => (
            <div key={d} className='pulse-row' style={{ display: 'contents' }}>
              <span className='pulse-day'>{row % 2 === 0 ? d : ''}</span>
              {weeks.map((w) => {
                const t = w[row];
                if (t < from - DAY || t > to) return <span key={t} />;
                const n = perDay[dayKey(new Date(t))] ?? 0;
                return <span key={t} className={`pulse-cell${n ? '' : ' is-empty'}`} style={heat(n, max)} data-tip={kr(n)} data-tip-label={label(t)} />;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className='vz-foot'>
        {busiest && <p className='vz-note'>Intensivaste dagen: <strong>{label(Date.parse(`${busiest[0]}T12:00:00Z`))}</strong> med {kr(busiest[1])}.</p>}
        <HeatLegend max={max} />
      </div>
    </div>
  );
}

/** När avgörs det: veckodag × timme. Bara timmar och dagar där något hänt tar plats. */
export function PulseClock({ data }: { data: AllTime }) {
  const { clock } = data;
  const hours = clock[0].map((_, h) => h).filter((h) => clock.some((row) => row[h]));
  const days = clock.map((row, d) => ({ row, d })).filter(({ row, d }) => d < 5 || row.some(Boolean));
  if (!hours.length) return null;
  const max = Math.max(...clock.flat());
  const peak = days.flatMap(({ row, d }) => row.map((n, h) => ({ n, d, h }))).sort((a, b) => b.n - a.n)[0];

  return (
    <div className='pulse'>
      <div className='vz-scroll'>
        <table className='vz-grid pulse-clock'>
          <thead>
            <tr>
              <th scope='col'><span className='sr-only'>Veckodag</span></th>
              {hours.map((h) => <th key={h} scope='col'>{String(h).padStart(2, '0')}</th>)}
            </tr>
          </thead>
          <tbody>
            {days.map(({ row, d }) => (
              <tr key={d}>
                <th scope='row'>{WEEKDAYS_SHORT[d]}</th>
                {hours.map((h) => (
                  <td key={h} className={`vz-cell${row[h] ? '' : ' is-empty'}`} style={heat(row[h], max)} tabIndex={row[h] ? 0 : undefined} data-tip={kr(row[h])} data-tip-label={`${WEEKDAYS_LONG[d]} kl ${String(h).padStart(2, '0')}–${String(h + 1).padStart(2, '0')}`}>
                    {row[h] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className='vz-foot'>
        {peak && <p className='vz-note'>Rusningstiden: <strong>{WEEKDAYS_LONG[peak.d]} kl {String(peak.h).padStart(2, '0')}</strong> — {kr(peak.n)} genom tiderna.</p>}
        <HeatLegend max={max} />
      </div>
    </div>
  );
}
