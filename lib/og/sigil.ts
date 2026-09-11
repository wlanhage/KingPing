import { sigilOf, type Field } from '@/lib/domain/heraldry';
import type { Character, Theme, ThemeColors } from '@/lib/theme/theme-types';

/**
 * Ritar vapen och farkost som SVG-STRÄNG, inte som JSX. Skälet: samma bild ska ut både
 * inline i appen och genom Satori i og-bilden, och Satori ritar inte inline-svg pålitligt.
 * En sträng bakom en data-uri fungerar i båda — en implementation i stället för två.
 */
export const dataUri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

/**
 * Färgparen skölden målas i. Alla mörka nog att guldhjälmen läses mot varje fält, men
 * panelSoft är utbytt mot border: i rikets bruna palett gick panelSoft inte att skilja
 * från bg, och hälften av vapnen såg likadana ut.
 */
const TINCTURES: [keyof ThemeColors, keyof ThemeColors][] = [
  ['accent2', 'panel'],
  ['border', 'bg'],
  ['panel', 'accent2'],
  ['bg', 'border'],
];

function fieldMarkup(field: Field, a: string, b: string): string {
  switch (field) {
    case 'pale':
      return `<rect width="50" height="100" fill="${a}"/><rect x="50" width="50" height="100" fill="${b}"/>`;
    case 'fess':
      return `<rect width="100" height="50" fill="${a}"/><rect y="50" width="100" height="50" fill="${b}"/>`;
    case 'bend':
      return `<rect width="100" height="100" fill="${a}"/><path d="M0 0H100L0 100Z" fill="${b}"/>`;
    case 'quarterly':
      return `<rect width="100" height="100" fill="${a}"/><rect x="50" width="50" height="50" fill="${b}"/><rect y="50" width="50" height="50" fill="${b}"/>`;
  }
}

/** Avsmalnande käke och något mindre kalott — utan avsmalningen läser hjälmen som en kapsel. */
export const HELM = 'M32 47C32 33 40 26 50 26C60 26 68 33 68 47L66 59C65 68 58 75 50 75C42 75 35 68 34 59Z';

/** Visiret är det som skiljer hjälmarna åt. 3 = T-visir, som läser som pilothjälm. */
function visor(helm: number, dark: string, gold: string): string {
  switch (helm) {
    case 0:
      return `<rect x="33" y="45" width="34" height="8" rx="4" fill="${dark}"/>`;
    case 1:
      return `<rect x="34" y="42" width="32" height="4" rx="2" fill="${dark}"/><rect x="34" y="50" width="32" height="4" rx="2" fill="${dark}"/><rect x="34" y="58" width="32" height="4" rx="2" fill="${dark}"/>`;
    case 2:
      return `<rect x="33" y="45" width="34" height="8" rx="4" fill="${dark}"/><rect x="47" y="40" width="6" height="26" rx="3" fill="${gold}"/>`;
    default:
      return `<path d="M33 41H67V51H55V70H45V51H33Z" fill="${dark}"/>`;
  }
}

export type SigilOptions = { colors: ThemeColors; isKing?: boolean };

/** Vapnet: namnet ger sköld och hjälm, spelet ger kronan. 100x100, rund. */
export function sigilSvg(name: string, { colors: c, isKing = false }: SigilOptions): string {
  const s = sigilOf(name);
  const [ka, kb] = TINCTURES[s.tincture];
  /*
   * Regenten bär krona, alla andra plym — de krockar om båda ritas.
   * Plymen är en FYLLD fjäder ovanpå hjälmen, inte en båge bakom den: bakom hjälmen
   * syntes bara en stump som läste som en repa i bilden.
   */
  const crest = isKing
    ? `<path d="M30 27L36 14L43.5 21L50 10L56.5 21L64 14L70 27Z" fill="${c.gold}" stroke="${c.bg}" stroke-width="1.4" stroke-linejoin="round"/>`
    : `<g transform="rotate(${s.tilt} 50 27)"><path d="M50 27C43.5 20 43.5 11 50 5C56.5 11 56.5 20 50 27Z" fill="${c.accent2}" stroke="${c.gold}" stroke-width="1.3" stroke-linejoin="round"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">`
    + `<defs><clipPath id="r"><circle cx="50" cy="50" r="48"/></clipPath></defs>`
    + `<g clip-path="url(#r)">${fieldMarkup(s.field, c[ka], c[kb])}`
    + (isKing ? '' : crest)
    + `<path d="${HELM}" fill="${c.gold}" stroke="${c.bg}" stroke-width="1.6"/>`
    + visor(s.helm, c.bg, c.gold)
    + (isKing ? crest : '')
    + `</g>`
    + `<circle cx="50" cy="50" r="43.5" fill="none" stroke="${c.gold}" stroke-width="1" opacity=".45"/>`
    + `<circle cx="50" cy="50" r="48" fill="none" stroke="${c.gold}" stroke-width="3"/>`
    + `</svg>`;
}

