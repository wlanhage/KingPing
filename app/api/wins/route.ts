import { z } from 'zod';
import { recordWin } from '@/lib/domain/riket';
import { WinError } from '@/lib/domain/win-request';

const schema = z.object({
  winnerId: z.string().trim().min(1),
  note: z.string().trim().max(500, 'Anteckningen får vara högst 500 tecken.').optional(),
  standings: z.array(z.string().min(1)).max(100).optional(),
  requestId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    // Retry lookup and cooldown both belong inside the throne lock, in that order.
    return Response.json(await recordWin(body.winnerId, body.note, { actor: 'web', standings: body.standings, requestId: body.requestId }));
  } catch (error) {
    if (error instanceof WinError) {
      return Response.json({ error: error.message, ...(error.status === 429 ? { cooldown: true, remainingMs: error.remainingMs } : {}) }, {
        status: error.status,
        headers: error.remainingMs ? { 'Retry-After': String(Math.ceil(error.remainingMs / 1000)) } : undefined,
      });
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return Response.json({ error: error instanceof z.ZodError ? error.issues[0]?.message ?? 'Ogiltigt resultat.' : 'Ogiltigt resultat.' }, { status: 400 });
    }
    // Unknown IDs are input errors; unexpected database outages can be retried safely.
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return Response.json({ error: 'Spelaren finns inte.' }, { status: 400 });
    }
    console.error('Round recording failed', error);
    return Response.json({ error: 'Kunde inte spara rundan. Försök igen med samma resultat.' }, { status: 503 });
  }
}
