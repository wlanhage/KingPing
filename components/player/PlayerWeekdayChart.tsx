import { WEEKDAYS_LONG, WEEKDAYS_SHORT } from '@/lib/domain/weekday';

/** Ren CSS-stapelgraf: när på veckan spelaren brukar vinna. */
export function PlayerWeekdayChart({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  const max = Math.max(...counts);
  const bestDays = counts.flatMap((c, i) => (c === max ? [i] : []));
  const bestLabel = bestDays.map((i) => WEEKDAYS_LONG[i]).reduce((acc, d, i, arr) => (i === 0 ? d : i === arr.length - 1 ? `${acc} och ${d}` : `${acc}, ${d}`), '');

  return (
    <section className='weekday-panel'>
      <h2>Vinster per veckodag</h2>
      <p className='weekday-summary'>Farligast på <strong>{bestLabel}</strong> — {max} av {total} vinster.</p>
      <div className='weekday-bars' role='img' aria-label={counts.map((c, i) => `${WEEKDAYS_SHORT[i]}: ${c}`).join(', ')}>
        {counts.map((c, i) => (
          <div key={i} className={`weekday-col${bestDays.includes(i) ? ' is-best' : ''}${i === 4 ? ' is-friday' : ''}`}>
            <span className='weekday-count'>{c || ''}</span>
            <div className='weekday-track'><div className='weekday-bar' style={{ height: `${(c / max) * 100}%` }} /></div>
            <span className='weekday-label'>{WEEKDAYS_SHORT[i]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
