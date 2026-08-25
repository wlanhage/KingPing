import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/format';
import { getActiveTheme } from '@/lib/theme/server';

export const dynamic = 'force-dynamic';

export default async function History() {
  const { theme } = await getActiveTheme();
  const events = await prisma.winEvent.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 50,
    include: { winner: true },
  });

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
