import { K_FACTOR, START_RATING } from './crown-rating';

/**
 * 1 mot 1. Två sorter räknas med i duell-ratingen: vanliga dueller (tabellen Duel, rör inte kronan)
 * och KronMatcher, som sparas som rundor med exakt två spelare i placeringen.
 *
 * Filen importerar ingen databas: formuläret i webbläsaren kontrollerar poängen med samma funktion.
 */

export const MAX_POINTS = 99;

/** Felet i en inskickad poäng, eller null. Ingen poäng alls är tillåtet; en halv är det inte. */
export function scoreError(winnerPoints?: number | null, loserPoints?: number | null): string | null {
  const given = [winnerPoints, loserPoints].filter((p) => p !== null && p !== undefined);
  if (given.length === 0) return null;
  if (given.length === 1) return 'Fyll i båda poängen, eller ingen.';
  const [w, l] = [winnerPoints!, loserPoints!];
  if (![w, l].every((p) => Number.isInteger(p) && p >= 0 && p <= MAX_POINTS)) return `Poängen ska vara hela tal mellan 0 och ${MAX_POINTS}.`;
  if (w <= l) return 'Vinnaren måste ha fler poäng än förloraren.';
  return null;
}

export type DuelMatch = { id: string; winnerId: string; loserId: string; occurredAt: Date | string; crown: boolean };
export type DuelRating = { id: string; rating: number; wins: number; losses: number };

/** Rundor med exakt två i placeringen var en KronMatch. */
export const crownDuels = (rounds: { id: string; occurredAt: Date | string; standings: string[] }[]): DuelMatch[] =>
  rounds.filter((r) => r.standings.length === 2).map((r) => ({ id: r.id, winnerId: r.standings[0], loserId: r.standings[1], occurredAt: r.occurredAt, crown: true }));

/** Vanlig Elo, i tidsordning. Samma start och K-faktor som kronratingen, så att talen går att jämföra. */
export function duelRatings(matches: DuelMatch[]): DuelRating[] {
  const ordered = [...matches].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || (a.id < b.id ? -1 : 1));
  const table: Record<string, DuelRating> = {};
  const seat = (id: string) => (table[id] ??= { id, rating: START_RATING, wins: 0, losses: 0 });
  for (const m of ordered) {
    const [winner, loser] = [seat(m.winnerId), seat(m.loserId)];
    const shift = K_FACTOR * (1 - 1 / (1 + 10 ** ((loser.rating - winner.rating) / 400)));
    winner.rating += shift;
    loser.rating -= shift;
    winner.wins += 1;
    loser.losses += 1;
  }
  return Object.values(table).sort((a, b) => b.rating - a.rating);
}
