import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/format';
import { listSeasons, resolveSeason, seasonNumber, toRoman, winOccurredAtFilter } from '@/lib/domain/season';
import { getTheme } from '@/lib/theme';
import { CrawlChronicle } from '@/components/history/CrawlChronicle';

export const dynamic = 'force-dynamic';

/**
 * Krönikan för EN säsong: utan ?season= den pågående (en ny säsong börjar på noll),
 * med ?season= en arkiverad — i den säsongens eget tema och stil.
 */
export default async function History({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const { season: slug } = await searchParams;
  const season = await resolveSeason(slug);
  const theme = getTheme(season.theme);
  const label = season.id === 'implicit' ? season.name : `${theme.seasonWord} ${toRoman(seasonNumber(await listSeasons(), season))} · ${season.name}`;
  const events = await prisma.winEvent.findMany({
    where: { occurredAt: winOccurredAtFilter(season) },
    orderBy: { occurredAt: 'desc' },
    take: 50,
    include: { winner: true },
  });

  if (theme.historyStyle === 'crawl') {
    return (
      <CrawlChronicle
        eyebrow={label}
        title={theme.pages.history.title}
        subtitle={theme.pages.history.subtitle}
        items={events.map((e) => ({ id: e.id, date: formatDate(e.occurredAt), winner: e.winner.name, text: e.announcementText }))}
      />
    );
  }

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>{theme.pages.history.title}</h1>
        <p className='subtitle'>{theme.pages.history.subtitle}</p>
      </section>
      {season.endedAt && (
        <p className='season-banner'>
          Visar <strong>{label}</strong> · {formatDate(season.startedAt)} — {formatDate(season.endedAt)}
          <Link href='/history'>Till pågående säsong →</Link>
        </p>
      )}
      <section className='card'>
        {events.length === 0 && <p className='muted' style={{ margin: 0 }}>Inga händelser ännu. Riket väntar på sin första kröning.</p>}
        {events.map((event) => (
          <div key={event.id} className='timeline-item'>
            <div className='muted'>{formatDate(event.occurredAt)}</div>
            <div>
              <strong>{event.winner.name}</strong> — {event.announcementText}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
