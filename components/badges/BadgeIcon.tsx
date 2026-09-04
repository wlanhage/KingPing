/** En badges symbol: bilden om den har en, annars emojin. Storleken följer omgivande font-size. */
export function BadgeIcon({ badge, className }: { badge: { emoji: string; icon?: string; name: string }; className?: string }) {
  if (badge.icon) return <img src={badge.icon} alt='' className={`badge-icon-img${className ? ` ${className}` : ''}`} draggable={false} />;
  return <span className={className}>{badge.emoji}</span>;
}
