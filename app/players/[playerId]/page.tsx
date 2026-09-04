import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PlayerHero } from '@/components/player/PlayerHero';
import { AllBadgesButton } from '@/components/player/AllBadgesButton';
import { PlayerRankComparison } from '@/components/player/PlayerRankComparison';
import { PlayerNemesis } from '@/components/player/PlayerNemesis';
import { PlayerTimeline } from '@/components/player/PlayerTimeline';
import { PlayerWeekdayChart } from '@/components/player/PlayerWeekdayChart';
import { PlayerNextBadges } from '@/components/player/PlayerNextBadges';
import { StatsGrid } from '@/components/stats/StatsGrid';
import { getPlayerProfile, getPlayerWeekdayWins } from '@/lib/domain/riket';
import { resolveSeason } from '@/lib/domain/season';
import { formatDate } from '@/lib/format';
import { nextBadges } from '@/lib/badges/badge-progress';
import { formatDuration, formatShortDuration, formatRelativeDate } from '@/lib/format';
import { getActiveTheme } from '@/lib/theme/server';
import { themedBadge } from '@/lib/theme';

export async function generateMetadata({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { name: true } });
  return { title: player?.name ?? 'Spelare' };
}

export default async function PlayerPage({ params, searchParams }: { params: Promise<{ playerId: string }>; searchParams: Promise<{ season?: string }> }) {
  const { playerId } = await params;
  const { season: slug } = await searchParams;
  const season = await resolveSeason(slug);
  const profile = await getPlayerProfile(playerId, season);
  if (!profile || !profile.stats) notFound();
  const { theme } = await getActiveTheme();
  const weekdayWins = await getPlayerWeekdayWins(playerId, profile.season);
  // Badge-namnen döps om av temat på ett ställe; orbiten och modalen ärver det.
  const s = { ...profile.stats, badges: (profile.stats.badges ?? []).map((b) => ({ ...b, definition: themedBadge(b.definition, theme) })) };

  return (
    <main className='page-stack'>
      <div className='profile-topbar'>
        <Link href='/players' className='royal-back-link'>← Tillbaka till spelare</Link>
        <AllBadgesButton badges={s.badges ?? []} />
      </div>
      {season.endedAt && (
        <p className='season-banner'>
          Visar <strong>{season.name}</strong> · {formatDate(season.startedAt)} — {formatDate(season.endedAt)}
          <Link href={`/players/${playerId}`}>Till pågående säsong →</Link>
        </p>
      )}
      <PlayerHero player={profile.player} stats={s} theme={theme} />
      <StatsGrid stats={[
        { label: 'Total tid på tronen', value: formatDuration(s.totalReignMs) },
        { label: 'Totala vinster', value: s.totalWins },
        { label: 'Längsta regering', value: formatDuration(s.longestReignMs) },
        { label: 'Nuvarande streak', value: s.currentStreak },
        { label: 'Längsta streak', value: s.longestStreak },
        { label: 'Fredagsvinster', value: s.fridayWins },
        { label: 'Senaste vinst', value: formatRelativeDate(s.lastWinAt) },
        { label: 'Snittregering', value: formatShortDuration(s.averageReignMs) },
      ]}
      >
        <PlayerNemesis nemesis={profile.nemesis} playerName={profile.player.name} />
      </StatsGrid>
      <PlayerNextBadges items={nextBadges(s)} theme={theme} />
      <PlayerWeekdayChart counts={weekdayWins} />
      <PlayerRankComparison stats={s} />
      <PlayerTimeline items={profile.timeline} />
    </main>
  );
}
