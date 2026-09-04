import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';
import { BadgeIcon } from '@/components/badges/BadgeIcon';

/** Alla spelarens badges i en kompakt rad — omloppsbanan visar bara de finaste. */
export function BadgeStrip({ badges }: { badges: ComputedPlayerBadge[] }) {
  if (!badges.length) return null;
  return (
    <section className='badge-strip' aria-label='Alla utmärkelser'>
      {badges.map((b) => (
        <span key={b.id} className={`badge-chip rarity-accent-${b.definition.rarity}`} title={`${b.definition.description} · ${b.reason}`}>
          <BadgeIcon badge={b.definition} className='badge-chip-icon' />
          <span className='badge-chip-name'>{b.definition.name}</span>
        </span>
      ))}
    </section>
  );
}
