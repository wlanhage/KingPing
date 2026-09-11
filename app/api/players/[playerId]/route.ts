import { z } from 'zod';
import { getPlayerProfile } from '@/lib/domain/riket';
import { setPlayerAfk } from '@/lib/domain/afk';
import { notFound } from 'next/navigation';

const patchSchema = z.object({ afk: z.boolean() });

export async function GET(_: Request, { params }: { params: Promise<{ playerId: string }> }) { const { playerId } = await params; const p = await getPlayerProfile(playerId); if (!p) return notFound(); return Response.json(p); }

export async function PATCH(req: Request, { params }: { params: Promise<{ playerId: string }> }) {
  try {
    const { playerId } = await params;
    const { afk } = patchSchema.parse(await req.json());
    return Response.json(await setPlayerAfk(playerId, afk));
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
