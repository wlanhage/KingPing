/**
 * En runda: vilka som stod vid bordet, och vem som förlorade finalen (de två sista spelar 1v1).
 * Tom deltagarlista och null som finalförlorare betyder okänt, som för alla rundor innan detta
 * spelades in.
 *
 * Filen importerar ingen databas: formuläret i webbläsaren använder samma funktioner.
 */

/**
 * Gruppen formuläret börjar med. Oftast står samma folk vid bordet varje dag, så förra rundans
 * grupp gäller, minus de som blivit AFK sedan dess. Finns ingen sådan runda: alla aktiva.
 */
export function startingGroup(activeIds: string[], lastParticipantIds: string[]): string[] {
  const stillActive = lastParticipantIds.filter((id) => activeIds.includes(id));
  return stillActive.length >= 2 ? stillActive : activeIds;
}

/**
 * Finalen utifrån formulärets val. Ett val av någon som inte längre står vid bordet räknas inte.
 * Är vinnaren vald och bara en till vid bordet, är hen finalförloraren utan att någon trycker.
 */
export function resolveFinal(participantIds: string[], winnerPick: string | null, runnerUpPick: string | null) {
  const winnerId = winnerPick && participantIds.includes(winnerPick) ? winnerPick : null;
  const others = participantIds.filter((id) => id !== winnerId);
  const runnerUpId = runnerUpPick && others.includes(runnerUpPick) ? runnerUpPick : winnerId && others.length === 1 ? others[0] : null;
  return { winnerId, runnerUpId };
}

/** Felet i en inskickad runda, eller null om den håller. Att spelarna finns kollas mot databasen separat. */
export function roundError(winnerId: string, participantIds: string[], runnerUpId: string | null): string | null {
  if (runnerUpId === winnerId) return 'Vinnaren kan inte också ha förlorat finalen.';
  if (participantIds.length === 0) return null;
  if (participantIds.length < 2) return 'Minst två måste ha stått vid bordet.';
  if (new Set(participantIds).size !== participantIds.length) return 'Samma spelare står flera gånger vid bordet.';
  if (!participantIds.includes(winnerId)) return 'Vinnaren måste ha stått vid bordet.';
  if (runnerUpId && !participantIds.includes(runnerUpId)) return 'Den som förlorade finalen måste ha stått vid bordet.';
  return null;
}
