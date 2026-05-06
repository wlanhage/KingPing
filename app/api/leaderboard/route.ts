import { calculateLeaderboard } from '@/lib/domain/riket'; export async function GET(){return Response.json(await calculateLeaderboard());}
