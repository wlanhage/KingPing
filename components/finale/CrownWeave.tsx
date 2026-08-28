'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
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

  useEffect(() => {
    if (reduced || !rootRef.current) return;
    const ctx = gsap.context(() => {
      const svg = rootRef.current!.querySelector('svg')!;
      const pathByOrder = new Map<number, SVGPathElement>();
      svg.querySelectorAll<SVGPathElement>('.weave-curve').forEach((p) => {
        const L = p.getTotalLength();
        gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
        pathByOrder.set(Number(p.dataset.order), p);
      });
      const card = (id: string) => svg.querySelector(`.weave-card[data-player="${id}"]`);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current, start: 'top top',
          end: () => `+=${summary.timeline.length * 320 + 2200}`,
          pin: true, scrub: 0.6,
        },
      });
      tl.set('#weave-crown', { opacity: 1 });
      const winsSoFar = new Map<string, number>();
      const shieldsSoFar = new Map<string, number>();
      let order = 0;
      for (const ev of summary.timeline) {
        if (ev.kind === 'transfer') {
          const p = pathByOrder.get(order)!;
          const toId = ev.transfer.toId;
          winsSoFar.set(toId, (winsSoFar.get(toId) ?? 0) + 1);
          tl.to(p, { strokeDashoffset: 0, duration: 1, ease: 'none' }, '>')
            .to('#weave-crown', { motionPath: { path: p, align: p, alignOrigin: [0.5, 0.5] }, duration: 1, ease: 'none' }, '<')
            .fromTo(card(toId), { scale: 1, transformOrigin: 'center' }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1 }, '>')
            .set(svg.querySelector(`.weave-wins[data-player="${toId}"]`), { textContent: String(winsSoFar.get(toId)) }, '<');
          order += 1;
        } else {
          shieldsSoFar.set(ev.playerId, (shieldsSoFar.get(ev.playerId) ?? 0) + 1);
          winsSoFar.set(ev.playerId, (winsSoFar.get(ev.playerId) ?? 0) + 1);
          tl.fromTo(card(ev.playerId), { scale: 1, transformOrigin: 'center' }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1 }, '>')
            .set(svg.querySelector(`.weave-shield[data-player="${ev.playerId}"]`), { textContent: String(shieldsSoFar.get(ev.playerId)) }, '<')
            .set(svg.querySelector(`.weave-wins[data-player="${ev.playerId}"]`), { textContent: String(winsSoFar.get(ev.playerId)) }, '<');
        }
      }
      tl.addLabel('winnerSeq'); // Task 12 hänger på här
      tl.to({}, { duration: 3 }); // luft för vinnarsekvensen
      // Startläge för räknarna: noll tills uppspelningen fyller dem.
      svg.querySelectorAll('.weave-wins').forEach((el) => { el.textContent = '0'; });
      svg.querySelectorAll('.weave-shield').forEach((el) => { el.textContent = '0'; });
    }, rootRef);
    return () => ctx.revert();
  }, [reduced, summary]);

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
