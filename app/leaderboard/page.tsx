import { calculateLeaderboard } from '@/lib/domain/riket';
export default async function Leaderboard(){ const rows=await calculateLeaderboard(); return <div><h1>Leaderboard</h1><pre>{JSON.stringify(rows,null,2)}</pre></div>}
