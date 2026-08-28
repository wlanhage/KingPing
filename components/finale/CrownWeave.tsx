'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function CrownWeave({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act' data-act='weave'><p className='subtitle'>{summary.transfers.length} tronskiften</p></section>;
}
