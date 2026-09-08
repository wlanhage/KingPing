/**
 * Utlösare för scenerna som behöver historik, inte bara den aktuella vinsten.
 */

type PastWin = { winnerId: string; streakCount: number };

/**
 * Vaders entré: vinnaren hade en svit på minst två, tappade kronan, och tar den tillbaka
 * efter högst två andras kröningar. `events` är säsongens tidigare vinster, senaste först.
 *   Axel, Axel, Calle, Lanhage, Axel        → ja
 *   Axel, Axel, Axel, Axel, Lanhage, Axel   → ja
 *   Axel ×3, Lanhage, Calle, Aymen, Axel    → nej (tre andra emellan)
 */
export function isStreakReturn(events: PastWin[], winnerId: string): boolean {
  let others = 0;
  for (const e of events) {
    if (e.winnerId === winnerId) return others >= 1 && e.streakCount >= 2;
    others += 1;
    if (others > 2) return false;
  }
  return false;
}
