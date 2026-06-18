import { getKingdomStats, WIN_COOLDOWN_MS } from '@/lib/domain/riket';
import { RecordWinForm } from '@/components/RecordWinForm';
import { prisma } from '@/lib/prisma';
import { formatDuration } from '@/lib/format';

export default async function Page() {
  const kingdom = await getKingdomStats();
  const king = kingdom.currentKing;
  const players = await prisma.player.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
  const lastEvent = await prisma.winEvent.findFirst({ orderBy: { occurredAt: 'desc' }, select: { occurredAt: true } });
  const initial = king?.name?.trim()?.[0]?.toUpperCase() ?? '–';

  return (
    <main className='dash'>
      <header className='dash-header'>
        <h1>Rundpingisriket</h1>
        <p>Överblick över tronen och de senaste utmanarna.</p>
      </header>

      <section className='dash-throne'>
        <span className='dash-eyebrow'>Nuvarande kung</span>
        <div className='dash-crown' aria-hidden>👑</div>
        <div className='dash-king-avatar'><span>{initial}</span></div>
        <h2 className='dash-king-name'>{king?.name ?? 'Ingen krönt ännu'}</h2>

        {king ? (
          <dl className='dash-king-stats'>
            <div>
              <dt>Regeringstid</dt>
              <dd>{formatDuration(king.currentReignMs || king.totalReignMs)}</dd>
            </div>
            <div>
              <dt>Totala vinster</dt>
              <dd>{king.totalWins}</dd>
            </div>
            <div>
              <dt>Nuvarande streak</dt>
              <dd>{king.currentStreak}</dd>
            </div>
          </dl>
        ) : (
          <p className='dash-empty'>Kröna den första vinnaren nedan för att starta riket.</p>
        )}
      </section>

      <section className='dash-crown-panel'>
        <h2>Kröna ny vinnare</h2>
        <p className='dash-crown-sub'>Välj spelaren som tog hem rundan.</p>
        <RecordWinForm players={players} lastWinAt={lastEvent?.occurredAt.toISOString() ?? null} cooldownMs={WIN_COOLDOWN_MS} />
      </section>
    </main>
  );
}
