import Link from 'next/link';
import { getKingdomStats, WIN_COOLDOWN_MS } from '@/lib/domain/riket';
import { RecordWinForm } from '@/components/RecordWinForm';
import { prisma } from '@/lib/prisma';
import { formatDuration } from '@/lib/format';
import { getActiveTheme } from '@/lib/theme/server';
import { listSeasons } from '@/lib/domain/season';
import { FinaleDoor } from '@/components/finale/FinaleDoor';
import { FinaleIcon } from '@/components/finale/FinaleIcon';
import { SeasonStrip } from '@/components/SeasonStrip';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { theme } = await getActiveTheme();
  const kingdom = await getKingdomStats();
  const seasons = await listSeasons();
  const endedSeason = seasons.filter((s) => s.endedAt).sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())[0] ?? null;
  const king = kingdom.currentKing;
  const players = await prisma.player.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });
  const lastEvent = await prisma.winEvent.findFirst({ orderBy: { occurredAt: 'desc' }, select: { occurredAt: true } });
  const initial = king?.name?.trim()?.[0]?.toUpperCase() ?? '–';

  return (
    <main className='dash'>
      <SeasonStrip />
      <header className='dash-header'>
        <h1>{theme.pages.home.title}</h1>
        <p>{theme.pages.home.subtitle}</p>
      </header>

      <section className='dash-throne'>
        <span className='dash-eyebrow'>Nuvarande {theme.roles.monarchLower}</span>
        <div className='dash-crown' aria-hidden>👑</div>
        <div className='dash-king-avatar'><span>{initial}</span></div>
        <h2 className='dash-king-name'>{king?.name ?? `Ingen ${theme.verbs.crowning} ännu`}</h2>

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
          <p className='dash-empty'>{`${theme.verbs.crown} den första vinnaren nedan för att starta riket.`}</p>
        )}
      </section>

      <section className='dash-crown-panel'>
        <h2>{theme.verbs.crown} ny vinnare</h2>
        <p className='dash-crown-sub'>Välj spelaren som tog hem rundan.</p>
        <RecordWinForm players={players} lastWinAt={lastEvent?.occurredAt.toISOString() ?? null} cooldownMs={WIN_COOLDOWN_MS} />
      </section>

      {endedSeason && (
        <>
          <Link href={`/seasons/${endedSeason.slug}/final`} className='finale-rewatch'>
            <FinaleIcon className='finale-rewatch-icon' size={30} />
            <span className='finale-rewatch-text'>
              <strong>Återse krönikan</strong>
              <small>{endedSeason.name} · kronans vandring genom galaxen</small>
            </span>
            <span className='finale-rewatch-arrow' aria-hidden>→</span>
          </Link>
          <FinaleDoor slug={endedSeason.slug} name={endedSeason.name} />
        </>
      )}
    </main>
  );
}
