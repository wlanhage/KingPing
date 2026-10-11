/** Expected recording errors are actionable API responses, not generic server failures. */
export class WinError extends Error {
  constructor(message: string, public status: number, public remainingMs?: number) { super(message); }
}

export function sameWinRequest(saved: { winnerId: string; standings: string[]; note: string | null }, winnerId: string, standings: string[], note?: string) {
  return saved.winnerId === winnerId
    && (saved.note?.trim() || null) === (note?.trim() || null)
    && saved.standings.length === standings.length
    && saved.standings.every((id, i) => id === standings[i]);
}
