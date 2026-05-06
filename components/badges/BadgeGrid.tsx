import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';
import { BadgePill } from './BadgePill';

export function BadgeGrid({ badges, limit }: { badges: ComputedPlayerBadge[]; limit?: number }) {
  const items = typeof limit === 'number' ? badges.slice(0, limit) : badges;
  if (!items.length) return <div className='muted'>Inga badges ännu.</div>;
  return <div className='badge-row'>{items.map((b) => <BadgePill key={b.id} badge={b} />)}</div>;
}
