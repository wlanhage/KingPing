import { formatDuration } from '@/lib/format';
import type { AllTime } from '@/lib/domain/alltime';
import { seriesColor } from './palette';

const short = (t: number) => new Date(t).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', timeZone: 'Europe/Stockholm' });
const month = (t: number) => new Date(t).toLocaleDateString('sv-SE', { month: 'short', timeZone: 'Europe/Stockholm' });

/** Månadsskiften inom spannet, för tidsaxeln. De sista 5 % lämnas tomma så att etiketten inte klipps vid kanten. */
function monthTicks(from: number, to: number) {
  const ticks: number[] = [];
  const d = new Date(from);
  for (let m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); m.getTime() < to - (to - from) * 0.05; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) ticks.push(m.getTime());
  return ticks;
}

/**
 * Tronbandet: en rad per spelare, ett streck för varje regering. Positionen bär vem och när,
 * färgen är bara spelarens återkommande färg på sidan. Säsongerna ligger som band bakom.
 */
export function ThroneLanes({ data }: { data: AllTime }) {
  const { from, to, lanes, roster, seasonGrid } = data;
  const x = (t: number) => `${((t - from) / (to - from)) * 100}%`;
  const w = (a: number, b: number) => `max(2px, ${((b - a) / (to - from)) * 100}%)`;
  const record = lanes.reduce((best, l) => (l.end - l.start > best.end - best.start ? l : best), lanes[0]);
  // En enda (implicit) säsong ritas inte som band — då finns inget att skilja åt.
  const seasonBands = seasonGrid.length > 1 ? seasonGrid.map((s) => ({ ...s, start: Math.max(from, s.start), end: Math.min(to, s.end) })) : [];
  const name = Object.fromEntries(roster.map((p) => [p.id, p.name]));

  return (
    <div className='lanes'>
      <div className='lanes-head'>
        <span />
        <div className='lanes-track'>
          {seasonBands.map((s) => <span key={s.slug} className='lanes-season-label' style={{ left: x(s.start), width: w(s.start, s.end) }}>{s.label}</span>)}
        </div>
      </div>
      <div className='lanes-body'>
        <div className='lanes-bands' aria-hidden>
          {seasonBands.map((s, i) => <span key={s.slug} className={`lanes-band${i % 2 ? ' is-odd' : ''}`} style={{ left: x(s.start), width: w(s.start, s.end) }} />)}
        </div>
        {roster.map((p) => (
          <div key={p.id} className='lanes-row'>
            <span className='lanes-name'><i className='vz-dot' style={{ background: seriesColor(p.slot) }} />{p.name}</span>
            <div className='lanes-track' role='img' aria-label={`${p.name}: ${p.reigns} regeringar, totalt ${formatDuration(p.throneMs)} på tronen`}>
              {lanes.filter((l) => l.playerId === p.id).map((l) => (
                <span
                  key={l.start}
                  className={`lanes-reign${l === record ? ' is-record' : ''}${l.open ? ' is-open' : ''}`}
                  style={{ left: x(l.start), width: w(l.start, l.end), background: seriesColor(p.slot) }}
                  data-tip={formatDuration(l.end - l.start)}
                  data-tip-label={`${name[l.playerId]} · ${short(l.start)}${l.open ? ' – nu' : ` – ${short(l.end)}`} · ${l.wins} ${l.wins === 1 ? 'vinst' : 'vinster'}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className='lanes-axis'>
        <span />
        <div className='lanes-track'>
          {monthTicks(from, to).map((t) => <span key={t} className='lanes-tick' style={{ left: x(t) }}>{month(t)}</span>)}
        </div>
      </div>
      {record && <p className='vz-note'><span className='lanes-key is-record' /> Längsta regeringen: <strong>{name[record.playerId]}</strong>, {formatDuration(record.end - record.start)} från {short(record.start)}.</p>}
    </div>
  );
}
