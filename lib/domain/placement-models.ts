/**
 * Modeller på rundornas hela placering (`WinEvent.standings`, vinnaren först).
 *
 * Kronratingen uppdateras runda för runda. Här skattas styrkan i stället ur alla placeringar på en
 * gång med Plackett–Luce: en placering ses som att vinnaren valdes först bland alla vid bordet,
 * tvåan sedan bland de kvarvarande, och så vidare. Varje spelare har en styrka w, och chansen att
 * väljas bland en grupp är w delat med gruppens summa. Det ger både en ranking och vinstchanser för
 * vilken uppställning som helst.
 *
 * Filen importerar ingen databas: rapporten i webbläsaren räknar uppställningar med samma funktioner.
 */

export type PlacedRound = { id: string; occurredAt: Date | string; standings: string[] };

/** Bara rundor med minst två kända placeringar säger något om vem som var bättre. */
export const placedRounds = <T extends { standings?: string[] | null }>(rounds: T[]) =>
  rounds.filter((r): r is T & { standings: string[] } => (r.standings?.length ?? 0) >= 2);

const chronological = (rounds: PlacedRound[]) =>
  [...rounds].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

export type HeadToHead = Record<string, Record<string, { ahead: number; met: number }>>;

/** För varje par: i hur många rundor de båda var med, och hur ofta raden slutade före kolumnen. */
export function headToHead(rounds: PlacedRound[]): HeadToHead {
  const table: HeadToHead = {};
  const cell = (a: string, b: string) => ((table[a] ??= {})[b] ??= { ahead: 0, met: 0 });
  for (const { standings } of placedRounds(rounds)) {
    for (let i = 0; i < standings.length; i += 1) {
      for (let j = i + 1; j < standings.length; j += 1) {
        const [above, below] = [standings[i], standings[j]];
        cell(above, below).ahead += 1;
        cell(above, below).met += 1;
        cell(below, above).met += 1;
      }
    }
  }
  return table;
}

/** Samma skala som kronratingen: två spelare med 400 poängs skillnad möts med vinstchans 10:1. */
export const strengthToRating = (w: number) => 1000 + 400 * Math.log10(w);

/**
 * Plackett–Luce-styrkor med Hunters MM-algoritm.
 *
 * Med tio spelare och några dussin rundor går en ren skattning till noll eller oändligheten för den
 * som alltid vunnit eller aldrig gjort det. `prior` lägger därför till låtsasmatcher mot en spöke-
 * spelare med styrka 1: en vinst och en förlust var. Utan data stannar alla på 1 (rating 1000).
 */
export function fitPlackettLuce(rounds: PlacedRound[], { prior = 1, iterations = 200, tolerance = 1e-7 } = {}): Record<string, number> {
  const placed = placedRounds(rounds);
  const ids = [...new Set(placed.flatMap((r) => r.standings))];
  const w: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 1]));
  const wins: Record<string, number> = Object.fromEntries(ids.map((id) => [id, prior]));
  for (const { standings } of placed) for (const id of standings.slice(0, -1)) wins[id] += 1;

  for (let step = 0; step < iterations; step += 1) {
    const denominator: Record<string, number> = Object.fromEntries(ids.map((id) => [id, (2 * prior) / (w[id] + 1)]));
    for (const { standings } of placed) {
      let remaining = standings.reduce((sum, id) => sum + w[id], 0);
      // Sista platsen är inget val: den som står kvar ensam "väljs" alltid.
      for (let k = 0; k < standings.length - 1; k += 1) {
        for (let l = k; l < standings.length; l += 1) denominator[standings[l]] += 1 / remaining;
        remaining -= w[standings[k]];
      }
    }
    let change = 0;
    for (const id of ids) {
      const next = wins[id] / denominator[id];
      change = Math.max(change, Math.abs(Math.log(next / w[id])));
      w[id] = next;
    }
    if (change < tolerance) break;
  }
  return w;
}

/** Deterministisk slump (mulberry32), så att intervallen är desamma vid varje sidladdning. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PlacementRating = { id: string; rating: number; low: number; high: number; rounds: number };

/**
 * Rating med 80 %-intervall. Intervallet kommer från bootstrap: rundorna dras om med återläggning,
 * modellen skattas om, och spridningen visar hur mycket ratingen beror på just de rundor som spelats.
 */
export function placementRatings(rounds: PlacedRound[], { samples = 100, seed = 4711 } = {}): PlacementRating[] {
  const placed = placedRounds(rounds);
  const point = fitPlackettLuce(placed);
  const random = seededRandom(seed);
  const draws: Record<string, number[]> = Object.fromEntries(Object.keys(point).map((id) => [id, []]));
  for (let s = 0; s < samples && placed.length; s += 1) {
    const sample = Array.from({ length: placed.length }, () => placed[Math.floor(random() * placed.length)]);
    const fit = fitPlackettLuce(sample, { iterations: 80, tolerance: 1e-5 });
    // Den som inte kom med i dragningen har inga data där: priorn ger 1000.
    for (const id of Object.keys(point)) draws[id].push(strengthToRating(fit[id] ?? 1));
  }
  const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))))];
  const appearances = (id: string) => placed.filter((r) => r.standings.includes(id)).length;
  return Object.entries(point).map(([id, w]) => {
    const sorted = [...draws[id]].sort((a, b) => a - b);
    const rating = strengthToRating(w);
    return { id, rating, low: sorted.length ? quantile(sorted, 0.1) : rating, high: sorted.length ? quantile(sorted, 0.9) : rating, rounds: appearances(id) };
  }).sort((a, b) => b.rating - a.rating);
}

