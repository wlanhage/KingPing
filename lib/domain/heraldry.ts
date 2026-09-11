/**
 * Vapen och farkost per spelare. NIVÅN räknas här, tema-agnostiskt; NAMNET och FORMEN
 * äger temat (se theme-types.ts). Samma arbetsdelning som badge-engine: motorn avgör vad
 * någon förtjänat, temat bara vad det heter. Annars går vapnen sönder vid säsongens temabyte.
 */

/** FNV-1a. Namnet ska ge samma vapen för alltid — över omstarter, säsonger och teman. */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * Egen hash per drag i stället för bitskift av en enda — två drag ur samma tal
 * korrelerar, och då får alla med likartade namn likartade vapen.
 * Namnet normaliseras så att "Axel " och "axel" är samma riddare.
 */
const trait = (name: string, key: string, options: number) => hash(`${name.trim().toLowerCase()}:${key}`) % options;

/** Sköldens delning. Heraldiska namn, för att de är kortare än beskrivningarna. */
export const FIELDS = ['pale', 'fess', 'bend', 'quarterly'] as const;
export type Field = (typeof FIELDS)[number];

export const HELMS = 4;
export const TINCTURES = 4;

export type Sigil = {
  field: Field;
  /** Index i hjälmuppsättningen, 0–3. */
  helm: number;
  /** Vilket färgpar skölden målas i, 0–3. */
  tincture: number;
  /** Plymens lutning i grader, −22 till +22. */
  tilt: number;
};

/**
 * Vapnet är spelarens IDENTITET: det följer namnet och rör sig aldrig av resultat.
 * Det som ändras med spelet är kronan och farkosten — se vesselTier.
 */
export function sigilOf(name: string): Sigil {
  return {
    field: FIELDS[trait(name, 'field', FIELDS.length)],
    helm: trait(name, 'helm', HELMS),
    tincture: trait(name, 'tincture', TINCTURES),
    tilt: trait(name, 'tilt', 45) - 22,
  };
}

/** Vinster som krävs för farkost 0–5. Trappan är rangen; temat sätter namnen. */
export const VESSEL_STEPS = [0, 1, 3, 7, 15, 30] as const;
export const TOP_VESSEL = VESSEL_STEPS.length - 1;

export function vesselTier(totalWins: number): number {
  return Math.max(0, VESSEL_STEPS.filter((step) => totalWins >= step).length - 1);
}

/** Vinster kvar till nästa farkost, eller null när flottans största redan är tagen. */
export function winsToNextVessel(totalWins: number): number | null {
  const next = VESSEL_STEPS[vesselTier(totalWins) + 1];
  return next === undefined ? null : Math.max(0, next - totalWins);
}

export type PlayerRef = { id: string; name: string; createdAt: Date | string };

/**
 * Tilldelar varje spelare en figur ur temats rollista. Två spelare ska inte dela figur —
 * med 24 figurer och tio spelare krockar ren namnhash i över 80 % av fallen — så
 * tilldelningen är girig: var och en tar sin hash-favorit, eller närmaste lediga efter den.
 *
 * Ordningen är ÄLDST FÖRST med flit: en ny spelare hamnar då alltid sist och kan aldrig
 * rubba någon annans figur. Sorterar man på namn byter halva kontoret identitet varje
 * gång någon ny dubbas.
 *
 * Fler spelare än figurer: då är alla upptagna, och favoriten får delas.
 */
export function assignCharacters(players: PlayerRef[], rosterSize: number): Record<string, number> {
  if (rosterSize <= 0) return {};
  const ordered = [...players].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id.localeCompare(b.id),
  );
  const taken = new Set<number>();
  const out: Record<string, number> = {};
  for (const player of ordered) {
    const wish = trait(player.name, 'character', rosterSize);
    let index = wish;
    for (let step = 0; step < rosterSize && taken.has(index); step++) index = (wish + step + 1) % rosterSize;
    taken.add(index);
    out[player.id] = index;
  }
  return out;
}
