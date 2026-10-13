import { z } from 'zod';
import { recordDuel } from '@/lib/duel/server';
import { WinError } from '@/lib/domain/win-request';

const count = z.number().int().nullable().optional();
const schema = z.object({
  winnerId: z.string().trim().min(1),
  loserId: z.string().trim().min(1),
  winnerPoints: count,
  loserPoints: count,
  winnerSets: count,
  loserSets: count,
  kronMatch: z.boolean().optional(),
  note: z.string().trim().max(500, 'Anteckningen får vara högst 500 tecken.').optional(),
  requestId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    return Response.json(await recordDuel(schema.parse(await req.json())));
  } catch (error) {
    if (error instanceof WinError) {
      // En KronMatch har samma cooldown som en runda.
      return Response.json({ error: error.message, ...(error.status === 429 ? { cooldown: true, remainingMs: error.remainingMs } : {}) }, {
        status: error.status,
        headers: error.remainingMs ? { 'Retry-After': String(Math.ceil(error.remainingMs / 1000)) } : undefined,
      });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ error: error instanceof z.ZodError ? error.issues[0]?.message ?? 'Ogiltig duell.' : 'Ogiltig duell.' }, { status: 400 });
    }
    console.error('Duel recording failed', error);
    return Response.json({ error: 'Kunde inte spara duellen. Försök igen med samma resultat.' }, { status: 503 });
  }
}
