import { K_FACTOR, START_RATING } from './crown-rating';

/**
 * 1 mot 1-spåret. Allt här räknar på tabellen Duel: vanliga dueller och KronMatcher (dueller som
 * också tog kronan, se Duel.winEventId). Vanlig Elo — två spelare, en vinnare — med samma start
 * och K-faktor som kronratingen, så att talen går att jämföra.
 *
 * Filen importerar ingen databas: formuläret i webbläsaren kontrollerar resultatet och räknar
 * vinstchanser med samma funktioner.
 */

export const MAX_POINTS = 99;
export const MAX_SETS = 9;
/** Så mycket högre Elo motståndaren ska ha haft för att en vinst ska räknas som jättedråp. */
export const GIANT_GAP = 100;
/** Antal egna matcher formen räknas över. */
export const FORM_WINDOW = 5;

/** Felet i en inskickad poäng, eller null. Ingen poäng alls är tillåtet; en halv är det inte. */
export function scoreError(winnerPoints?: number | null, loserPoints?: number | null): string | null {
  return pairError(winnerPoints, loserPoints, MAX_POINTS, 'poäng', 'poängen');
}

/** Som scoreError, för vunna set. Den som vann matchen måste ha vunnit minst två set. */
export function setsError(winnerSets?: number | null, loserSets?: number | null): string | null {
  const error = pairError(winnerSets, loserSets, MAX_SETS, 'set', 'seten');
  if (error) return error;
  if (winnerSets != null && winnerSets < 2) return 'Är det flera set har vinnaren vunnit minst två.';
  return null;
}

function pairError(w: number | null | undefined, l: number | null | undefined, max: number, unit: string, the: string): string | null {
  const given = [w, l].filter((p) => p !== null && p !== undefined);
  if (given.length === 0) return null;
  if (given.length === 1) return `Fyll i båda ${the}, eller inget.`;
  if (![w!, l!].every((p) => Number.isInteger(p) && p >= 0 && p <= max)) return `${unit[0].toUpperCase()}${unit.slice(1)} ska vara hela tal mellan 0 och ${max}.`;
  if (w! <= l!) return `Vinnaren måste ha fler ${unit} än förloraren.`;
  return null;
}

export type DuelResult = { winnerPoints?: number | null; loserPoints?: number | null; winnerSets?: number | null; loserSets?: number | null };

/** Ett set ger poäng, flera set ger antal vunna set — aldrig båda. */
export function resultError(r: DuelResult): string | null {
  if (r.winnerPoints != null && r.winnerSets != null) return 'Fyll i antingen poäng (ett set) eller vunna set, inte båda.';
  return scoreError(r.winnerPoints, r.loserPoints) ?? setsError(r.winnerSets, r.loserSets);
}

export type DuelMatch = DuelResult & { id: string; winnerId: string; loserId: string; occurredAt: Date | string; crown: boolean };

/** Elos förväntade poäng för A mot B. */
export const winChance = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/** Vinstchans och hur mycket var och en vinner eller förlorar, före en match. */
export function duelOdds(ratingA: number, ratingB: number) {
  const a = winChance(ratingA, ratingB);
  return { a, b: 1 - a, aWins: K_FACTOR * (1 - a), bWins: K_FACTOR * a };
}

export type DuelPlayer = {
  id: string; rating: number; wins: number; losses: number;
  /** Positivt = vinster i rad, negativt = förluster i rad. */
  streak: number; longestWinStreak: number;
  /** Nettoändring i Elo över de senaste FORM_WINDOW egna matcherna. */
  form: number;
  /** Vinster mot någon med minst GIANT_GAP högre Elo före matchen. */
  giantKills: number;
};
export type DuelPair = { wins: number; losses: number; pointsFor: number; pointsAgainst: number; pointGames: number };
export type DuelTable = {
  players: DuelPlayer[];
  /** Inbördes, sett från radspelaren. */
  pairs: Record<string, Record<string, DuelPair>>;
  /** Hur mycket varje match flyttade, i samma ordning som de spelades. */
  shifts: Record<string, number>;
};

const chronological = (matches: DuelMatch[]) =>
  [...matches].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

