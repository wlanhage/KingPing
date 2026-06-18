import { prisma } from '../lib/prisma';
import { recordWin } from '../lib/domain/riket';

async function main() {
  const names = ['Erik', 'Anna', 'Calle', 'Oliver', 'Aymen', 'Lucas', 'Sara'];
  for (const n of names) {
    await prisma.player.upsert({ where: { name: n }, update: {}, create: { name: n } });
  }
  const players = await prisma.player.findMany();
  const byName = Object.fromEntries(players.map((p) => [p.name, p.id] as const));

  if ((await prisma.winEvent.count()) === 0) {
    // En varierad sekvens som triggar nykröningar, streaks (2–5+) och streak-brott.
    const sequence = [
      'Erik', 'Erik', 'Erik', 'Erik', // Erik bygger upp till fyra raka
      'Anna',                         // Anna störtar en stor svit
      'Calle',                        // ny kung
      'Calle', 'Calle', 'Calle', 'Calle', 'Calle', // Calles tyranni (5+)
      'Sara',                         // legendariskt streak-brott
      'Oliver',                       // ny kung
      'Anna', 'Anna',                 // Anna tar två raka
    ];
    for (const n of sequence) {
      await recordWin(byName[n]);
    }
  }
}

main().finally(() => prisma.$disconnect());
