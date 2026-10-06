import Link from 'next/link';
import type { AllTime } from '@/lib/domain/alltime';
import { seriesColor } from './palette';

/** Rekordboken: rikets bragder genom tiderna, var och en med sin innehavare. */
export function RecordBook({ data }: { data: AllTime }) {
  const player = Object.fromEntries(data.roster.map((p) => [p.id, p]));
  return (
    <div className='records'>
      {data.records.map((r) => {
        const p = player[r.holderId];
        return (
          <article key={r.key} className='record'>
            <p className='record-title'>{r.title}</p>
            <p className='record-value'>{r.value}</p>
            <p className='record-holder'>
              <i className='vz-dot' style={{ background: seriesColor(p?.slot) }} />
              {p ? <Link href={`/players/${p.id}`}>{p.name}</Link> : 'Okänd'}
            </p>
            <p className='record-detail'>
              {r.detail}
              {r.href && <Link href={r.href} className='replay-link'>▶ Repris</Link>}
            </p>
          </article>
        );
      })}
    </div>
  );
}
