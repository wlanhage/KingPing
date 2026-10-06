import type { AllTime } from '@/lib/domain/alltime';
import { heat, seriesColor } from './palette';

/** Den hetaste fejden: paret som bytt kronan flest gånger, åt båda hållen. */
export function hottestFeud({ feuds, roster }: AllTime) {
  let best: { a: string; b: string; ab: number; ba: number } | null = null;
  for (const [i, p] of roster.entries()) {
    for (const q of roster.slice(i + 1)) {
      const ab = feuds[p.id]?.[q.id] ?? 0;
      const ba = feuds[q.id]?.[p.id] ?? 0;
      if (ab + ba > (best ? best.ab + best.ba : 0)) best = { a: p.id, b: q.id, ab, ba };
    }
  }
  return best;
}

/**
 * Vem snodde kronan från vem. Rad = den som tog kronan, kolumn = den som förlorade den.
 * Läs en rad för en spelares byten, en kolumn för vem som jagat hen.
 */
export function FeudGrid({ data }: { data: AllTime }) {
  const { feuds, roster } = data;
  const max = Math.max(1, ...roster.flatMap((p) => roster.map((q) => feuds[p.id]?.[q.id] ?? 0)));

  return (
    <div className='vz-scroll'>
      <table className='vz-grid vz-grid-feud'>
        <caption className='vz-grid-caption'>Rad tog kronan från kolumn</caption>
        <thead>
          <tr>
            <th scope='col'><span className='sr-only'>Tog kronan</span></th>
            {roster.map((q) => <th key={q.id} scope='col' className='vz-grid-vertical'><span>{q.name}</span></th>)}
            <th scope='col' className='vz-grid-total'>Totalt</th>
          </tr>
        </thead>
        <tbody>
          {roster.map((p) => (
            <tr key={p.id}>
              <th scope='row'><i className='vz-dot' style={{ background: seriesColor(p.slot) }} />{p.name}</th>
              {roster.map((q) => {
                if (p.id === q.id) return <td key={q.id} className='vz-cell is-self' aria-label='Samma spelare' />;
                const n = feuds[p.id]?.[q.id] ?? 0;
                return (
                  <td key={q.id} className={`vz-cell${n ? '' : ' is-empty'}`} style={heat(n, max)} tabIndex={n ? 0 : undefined} data-tip={n ? `${n} ${n === 1 ? 'gång' : 'gånger'}` : undefined} data-tip-label={n ? `${p.name} tog kronan från ${q.name}` : undefined}>
                    {n || '·'}
                  </td>
                );
              })}
              <td className='vz-grid-total'>{p.takeovers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
