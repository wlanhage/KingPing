'use client';
import type { FinaleSummary } from '@/lib/domain/finale';

// Minimal shell — byggs ut med Lenis/GSAP, akter och ljud i senare tasks.
export function SeasonFinale({ summary, cinema }: { summary: FinaleSummary; cinema: boolean }) {
  return (
    <div className='finale'>
      <section className='finale-act'>
        <h1 className='title-xl'>{summary.season.name}</h1>
        <p className='subtitle'>{summary.wrapped.crownings} kröningar · {summary.wrapped.players} spelare {cinema ? '· cinema' : ''}</p>
      </section>
    </div>
  );
}
