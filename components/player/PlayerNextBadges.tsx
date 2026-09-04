import type { BadgeProgress } from '@/lib/badges/badge-progress';
import { themedBadge, type Theme } from '@/lib/theme';
import { BadgeIcon } from '@/components/badges/BadgeIcon';

/** Temats mall: riket säger "3 av 5 vinster", galaxen "2 vinster kvar, du har." */
function progressText(template: string, p: BadgeProgress): string {
  return template
    .replaceAll('{current}', String(p.current))
    .replaceAll('{target}', String(p.target))
    .replaceAll('{left}', String(p.target - p.current))
    .replaceAll('{unit}', p.unit);
}

export function PlayerNextBadges({ items, theme }: { items: BadgeProgress[]; theme: Theme }) {
  if (!items.length) return null;
  return (
    <section className='next-badges-panel'>
      <h2>Närmast att låsa upp</h2>
      <div className='next-badges-grid'>
        {items.map((p) => {
          const b = themedBadge(p.definition, theme);
          return (
            <article key={b.id} className={`next-badge rarity-accent-${b.rarity}`}>
              <span className={`next-badge-medallion rarity-${b.rarity}`} aria-hidden><BadgeIcon badge={b} /></span>
              <div className='next-badge-body'>
                <strong className='next-badge-name'>{b.name}</strong>
                <span className='next-badge-count'>{progressText(theme.progressTemplate, p)}</span>
                <div className='next-badge-track'><div className='next-badge-fill' style={{ width: `${Math.round((p.current / p.target) * 100)}%` }} /></div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
