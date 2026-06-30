import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlayerHero } from '@/components/player/PlayerHero';
import { AllBadgesButton } from '@/components/player/AllBadgesButton';
import { PlayerRankComparison } from '@/components/player/PlayerRankComparison';
import { PlayerNemesis } from '@/components/player/PlayerNemesis';
import { PlayerTimeline } from '@/components/player/PlayerTimeline';
import { StatsGrid } from '@/components/stats/StatsGrid';
import { getPlayerProfile } from '@/lib/domain/riket';
import { formatDuration, formatShortDuration, formatRelativeDate } from '@/lib/format';

export default async function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const profile = await getPlayerProfile(playerId);
  if (!profile || !profile.stats) notFound();
  const s = profile.stats;

  return (
    <main className='page-stack'>
      <div className='profile-topbar'>
        <Link href='/players' className='royal-back-link'>← Tillbaka till spelare</Link>
        <AllBadgesButton badges={s.badges ?? []} />
      </div>
      <PlayerHero player={profile.player} stats={s} />
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
      <PlayerRankComparison stats={s} />
      <PlayerTimeline items={profile.timeline} />
    </main>
  );
}
