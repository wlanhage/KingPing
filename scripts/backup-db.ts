/**
 * Logisk backup av hela databasen till JSON.
 * Körs före migrationer. Skriver backups/kingping-backup-<tidsstämpel>.json.
 *
 *   npx tsx --env-file=.env scripts/backup-db.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL saknas.');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const [players, reigns, winEvents, announcements] = await Promise.all([
    prisma.player.findMany(),
    prisma.reign.findMany(),
    prisma.winEvent.findMany(),
    prisma.announcement.findMany(),
  ]);

  const host = connectionString!.split('@')[1]?.split('/')[0] ?? 'okänd';
  const payload = {
    takenAt: new Date().toISOString(),
    host,
    counts: {
      players: players.length,
      reigns: reigns.length,
      winEvents: winEvents.length,
      announcements: announcements.length,
    },
    data: { players, reigns, winEvents, announcements },
  };

  mkdirSync('backups', { recursive: true });
  const file = `backups/kingping-backup-${payload.takenAt.replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify(payload, null, 2));

  console.log('Backup skriven:', file);
  console.log('Värd:', host);
  console.table(payload.counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
