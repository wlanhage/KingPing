import type { Theme } from '@/lib/theme';

export const OG_SIZE = { width: 1200, height: 630 };

let fontPromise: Promise<ArrayBuffer | null> | null = null;

/** Cinzel Decorative 700 som TTF från Google Fonts (Satori läser inte woff2). Cachas per process; null vid fel. */
export function loadDisplayFont(): Promise<ArrayBuffer | null> {
  fontPromise ??= (async () => {
    try {
      const css = await (await fetch('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700', { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; og-image)' } })).text();
      const url = css.match(/url\((https:[^)]+\.ttf)\)/)?.[1] ?? css.match(/url\(([^)]+)\)/)?.[1];
      if (!url) return null;
      const res = await fetch(url);
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  return fontPromise;
}

export async function ogFonts() {
  const data = await loadDisplayFont();
  return data ? [{ name: 'Cinzel Decorative', data, weight: 700 as const, style: 'normal' as const }] : undefined;
}

/** Deterministiska "stjärnor" så att galaxbilden ser likadan ut varje gång. */
function stars(count: number) {
  const out: { x: number; y: number; r: number; o: number }[] = [];
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < count; i++) out.push({ x: rnd() * OG_SIZE.width, y: rnd() * OG_SIZE.height, r: 1 + rnd() * 2.2, o: 0.35 + rnd() * 0.6 });
  return out;
}

/** Gemensam ram: temats bakgrund, guldkant, stjärnhimmel för teman som har den. */
export function OgFrame({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  const c = theme.colors;
  return (
    <div style={{ width: OG_SIZE.width, height: OG_SIZE.height, display: 'flex', flexDirection: 'column', position: 'relative', background: `linear-gradient(180deg, ${c.panelSoft} 0%, ${c.bg} 55%)`, color: c.text, fontFamily: 'Cinzel Decorative, serif' }}>
      {theme.backdrop === 'starfield' && stars(90).map((s, i) => (
        <div key={i} style={{ position: 'absolute', left: s.x, top: s.y, width: s.r * 2, height: s.r * 2, borderRadius: 999, background: '#fff', opacity: s.o }} />
      ))}
      <div style={{ position: 'absolute', left: 24, top: 24, right: 24, bottom: 24, border: `2px solid ${c.gold}`, borderRadius: 24, opacity: 0.55 }} />
      {/* Innehållet ligger i flödet med full höjd så att flexGrow-distanser fungerar i Satori. */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: OG_SIZE.height, padding: '64px 80px' }}>{children}</div>
    </div>
  );
}
