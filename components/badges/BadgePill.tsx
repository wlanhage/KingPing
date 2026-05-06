import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';

const rarityClass: Record<string, string> = {
  common: 'bg-zinc-800 border-zinc-700 text-zinc-200',
  rare: 'bg-sky-950/60 border-sky-700 text-sky-100',
  epic: 'bg-violet-950/60 border-violet-700 text-violet-100',
  legendary: 'bg-amber-950/50 border-amber-700 text-amber-100',
  mythical: 'bg-fuchsia-950/50 border-fuchsia-700 text-fuchsia-100',
};

export function BadgePill({ badge }: { badge: ComputedPlayerBadge }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs ${rarityClass[badge.definition.rarity]}`} title={`${badge.definition.description} • ${badge.reason}`}>
      <span>{badge.definition.emoji}</span>
      <span className='font-medium'>{badge.definition.name}</span>
      <span className='opacity-70'>{badge.definition.rarity}</span>
    </div>
  );
}
