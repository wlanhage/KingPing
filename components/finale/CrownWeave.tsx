'use client';
import { useMemo, useRef, useState } from 'react';
import type { FinaleSummary } from '@/lib/domain/finale';
import { buildWeave, WEAVE } from '@/lib/domain/weave';

export function CrownWeave({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const layout = useMemo(() => buildWeave(
    summary.standings.map((s) => ({ id: s.id, name: s.name, wins: s.totalWins })),
    summary.transfers,
    summary.defences,
  ), [summary]);
  const winner = summary.standings[0] ?? null;
  const [, setCoronate] = useState(false); // används i Task 12

  return (
    <section ref={rootRef} className='finale-act finale-weave' data-act='weave'>
      <div className='weave-stage'>
        <p className='coldopen-dates weave-heading'>Kronans vandring</p>
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className='weave-svg' role='img' aria-label='Kronans vandring genom säsongen'>
          <g className='weave-throne'>
            <rect x={layout.throne.x - 60} y={layout.throne.y - 56} width={120} height={44} rx={6} />
            <text x={layout.throne.x} y={layout.throne.y - 34} textAnchor='middle' dominantBaseline='central'>Tronen</text>
          </g>
          {layout.curves.map((c) => (
            <path key={c.order} className='weave-curve' data-order={c.order} d={c.d} data-to={c.toId} data-from={c.fromId ?? ''} />
          ))}
          {layout.cards.map((card) => (
            <g key={card.id} className={`weave-card${winner && card.id === winner.id ? ' is-winner' : ''}`} data-player={card.id} data-side={card.side}>
              <rect x={card.x} y={card.y} width={WEAVE.CARD_W} height={WEAVE.CARD_H} rx={8} />
              <text className='weave-name' x={card.x + 16} y={card.y + 22} dominantBaseline='central'>{card.name}</text>
              <text className='weave-meta' x={card.x + 16} y={card.y + 44} dominantBaseline='central'>
                <tspan className='weave-wins' data-player={card.id}>{card.wins}</tspan> vinster{card.defences > 0 ? ` · 🛡 ` : ''}
                {card.defences > 0 && <tspan className='weave-shield' data-player={card.id}>{card.defences}</tspan>}
              </text>
            </g>
          ))}
          <g id='weave-crown' aria-hidden><text textAnchor='middle' dominantBaseline='central'>♛</text></g>
        </svg>
      </div>
    </section>
  );
}
