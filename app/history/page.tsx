import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/format';
import { getActiveSeason, listSeasons, seasonNumber, toRoman } from '@/lib/domain/season';
import { getActiveTheme } from '@/lib/theme/server';
import { CrawlChronicle } from '@/components/history/CrawlChronicle';

export const dynamic = 'force-dynamic';

export default async function History() {
  const { theme } = await getActiveTheme();
  const events = await prisma.winEvent.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 50,
    include: { winner: true },
  });

  if (theme.historyStyle === 'crawl') {
    const season = await getActiveSeason();
    const eyebrow = season ? `${theme.seasonWord} ${toRoman(seasonNumber(await listSeasons(), season))} · ${season.name}` : undefined;
    return (
      <CrawlChronicle
        eyebrow={eyebrow}
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
      <section className='card'>
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
