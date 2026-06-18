export function RealmLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Rundpingisriket">
      <g fill="#e7c25c">
        <path d="M15 43 L15 26 L24 34 L32 21 L40 34 L49 26 L49 43 Z" />
        <rect x="15" y="43" width="34" height="6.5" rx="2" />
        <circle cx="15" cy="25" r="2.7" />
        <circle cx="32" cy="19.5" r="3.1" />
        <circle cx="49" cy="25" r="2.7" />
      </g>
      <circle cx="32" cy="37" r="3.6" fill="#fff7e0" />
    </svg>
  );
}
