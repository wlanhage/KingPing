/**
 * Rundans placering: spelar-id i ordning, vinnaren först och den som åkte ut först sist.
 * Tom lista = placeringen är okänd (alla rundor före placeringarna, och kröningar utan).
 *
 * Filen importerar ingen databas: formuläret i webbläsaren använder samma funktioner.
 */

/**
 * Vilka som börjar kryssade. Oftast står samma folk vid bordet varje dag, så den som inte var med
 * i förra rundan börjar som frånvarande. Finns ingen förra runda med minst två som fortfarande är
 * aktiva börjar alla som med.
 */
export function startingAbsent(activeIds: string[], lastStandings: string[]): string[] {
  const lastGroup = lastStandings.filter((id) => activeIds.includes(id));
  return lastGroup.length >= 2 ? activeIds.filter((id) => !lastGroup.includes(id)) : [];
}

/**
 * Formuläret samlar utslagningarna i den ordning de trycks in. Står exakt en deltagare kvar
 * är hen vinnaren och placeringen klar; annars null. Utslagna som inte längre är deltagare
 * (kryssades efteråt) räknas inte.
 */
export function standingsFromKnockouts(participantIds: string[], knockedOut: string[]): string[] | null {
  const out = knockedOut.filter((id) => participantIds.includes(id));
  const remaining = participantIds.filter((id) => !out.includes(id));
  if (participantIds.length < 2 || remaining.length !== 1) return null;
  return [remaining[0], ...out.reverse()];
}

/** Placeringens plats (1 = vinnaren) för den som åkte ut som nummer `index` (0 = först ut). */
export const knockoutPlace = (participantCount: number, index: number) => participantCount - index;

/** Felet i en inskickad placering, eller null om den håller. Spelarnas existens kollas mot databasen separat. */
export function standingsError(winnerId: string, standings: string[]): string | null {
  if (standings.length < 2) return 'En placering kräver minst två spelare.';
  if (new Set(standings).size !== standings.length) return 'Samma spelare står flera gånger i placeringen.';
  if (standings[0] !== winnerId) return 'Vinnaren måste stå först i placeringen.';
  return null;
}