export type LineupOdds = Record<string, { win: number; last: number; expectedPlace: number }>;

/**
 * Exakta chanser för en uppställning: vinst, sist, och väntad placering. Räknas över alla sätt
 * gruppen kan tunnas ut (2^n delmängder), vilket går fort upp till ett tjugotal spelare.
 * Spelare utan data får styrka 1, samma som priorn ger.
 */
export function lineupOdds(strengths: Record<string, number>, ids: string[]): LineupOdds {
  const n = ids.length;
  const odds: LineupOdds = Object.fromEntries(ids.map((id) => [id, { win: 0, last: 0, expectedPlace: 0 }]));
  if (n === 0) return odds;
  if (n === 1) return { [ids[0]]: { win: 1, last: 1, expectedPlace: 1 } };
  if (n > 20) throw new Error('För många spelare för en exakt uträkning.');
  const w = ids.map((id) => strengths[id] ?? 1);
  const full = (1 << n) - 1;
  const reach = new Float64Array(1 << n);
  reach[full] = 1;
  for (let set = full; set > 0; set -= 1) {
    const p = reach[set];
    if (!p) continue;
    let total = 0;
    let size = 0;
    for (let i = 0; i < n; i += 1) if (set & (1 << i)) { total += w[i]; size += 1; }
    const place = n - size + 1;
    for (let i = 0; i < n; i += 1) {
      if (!(set & (1 << i))) continue;
      const chosen = p * (w[i] / total);
      const o = odds[ids[i]];
      o.expectedPlace += chosen * place;
      if (place === 1) o.win += chosen;
      if (size === 1) o.last += chosen;
      reach[set & ~(1 << i)] += chosen;
    }
  }
  return odds;
}

export type ForecastCheck = { rounds: number; logLoss: number; baselineLogLoss: number; favouriteHits: number; meanWinnerOdds: number; meanBaselineOdds: number };

/**
 * Ärlig kontroll av vinstchanserna: varje runda förutsägs med en modell skattad ENBART på rundorna
 * före den, och jämförs med att gissa lika chans för alla. Lägre log-loss är bättre.
 * De första `warmup` rundorna hoppas över — utan historik är modellen samma sak som jämn chans.
 */
export function forecastCheck(rounds: PlacedRound[], { warmup = 5 } = {}): ForecastCheck | null {
  const ordered = chronological(placedRounds(rounds));
  let logLoss = 0, baselineLogLoss = 0, favouriteHits = 0, winnerOdds = 0, baselineOdds = 0, checked = 0;
  for (let i = warmup; i < ordered.length; i += 1) {
    const { standings } = ordered[i];
    const model = fitPlackettLuce(ordered.slice(0, i), { iterations: 80, tolerance: 1e-5 });
    const odds = lineupOdds(model, standings);
    const p = Math.max(1e-9, odds[standings[0]].win);
    const favourite = standings.reduce((best, id) => (odds[id].win > odds[best].win ? id : best), standings[0]);
    logLoss -= Math.log(p);
    baselineLogLoss -= Math.log(1 / standings.length);
    winnerOdds += p;
    baselineOdds += 1 / standings.length;
    if (favourite === standings[0]) favouriteHits += 1;
    checked += 1;
  }
  if (!checked) return null;
  return { rounds: checked, logLoss: logLoss / checked, baselineLogLoss: baselineLogLoss / checked, favouriteHits, meanWinnerOdds: winnerOdds / checked, meanBaselineOdds: baselineOdds / checked };
}

export type SurvivalCurve = { id: string; rounds: number; survival: number[]; atRisk: number[] };

/**
 * Överlevnadskurva per spelare (Kaplan–Meier): andelen rundor spelaren fortfarande är kvar efter
 * k utslagningar. En runda med färre spelare tar slut tidigare; vinnaren där räknas som
 * "fortfarande kvar" men faller ur underlaget efteråt i stället för att räknas som utslagen.
 * `survival[0]` är alltid 1.
 */
export function survivalCurves(rounds: PlacedRound[]): SurvivalCurve[] {
  type Life = { survived: number; out: boolean };
  const lives: Record<string, Life[]> = {};
  for (const { standings } of placedRounds(rounds)) {
    const n = standings.length;
    standings.forEach((id, index) => {
      const place = index + 1;
      // Tvåan åkte ut som sista utslagning (nummer n-1), den sista platsen som första.
      (lives[id] ??= []).push(place === 1 ? { survived: n - 1, out: false } : { survived: n - place, out: true });
    });
  }
  return Object.entries(lives).map(([id, life]) => {
    const longest = Math.max(...life.map((l) => l.survived + (l.out ? 1 : 0)));
    const survival = [1];
    const atRisk = [life.length];
    for (let k = 1; k <= longest; k += 1) {
      const risk = life.filter((l) => l.survived >= k - 1 && (l.out || l.survived >= k)).length;
      const died = life.filter((l) => l.out && l.survived === k - 1).length;
      const previous = survival[k - 1];
      survival.push(risk ? previous * (1 - died / risk) : previous);
      atRisk.push(risk);
    }
    return { id, rounds: life.length, survival, atRisk };
  }).sort((a, b) => b.rounds - a.rounds);
}