/** Hela 1 mot 1-tabellen för en uppsättning matcher, normalt en säsongs. */
export function duelTable(matches: DuelMatch[]): DuelTable {
  const players: Record<string, DuelPlayer & { changes: number[] }> = {};
  const pairs: DuelTable['pairs'] = {};
  const shifts: Record<string, number> = {};
  const seat = (id: string) => (players[id] ??= { id, rating: START_RATING, wins: 0, losses: 0, streak: 0, longestWinStreak: 0, form: 0, giantKills: 0, changes: [] });
  const pair = (a: string, b: string) => ((pairs[a] ??= {})[b] ??= { wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointGames: 0 });

  for (const m of chronological(matches)) {
    const [winner, loser] = [seat(m.winnerId), seat(m.loserId)];
    if (loser.rating - winner.rating >= GIANT_GAP) winner.giantKills += 1;
    const shift = K_FACTOR * (1 - winChance(winner.rating, loser.rating));
    winner.rating += shift;
    loser.rating -= shift;
    winner.changes.push(shift);
    loser.changes.push(-shift);
    shifts[m.id] = shift;
    winner.wins += 1;
    loser.losses += 1;
    winner.streak = Math.max(0, winner.streak) + 1;
    loser.streak = Math.min(0, loser.streak) - 1;
    winner.longestWinStreak = Math.max(winner.longestWinStreak, winner.streak);
    pair(m.winnerId, m.loserId).wins += 1;
    pair(m.loserId, m.winnerId).losses += 1;
    if (m.winnerPoints != null && m.loserPoints != null) {
      for (const [a, b, own, other] of [[m.winnerId, m.loserId, m.winnerPoints, m.loserPoints], [m.loserId, m.winnerId, m.loserPoints, m.winnerPoints]] as const) {
        const p = pair(a, b);
        p.pointsFor += own;
        p.pointsAgainst += other;
        p.pointGames += 1;
      }
    }
  }
  return {
    players: Object.values(players)
      .map(({ changes, ...p }) => ({ ...p, form: changes.slice(-FORM_WINDOW).reduce((sum, c) => sum + c, 0) }))
      .sort((a, b) => b.rating - a.rating),
    pairs,
    shifts,
  };
}

/** Kort text för ett resultat: "11–7", "3–1 i set" eller tomt. */
export function formatResult(r: DuelResult): string {
  if (r.winnerSets != null && r.loserSets != null) return `${r.winnerSets}–${r.loserSets} i set`;
  if (r.winnerPoints != null && r.loserPoints != null) return `${r.winnerPoints}–${r.loserPoints}`;
  return '';
}

export type PlayerDuelSummary = {
  player: DuelPlayer | null;
  rank: number | null;
  /** Motståndaren spelaren slagit flest gånger, och den spelaren förlorat mest mot. */
  favourite: { id: string; wins: number; losses: number } | null;
  nemesis: { id: string; wins: number; losses: number } | null;
  recent: { id: string; opponentId: string; won: boolean; result: string; shift: number; crown: boolean; occurredAt: string }[];
};

/** Det profilen visar om en spelares 1 mot 1. */
export function playerDuelSummary(table: DuelTable, matches: DuelMatch[], playerId: string, recentCount = 5): PlayerDuelSummary {
  const index = table.players.findIndex((p) => p.id === playerId);
  const opponents = Object.entries(table.pairs[playerId] ?? {}).map(([id, p]) => ({ id, wins: p.wins, losses: p.losses }));
  const pick = (score: (o: { wins: number; losses: number }) => number) =>
    opponents.filter((o) => score(o) > 0).sort((a, b) => score(b) - score(a) || (b.wins + b.losses) - (a.wins + a.losses))[0] ?? null;
  const own = chronological(matches).filter((m) => m.winnerId === playerId || m.loserId === playerId).slice(-recentCount).reverse();
  return {
    player: index >= 0 ? table.players[index] : null,
    rank: index >= 0 ? index + 1 : null,
    favourite: pick((o) => o.wins - o.losses),
    nemesis: pick((o) => o.losses - o.wins),
    recent: own.map((m) => {
      const won = m.winnerId === playerId;
      return { id: m.id, opponentId: won ? m.loserId : m.winnerId, won, result: formatResult(m), shift: (table.shifts[m.id] ?? 0) * (won ? 1 : -1), crown: m.crown, occurredAt: new Date(m.occurredAt).toISOString() };
    }),
  };
}
