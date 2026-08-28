/**
 * Återställer en JSON-backup in i den databas DATABASE_URL pekar på.
 *
 *   npx tsx --env-file=.env.local scripts/restore-db.ts backups/<fil>.json
 *
 * Avsett för lokala sandlådor. Vägrar köra mot en icke-lokal värd om inte
 * --force anges, så en backup aldrig kan råka skrivas tillbaka över molnet.
 */
import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL saknas.');

const host = connectionString.split('@')[1]?.split('/')[0] ?? '';
const isLocal = /^(localhost|127\.0\.0\.1)/.test(host);
if (!isLocal && !process.argv.includes('--force')) {
  throw new Error(`Vägrar skriva till icke-lokal värd (${host}). Lägg till --force om du verkligen menar det.`);
}

const file = process.argv[2];
if (!file) throw new Error('Ange backupfil: scripts/restore-db.ts backups/<fil>.json');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const backup = JSON.parse(readFileSync(file, 'utf8'));
  const { players, reigns, winEvents, announcements } = backup.data;

  // Tömmer i beroendeordning innan återställning.
  await prisma.announcement.deleteMany();
  await prisma.winEvent.deleteMany();
  await prisma.reign.deleteMany();
  await prisma.player.deleteMany();
  await prisma.season.deleteMany();

  await prisma.player.createMany({ data: players });
  await prisma.reign.createMany({ data: reigns });
  await prisma.winEvent.createMany({ data: winEvents });
  await prisma.announcement.createMany({ data: announcements });

  console.log(`Återställde ${file} till ${host}`);
  console.table({
    players: await prisma.player.count(),
    reigns: await prisma.reign.count(),
    winEvents: await prisma.winEvent.count(),
    announcements: await prisma.announcement.count(),
  });
}

main().catch((e) => { console.error('Fel:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
