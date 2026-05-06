import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/format';

export default async function History() {
  const events = await prisma.winEvent.findMany({
    orderBy: { occurredAt: 'desc' },
    take: 50,
    include: { winner: true },
  });

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>Historik</h1>
        <p className='subtitle'>De senaste 50 händelserna i riket.</p>
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
