import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';

const ringColors: Record<string, string> = {
  common: '#7f8cb8',
  rare: '#55c3ff',
  epic: '#bb7dff',
  legendary: '#ffd15e',
  mythical: '#ff78de',
};

function polarPosition(index: number, total: number, radius: number) {
  const angle = ((Math.PI * 2) / Math.max(total, 1)) * index - Math.PI / 2;
  return {
    left: `calc(50% + ${Math.cos(angle) * radius}px)`,
    top: `calc(50% + ${Math.sin(angle) * radius}px)`,
  };
}

export function PlayerHero({ player, stats }: { player: any; stats: any }) {
  const initials = player.name.split(' ').map((s: string) => s[0]).join('').slice(0, 1).toUpperCase();
  const title = stats?.isCurrentKing ? 'Rikets sittande härskare' : stats?.totalWins ? 'Tidigare monark' : 'Söker återkomst';
  const line = stats?.isCurrentKing ? 'Historien skrivs fortfarande.' : stats?.fridayWins ? 'Fredagarna fruktar detta namn.' : stats?.totalWins ? 'En gång kung. Alltid farlig.' : 'Denna spelare väntar fortfarande på sin första krona.';
  const badges: ComputedPlayerBadge[] = stats?.badges ?? [];
  const orbitBadges = badges.slice(0, 10);

  return (
    <div className='card'>
      <div className='player-hero-layout'>
        <div>
          <h1 className='title-xl' style={{ marginBottom: '.35rem' }}>{player.name}</h1>
          <p className='subtitle' style={{ marginTop: 0 }}>{stats?.isCurrentKing ? 'Nuvarande kung' : 'Utmanare'} · {title}</p>
          <p>{line}</p>
        </div>

        <div className='badge-orbit-wrap'>
          <div className='badge-orbit-center'>{initials}</div>
          {orbitBadges.map((badge, index) => (
            <div
              key={badge.id}
              className='orbit-badge'
              style={{
                ...polarPosition(index, orbitBadges.length, 118),
                borderColor: ringColors[badge.definition.rarity],
                boxShadow: `0 0 0 2px ${ringColors[badge.definition.rarity]}33`,
              }}
              title={`${badge.definition.name} (${badge.definition.rarity})`}
            >
              {badge.definition.emoji}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
