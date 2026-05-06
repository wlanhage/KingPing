import { prisma } from '@/lib/prisma';
export default async function Players(){ const p=await prisma.player.findMany(); return <div><h1>Spelare</h1>{p.map(x=><div key={x.id}>{x.name}</div>)}</div>}
