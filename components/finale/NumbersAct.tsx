'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function NumbersAct({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act' data-act='numbers'><p className='subtitle'>{summary.wrapped.crownings} kröningar</p></section>;
}