export const sigilDataUri = (name: string, opts: SigilOptions) => dataUri(sigilSvg(name, opts));

const n = (v: number) => v.toFixed(1);

/** Segelskrov: skrovet växer med nivån, master tillkommer, vimplar från nivå 4. */
function sailVessel(tier: number, c: ThemeColors): string {
  const w = 46 + tier * 10;
  const x0 = 60 - w / 2;
  const deck = 38;
  const masts = [0, 1, 2, 2, 3, 3][tier];
  const hull = `<path d="M${n(x0)} ${deck}H${n(x0 + w)}L${n(x0 + w * 0.89)} ${deck + 12}H${n(x0 + w * 0.11)}Z" fill="${c.accent2}" stroke="${c.gold}" stroke-width="1.6" stroke-linejoin="round"/>`;
  // Nivå 0 är en eka: inga master, bara åror.
  if (masts === 0) {
    return hull + `<path d="M${n(x0 + 7)} ${deck - 1}l-10-8M${n(x0 + w - 7)} ${deck - 1}l10-8" stroke="${c.gold}" stroke-width="2" stroke-linecap="round"/>`;
  }
  let out = '';
  for (let i = 0; i < masts; i++) {
    const mx = x0 + (w * (i + 1)) / (masts + 1);
    const top = 8 + (i % 2) * 5;
    out += `<line x1="${n(mx)}" y1="${deck}" x2="${n(mx)}" y2="${top}" stroke="${c.gold}" stroke-width="1.8"/>`;
    out += `<path d="M${n(mx)} ${top + 4}l13 9l-13 9Z" fill="${c.panelSoft}" stroke="${c.gold}" stroke-width="1.2" stroke-linejoin="round"/>`;
    if (tier >= 4) out += `<path d="M${n(mx)} ${top}l8 2.5l-8 2.5Z" fill="${c.accent}"/>`;
  }
  return out + hull;
}

/**
 * Galaxens sex skepp, i samma ordning som SWAPI-stegen i swapi-starships.json.
 * Varje silhuett är ritad efter SITT skepp: när namnen är kanon får formen inte vara
 * en generisk kil, då motsäger bilden etiketten. Varje ship visas i sin igenkännbara
 * vy — TIE och X-wing framifrån, resten från sidan.
 */
