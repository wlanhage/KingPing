import { z } from 'zod';
import { recordDuel } from '@/lib/duel/server';
import { WinError } from '@/lib/domain/win-request';

const points = z.number().int().nullable().optional();
const schema = z.object({
  winnerId: z.string().trim().min(1),
  loserId: z.string().trim().min(1),
  winnerPoints: points,
  loserPoints: points,
  requestId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    return Response.json({ duel: await recordDuel(body) });
  } catch (error) {
    if (error instanceof WinError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ error: 'Ogiltig duell.' }, { status: 400 });
    console.error('Duel recording failed', error);
    return Response.json({ error: 'Kunde inte spara duellen. Försök igen med samma resultat.' }, { status: 503 });
  }
}
