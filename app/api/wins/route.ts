import { z } from 'zod';
import { recordWin, WIN_COOLDOWN_MS } from '@/lib/domain/riket';
import { NOTE_MAX } from '@/lib/domain/limits';
import { prisma } from '@/lib/prisma';

// standings: hela placeringen, vinnaren först. Valfri; recordWin validerar den.
const schema = z.object({ winnerId: z.string().min(1), note: z.string().max(NOTE_MAX, `Anteckningen får vara högst ${NOTE_MAX} tecken.`).optional(), standings: z.array(z.string().min(1)).max(100).optional() });

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());

    // Skydd mot dubbelsättningar: blockera ny vinnare strax efter en kröning.
    const last = await prisma.winEvent.findFirst({ orderBy: { occurredAt: 'desc' }, select: { occurredAt: true } });
    if (last) {
      const remainingMs = WIN_COOLDOWN_MS - (Date.now() - new Date(last.occurredAt).getTime());
      if (remainingMs > 0) {
        const remainingMin = Math.ceil(remainingMs / 60000);
        return Response.json(
          { error: `En vinnare sattes nyligen. Vänta ${remainingMin} min innan en ny kan krönas.`, cooldown: true, remainingMs },
          { status: 429 },
        );
      }
    }

    const result = await recordWin(body.winnerId, body.note, { actor: 'web', standings: body.standings });
    return Response.json(result);
  } catch (e: any) {
    return Response.json({ error: e instanceof z.ZodError ? e.issues[0].message : e.message }, { status: 400 });
  }
}
