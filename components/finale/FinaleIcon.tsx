/**
 * Ikonen för Krönikan: en komet som drar ett spår genom stjärnor — kronans vandring i
 * miniatyr. Inline-SVG i samma stil som RealmLogo, ärver färg via currentColor.
 */
export function FinaleIcon({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 18.5 C 8 15, 11 12, 15.5 8.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      <path d="M5.5 20.5 C 9.5 17.5, 12.5 14.5, 16.5 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".3" />
      <circle cx="17.2" cy="6.8" r="2.6" fill="currentColor" />
      <circle cx="17.2" cy="6.8" r="4.2" stroke="currentColor" strokeWidth=".8" opacity=".35" />
      <path d="M5 6 l.6 1.4 1.4.6-1.4.6L5 10l-.6-1.4L3 8l1.4-.6z" fill="currentColor" opacity=".8" />
      <circle cx="20.5" cy="14.5" r=".9" fill="currentColor" opacity=".7" />
      <circle cx="9.5" cy="4.5" r=".7" fill="currentColor" opacity=".5" />
    </svg>
  );
}
