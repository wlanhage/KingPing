import Link from 'next/link';
import { formatDuration } from '@/lib/format';
import type { AllTime } from '@/lib/domain/alltime';
import { heat, seriesColor } from './palette';

const pct = (share: number) => `${Math.round(share * 100)} %`;

/**
 * Vem ägde vilken säsong: varje spelares andel av säsongens trontid. En kolumn per säsong,
 * mästaren kronad. Cellens värde står alltid i klartext; färgen är bara ögats genväg.
 */
export function SeasonGrid({ data }: { data: AllTime }) {
  const { seasonGrid, roster } = data;
  const share = (s: AllTime['seasonGrid'][number], id: string) => (s.total ? s.cells[id].ms / s.total : 0);
  const max = Math.max(...seasonGrid.flatMap((s) => roster.map((p) => share(s, p.id))));

  return (
    <div className='vz-scroll'>
      <table className='vz-grid'>
        <thead>
          <tr>
            <th scope='col'><span className='sr-only'>Spelare</span></th>
            {seasonGrid.map((s) => (
              <th key={s.slug} scope='col'>
                <Link href={`/leaderboard?season=${s.slug}`} className='vz-grid-season'>
                  <span>{s.label}</span>
                  <small>{s.ended ? s.name : `${s.name} · pågår`}</small>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {roster.map((p) => (
            <tr key={p.id}>
              <th scope='row'><i className='vz-dot' style={{ background: seriesColor(p.slot) }} />{p.name}</th>
              {seasonGrid.map((s) => {
                const c = s.cells[p.id];
                const champ = s.championId === p.id;
                if (!c.ms && !c.wins) return <td key={s.slug} className='vz-cell is-empty' aria-label='Inte med'>·</td>;
                return (
                  <td
                    key={s.slug}
                    className={`vz-cell${champ ? ' is-champion' : ''}`}
                    style={heat(share(s, p.id), max)}
                    tabIndex={0}
                    data-tip={`${pct(share(s, p.id))} av trontiden`}
                    data-tip-label={`${p.name} · ${s.label} · ${formatDuration(c.ms)} · ${c.wins} ${c.wins === 1 ? 'vinst' : 'vinster'}${champ ? ' · mästare' : ''}`}
                  >
                    {champ && <span aria-label='Säsongens mästare'>♛ </span>}{pct(share(s, p.id))}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
