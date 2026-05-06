import type { CSSProperties } from 'react';
import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';

const rarityStyle: Record<string, CSSProperties> = {
  common: { background: '#2b335a', color: '#d9e3ff' },
  rare: { background: '#173a67', color: '#c7ebff' },
  epic: { background: '#43246f', color: '#f1dcff' },
  legendary: { background: '#5b440f', color: '#ffefbf' },
  mythical: { background: '#671d53', color: '#ffd6f4' },
};

export function BadgePill({ badge }: { badge: ComputedPlayerBadge }) {
  return (
    <div
      style={{
        border: '1px solid #33406f',
        borderRadius: 999,
        padding: '0.2rem 0.6rem',
        display: 'inline-flex',
        gap: '.4rem',
        ...rarityStyle[badge.definition.rarity],
      }}
      title={`${badge.definition.description} • ${badge.reason}`}
    >
      <span>{badge.definition.emoji}</span>
      <span>{badge.definition.name}</span>
      <span style={{ opacity: 0.75 }}>{badge.definition.rarity}</span>
    </div>
  );
}
