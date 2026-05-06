import { prisma } from '@/lib/prisma';
export default async function History(){ const h=await prisma.winEvent.findMany({orderBy:{occurredAt:'desc'},take:50,include:{winner:true}}); return <div><h1>Historik</h1>{h.map(e=><div key={e.id}>{e.winner.name}: {e.announcementText}</div>)}</div>}
