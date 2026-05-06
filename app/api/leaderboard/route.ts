import { getLeaderboard } from '@/lib/domain/riket';
export async function GET(){return Response.json(await getLeaderboard());}
