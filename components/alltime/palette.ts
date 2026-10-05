/**
 * Kategoriska färger, en per spelare, i fast ordning (spelarnas ankomst till riket). Validerade
 * mot båda temanas panelyta (#1e1810, #0e1424) med dataviz-skillens validator: alla kontroller
 * passerar, sämsta grannpar ΔE 8,4 för färgblinda. Spelare nummer nio och uppåt blir grå.
 */
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
export const OTHER = '#6f6c66';
export const seriesColor = (slot: number | null | undefined) => (slot == null ? OTHER : SERIES[slot]);

/**
 * Sekventiell skala i temats accentfärg: noll smälter in i panelen, mest lyser starkast.
 * Etiketter inuti en fylld cell byter till mörk text när fyllningen blir ljus.
 */
export function heat(value: number, max: number): React.CSSProperties | undefined {
  if (!value || !max) return undefined;
  const p = Math.round(18 + (value / max) * 82);
  return { background: `color-mix(in oklab, var(--accent) ${p}%, var(--panel-soft))`, color: p > 60 ? 'var(--bg)' : 'var(--text)' };
}
