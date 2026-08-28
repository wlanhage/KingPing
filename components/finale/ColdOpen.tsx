'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function ColdOpen({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act finale-coldopen' data-act='coldopen'><h1 className='finale-cover-title'>{summary.season.name}</h1></section>;
}
