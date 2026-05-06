import { prisma } from '../lib/prisma';
import { recordWin } from '../lib/domain/riket';

async function main(){ const names=['Erik','Anna','Calle','Oliver','Aymen','Lucas','Sara']; for (const n of names){ await prisma.player.upsert({where:{name:n},update:{},create:{name:n}});} const players=await prisma.player.findMany(); if(await prisma.winEvent.count()===0){ await recordWin(players[0].id,'Säsongsöppning'); await recordWin(players[0].id); await recordWin(players[1].id,'Regimskifte'); }}
main().finally(()=>prisma.$disconnect());
