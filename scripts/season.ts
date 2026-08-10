/**
 * Säsongsadministration.
 *
 *   npx tsx --env-file=.env scripts/season.ts list
 *   npx tsx --env-file=.env scripts/season.ts bootstrap
 *   npx tsx --env-file=.env scripts/season.ts new --slug s2 --name "Ett nytt hopp" --theme star-wars --yes
 *
 * `new` avslutar pågående säsong, stänger en eventuell öppen regering vid säsongsslutet
 * och öppnar nästa. Det är den enda operationen som ändrar befintliga rader, så den
 * kräver --yes. Utan flaggan skrivs bara ut vad som skulle hända.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL saknas.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const has = (name: string) => process.argv.includes(`--${name}`);

async function list() {
  const seasons = await prisma.season.findMany({ orderBy: { startedAt: 'asc' } });
  if (!seasons.length) return console.log('Inga säsonger. Kör `bootstrap` först.');
  for (const s of seasons) {
    const wins = await prisma.winEvent.count({
      where: { occurredAt: s.endedAt ? { gte: s.startedAt, lt: s.endedAt } : { gte: s.startedAt } },
    });
    console.log(
      `${s.endedAt ? ' ' : '▶'} ${s.slug.padEnd(6)} ${s.name.padEnd(24)} tema=${s.theme.padEnd(12)}` +
        ` ${s.startedAt.toISOString().slice(0, 10)} → ${s.endedAt ? s.endedAt.toISOString().slice(0, 10) : 'pågår'}  (${wins} vinster)`,
    );
  }
}

async function bootstrap() {
  const existing = await prisma.season.count();
  if (existing > 0) {
    console.log(`Det finns redan ${existing} säsong(er) — bootstrap hoppas över.`);
    return list();
  }
  const firstWin = await prisma.winEvent.findFirst({ orderBy: { occurredAt: 'asc' } });
  const firstReign = await prisma.reign.findFirst({ orderBy: { startedAt: 'asc' } });
  // Starta säsongen vid den allra första händelsen så att ingen historik hamnar utanför.
  const candidates = [firstWin?.occurredAt, firstReign?.startedAt].filter(Boolean) as Date[];
  const startedAt = candidates.length ? new Date(Math.min(...candidates.map((d) => d.getTime()))) : new Date();

  const season = await prisma.season.create({
    data: {
      slug: arg('slug') ?? 's1',
      name: arg('name') ?? 'Rundpingisriket',
      theme: arg('theme') ?? 'realm',
      startedAt,
      endedAt: null,
    },
  });
  console.log(`Skapade säsong ${season.slug} (${season.name}) från ${startedAt.toISOString()}.`);
  return list();
}

async function newSeason() {
  const slug = arg('slug');
  const name = arg('name');
  const theme = arg('theme') ?? 'realm';
  if (!slug || !name) throw new Error('Kräver --slug och --name (och gärna --theme).');

  if (await prisma.season.findUnique({ where: { slug } })) throw new Error(`Säsongen "${slug}" finns redan.`);

  const active = await prisma.season.findFirst({ where: { endedAt: null }, orderBy: { startedAt: 'desc' } });
  const openReign = await prisma.reign.findFirst({ where: { endedAt: null }, include: { player: true } });
  const now = new Date();

  console.log('Detta kommer att hända:');
  console.log(`  • Avsluta säsong: ${active ? `${active.slug} (${active.name})` : '(ingen pågående)'}`);
  console.log(`  • Stänga regering: ${openReign ? `${openReign.player.name} → avslutas ${now.toISOString()}` : '(ingen öppen)'}`);
  console.log(`  • Skapa säsong:   ${slug} (${name}), tema ${theme}`);
  console.log('  • Ingen rad tas bort. Spelare, vinster och utrop lämnas orörda.');

  if (!has('yes')) {
    console.log('\nTorrkörning. Lägg till --yes för att genomföra.');
    return;
  }

  const created = await prisma.$transaction(async (tx) => {
    if (openReign) await tx.reign.update({ where: { id: openReign.id }, data: { endedAt: now } });
    if (active) await tx.season.update({ where: { id: active.id }, data: { endedAt: now } });
    return tx.season.create({ data: { slug, name, theme, startedAt: now, endedAt: null } });
  });

  console.log(`\nSäsong ${created.slug} är igång. Tronen står tom tills någon vinner.`);
  return list();
}

async function main() {
  const cmd = process.argv[2];
  if (cmd === 'list') return list();
  if (cmd === 'bootstrap') return bootstrap();
  if (cmd === 'new') return newSeason();
  console.log('Användning: season.ts <list|bootstrap|new>');
  process.exitCode = 1;
}

main()
  .catch((e) => { console.error('Fel:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