function swapiVessel(tier: number, c: ThemeColors): string {
  const body = `fill="${c.gold}" stroke="${c.bg}" stroke-width="1.4" stroke-linejoin="round"`;
  const trim = `fill="${c.accent2}"`;
  const glow = `fill="${c.accent}"`;
  switch (tier) {
    // TIE Advanced x1: kulkabin mellan två svepta vingpaneler.
    case 0:
      return `<g transform="translate(60 28) scale(.62) translate(-60 -28)">`
        + `<path d="M44 4L34 16V40L44 52L54 40V16Z" ${body}/><path d="M76 4L86 16V40L76 52L66 40V16Z" ${body}/>`
        + `<rect x="52" y="25" width="16" height="6" ${trim}/><circle cx="60" cy="28" r="9" ${body}/><circle cx="60" cy="28" r="3.5" ${trim}/></g>`;
    // X-wing: fyra S-folier i öppet X, kanoner ytterst.
    case 1:
      return `<g transform="translate(60 28) scale(.78) translate(-60 -28)">`
        + [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) =>
            `<path d="M${60 + sx * 5} ${28 + sy * 3}L${60 + sx * 34} ${28 + sy * 19}L${60 + sx * 36} ${28 + sy * 14}L${60 + sx * 7} ${28 - sy * 1}Z" ${body}/>`
            + `<circle cx="${60 + sx * 35}" cy="${28 + sy * 16.5}" r="2.4" ${trim}/>`).join('')
        + `<ellipse cx="60" cy="28" rx="7" ry="9" ${body}/></g>`;
    // Millennium Falcon: skiva, gaffel framåt, kabin på sidan.
    case 2:
      return `<g transform="translate(60 28) scale(.9) translate(-60 -28)">`
        + `<path d="M86 21L106 22V26L86 27Z" ${body}/><path d="M86 35L106 34V30L86 29Z" ${body}/>`
        + `<ellipse cx="60" cy="28" rx="28" ry="18" ${body}/><circle cx="60" cy="28" r="7" ${trim}/>`
        + `<ellipse cx="80" cy="40" rx="8" ry="4.5" ${body}/>`
        + `<path d="M32 22h-6v12h6z" ${glow}/></g>`;
    // CR90 corvette: hammarhuvud fram, lång hals, motorbank akterut.
    case 3:
      return `<path d="M92 19Q106 28 92 37L84 34V22Z" ${body}/>`
        + `<path d="M34 22L84 24V32L34 34Z" ${body}/>`
        + `<path d="M22 18h14v20H22Z" ${body}/>`
        + [0, 1, 2].map((i) => `<circle cx="21" cy="${21.5 + i * 6.5}" r="3" ${glow}/>`).join('')
        + `<rect x="60" y="25" width="18" height="3" ${trim}/>`;
    // Star Destroyer: kilen, med kommandotornet akterut.
    case 4:
      return `<path d="M20 42L104 28L20 14Z" ${body}/>`
        + `<path d="M28 18h12v-5h8v5h4v6H28Z" ${body}/><circle cx="40" cy="12" r="3" ${trim}/>`
        + [0, 1, 2].map((i) => `<circle cx="19" cy="${19 + i * 9}" r="3.2" ${glow}/>`).join('');
    // Death Star: klotet, ekvatorsrännan och superlaserskålen.
    default:
      return `<circle cx="60" cy="28" r="25" ${body}/>`
        + `<rect x="35" y="26.5" width="50" height="3" ${trim}/>`
        + `<circle cx="50" cy="17" r="7.5" fill="${c.bg}"/><circle cx="50" cy="17" r="4.5" ${trim}/>`;
  }
}

export type VesselOptions = { colors: ThemeColors; hull: 'sail' | 'swapi' };

/** Farkosten: nivån kommer från vesselTier, skrovet och namnet från temat. 120x56. */
export function vesselSvg(tier: number, { colors, hull }: VesselOptions): string {
  const t = Math.min(Math.max(Math.round(tier), 0), 5);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 56" width="120" height="56">`
    + (hull === 'sail' ? sailVessel(t, colors) : swapiVessel(t, colors))
    + `</svg>`;
}

export const vesselDataUri = (tier: number, opts: VesselOptions) => dataUri(vesselSvg(tier, opts));

/**
 * Spelarens bild: temats figur om temat har en rollista, annars den ritade vapenskölden.
 * Ett ställe för valet, så att listan, profilen och delningsbilden aldrig kan visa olika
 * saker för samma spelare. `src` är en data-uri för skölden och en sökväg under public/
 * för figuren — delningsbilden måste göra den absolut med siteUrl().
 */
export function playerPortrait(
  name: string,
  { theme, isKing = false, characterIndex }: { theme: Theme; isKing?: boolean; characterIndex?: number },
): { src: string; alt: string; character: Character | null } {
  const roster = theme.heraldry.characters;
  const character = roster?.length && characterIndex !== undefined ? roster[characterIndex % roster.length] : null;
  if (character) return { src: character.image, alt: `${name} som ${character.name}`, character };
  return {
    src: sigilDataUri(name, { colors: theme.colors, isKing }),
    alt: `${name}s ${theme.heraldry.sigilWord.toLowerCase()}`,
    character: null,
  };
}
