/** Rikets märke. Kronan för medeltidsriket, en strålande stjärna för galaxen — samma guld i båda. */
export function RealmLogo({ size = 26, themeKey = 'realm' }: { size?: number; themeKey?: string }) {
  if (themeKey === 'star-wars') {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Rundpingisgalaxen">
        <g fill="#e7c25c">
          <path d="M32 8 L36 26 L54 32 L36 38 L32 56 L28 38 L10 32 L28 26 Z" />
          <path d="M14 14 L17 22 L25 25 L17 28 L14 36 L11 28 L3 25 L11 22 Z" opacity=".55" transform="translate(4 2) scale(.55)" />
          <path d="M50 40 L52 46 L58 48 L52 50 L50 56 L48 50 L42 48 L48 46 Z" opacity=".55" />
        </g>
        <circle cx="32" cy="32" r="4" fill="#fff7e0" />
      </svg>
    );
  }
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
