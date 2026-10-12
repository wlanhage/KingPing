import { z } from 'zod';
import { standingsError } from './standings';

export const WIN_DRAFT_KEY = 'kingping-pending-round-v1';
export type WinDraft = { requestId: string; winnerId: string; standings: string[]; note: string; finalWinnerPoints?: number | null; finalRunnerUpPoints?: number | null };
const points = z.number().int().nullable().optional();
const schema = z.object({ requestId: z.string().uuid(), winnerId: z.string().min(1), standings: z.array(z.string().min(1)).min(2).max(100), note: z.string().max(500), finalWinnerPoints: points, finalRunnerUpPoints: points });

/** Restore the exact uncertain submission, even if the current active roster has changed. */
export function parseWinDraft(raw: string | null): WinDraft | null {
  if (!raw) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success && !standingsError(parsed.data.winnerId, parsed.data.standings) ? parsed.data : null;
  } catch { return null; }
}
