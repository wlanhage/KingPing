import { getPlayerProfile } from '@/lib/domain/riket';
import { notFound } from 'next/navigation';
export async function GET(_: Request, { params }: { params: Promise<{ playerId: string }> }) { const { playerId } = await params; const p = await getPlayerProfile(playerId); if (!p) return notFound(); return Response.json(p); }
