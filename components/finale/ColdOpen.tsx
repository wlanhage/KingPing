'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { FinaleSummary } from '@/lib/domain/finale';

export function ColdOpen({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const from = new Date(summary.season.startedAt).toLocaleDateString('sv-SE');
  const to = summary.season.endedAt ? new Date(summary.season.endedAt).toLocaleDateString('sv-SE') : 'nu';

  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=1400', pin: true, scrub: 0.5 } })
        .from('.coldopen-title', { autoAlpha: 0, y: 40, duration: 1 })
        .from('.coldopen-dates', { autoAlpha: 0, duration: 0.6 }, '>-0.2')
        .from('.coldopen-line', { autoAlpha: 0, y: 24, stagger: 0.5, duration: 0.8 })
        .to({}, { duration: 0.6 });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} className='finale-act finale-coldopen' data-act='coldopen'>
      <div>
        <h1 className='finale-cover-title coldopen-title'>{summary.season.name}</h1>
        <p className='coldopen-dates'>{from} — {to}</p>
        <p className='coldopen-line'>{summary.wrapped.crownings} kröningar.</p>
        <p className='coldopen-line'>{summary.wrapped.players} riddare.</p>
        <p className='coldopen-line coldopen-throne'>En tron.</p>
      </div>
    </section>
  );
}
