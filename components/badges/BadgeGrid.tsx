import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';
import { BadgePill } from './BadgePill';

export function BadgeGrid({ badges, limit }: { badges: ComputedPlayerBadge[]; limit?: number }) {
  const items = typeof limit === 'number' ? badges.slice(0, limit) : badges;
  if (!items.length) return <div className='text-sm text-zinc-400'>Inga badges ännu.</div>;
  return <div className='flex flex-wrap gap-2'>{items.map((b) => <BadgePill key={b.id} badge={b} />)}</div>;
}
