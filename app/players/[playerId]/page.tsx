import { notFound } from 'next/navigation';
import { PlayerHero } from '@/components/player/PlayerHero';
import { PlayerRankComparison } from '@/components/player/PlayerRankComparison';
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
      <PlayerHero player={profile.player} stats={s} />
      <StatsGrid stats={[
        { label: 'Total tid på tronen', value: formatDuration(s.totalReignMs) },
        { label: 'Totala vinster', value: s.totalWins },
        { label: 'Längsta regering', value: formatDuration(s.longestReignMs) },
        { label: 'Nuvarande streak', value: s.currentStreak },
        { label: 'Längsta streak', value: s.longestStreak },
        { label: 'Fredagsvinster', value: s.fridayWins },
        { label: 'Takeover vinster', value: s.takeoverWins },
        { label: 'Senaste vinst', value: formatRelativeDate(s.lastWinAt) },
        { label: 'Snittregering', value: formatShortDuration(s.averageReignMs) },
        { label: 'Crown efficiency', value: formatShortDuration(s.crownEfficiencyMsPerWin) },
      ]}
      />
      <PlayerRankComparison stats={s} />
      <PlayerTimeline items={profile.timeline} />
    </main>
  );
}
