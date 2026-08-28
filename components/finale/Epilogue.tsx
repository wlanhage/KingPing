'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function Epilogue({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act' data-act='epilogue'><p className='subtitle'>{summary.standings.length} riddare</p></section>;
}
