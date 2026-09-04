import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getLeaderboard } from '@/lib/domain/riket';
import { listSeasons, seasonNumber, toRoman, winOccurredAtFilter } from '@/lib/domain/season';
import { getTheme, themeCssVars } from '@/lib/theme';
import { getActiveTheme } from '@/lib/theme/server';
import { FinaleIcon } from '@/components/finale/FinaleIcon';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const { theme } = await getActiveTheme();
  return { title: theme.pages.archive.title };
}

const fmt = (d: Date) => d.toLocaleDateString('sv-SE');

/**
 * Arkivet: alla säsonger som bokband på en hylla, var och en i sitt eget tema.
 * Avslutade säsonger länkar till sin final; den pågående till tabellen.
 */
export default async function SeasonsPage() {
  const { theme } = await getActiveTheme();
  const seasons = await listSeasons();
  const books = await Promise.all(seasons.map(async (s) => {
    const t = getTheme(s.theme);
    const wins = await prisma.winEvent.count({ where: { occurredAt: winOccurredAtFilter(s) } });
    const winner = s.endedAt ? (await getLeaderboard(s))[0]?.name ?? null : null;
    return { s, t, wins, winner, label: `${t.seasonWord} ${toRoman(seasonNumber(seasons, s))}` };
  }));

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>{theme.pages.archive.title}</h1>
        <p className='subtitle'>{theme.pages.archive.subtitle}</p>
      </section>

      {books.length === 0 ? (
        <section className='card'><p className='muted' style={{ margin: 0 }}>Inga säsonger ännu.</p></section>
      ) : (
        <section className='archive-shelf'>
          {books.map(({ s, t, wins, winner, label }) => (
            <article key={s.slug} className={`archive-book${s.endedAt ? '' : ' is-active'}`} style={themeCssVars(t.colors) as React.CSSProperties}>
              <p className='archive-book-eyebrow'>{label} · {s.endedAt ? `${fmt(s.startedAt)} — ${fmt(s.endedAt)}` : `sedan ${fmt(s.startedAt)}, pågår`}</p>
              <h2 className='archive-book-title'>{s.name}</h2>
              <p className='archive-book-meta'>
                <span><strong>{wins}</strong> kröningar</span>
                {winner && <span>Härskare: <strong>{winner}</strong></span>}
                <span className='archive-book-theme'>{t.appName}</span>
              </p>
              <div className='archive-book-actions'>
                {s.endedAt ? (
                  <Link href={`/seasons/${s.slug}/final`} className='crown-btn archive-book-btn'>
                    <FinaleIcon size={18} /> Se krönikan
                  </Link>
                ) : (
                  <span className='archive-book-locked'>Krönikan skrivs medan ni spelar</span>
                )}
                <Link href={`/leaderboard?season=${s.slug}`} className='btn-ghost'>Tabellen</Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
