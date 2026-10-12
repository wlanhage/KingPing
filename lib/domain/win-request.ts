/** Vinnarens och tvåans poäng i sista duellen. [null, null] = inte inspelad. */
export type FinalScore = [number | null, number | null];

/** Expected recording errors are actionable API responses, not generic server failures. */
export class WinError extends Error {
  constructor(message: string, public status: number, public remainingMs?: number) { super(message); }
}

export function sameWinRequest(saved: { winnerId: string; standings: string[]; note: string | null; finalWinnerPoints?: number | null; finalRunnerUpPoints?: number | null }, winnerId: string, standings: string[], note?: string, finalScore: FinalScore = [null, null]) {
  return saved.winnerId === winnerId
    && (saved.finalWinnerPoints ?? null) === finalScore[0]
    && (saved.finalRunnerUpPoints ?? null) === finalScore[1]
    && (saved.note?.trim() || null) === (note?.trim() || null)
    && saved.standings.length === standings.length
    && saved.standings.every((id, i) => id === standings[i]);
}
