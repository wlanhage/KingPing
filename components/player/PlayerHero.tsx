import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';
import { formatDuration } from '@/lib/format';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';

const rarityPriority: Record<Rarity, number> = {
  mythical: 5,
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

// Distribute badges evenly around an ellipse that follows the gold orbit ring,
// starting at the top. Keeps badges off the central avatar regardless of count.
function orbitPosition(index: number, total: number) {
  const angle = (-90 + (360 / Math.max(total, 1)) * index) * (Math.PI / 180);
  const cx = 50;
  const cy = 48;
  const rx = 38;
  const ry = 43;
  return {
    left: `${cx + rx * Math.cos(angle)}%`,
    top: `${cy + ry * Math.sin(angle)}%`,
  };
}

function sortBadges(badges: ComputedPlayerBadge[]) {
  return [...badges].sort((a, b) => rarityPriority[b.definition.rarity as Rarity] - rarityPriority[a.definition.rarity as Rarity]);
}

function OrbitBadge({ badge, position }: { badge: ComputedPlayerBadge; position: { top: string; left: string } }) {
  const rarity = badge.definition.rarity as Rarity;
  return (
    <div className='royal-orbit-badge' style={position} title={`${badge.definition.name} — ${badge.reason}`}>
      <div className={`royal-badge-medallion rarity-${rarity}`}>
        <span className='royal-badge-icon'>{badge.definition.emoji}</span>
      </div>
      <div className='royal-badge-caption'>
        <p>{badge.definition.name}</p>
        <span>{badge.definition.rarity}</span>
      </div>
    </div>
  );
}

function reignLine(stats: any): string {
  if (stats?.isCurrentKing) {
    const reign = stats?.currentReignMs ? formatDuration(stats.currentReignMs) : null;
    return reign ? `Regerar just nu · ${reign} på tronen` : 'Regerar just nu';
  }
  if (stats?.totalWins) return 'Vilar från tronen — men vakten är uppe';
  return 'Har ännu inte bestigit tronen';
}

export function PlayerHero({ player, stats }: { player: any; stats: any }) {
  const initials = player.name.split(' ').map((s: string) => s[0]).join('').slice(0, 1).toUpperCase();
  const title = stats?.isCurrentKing ? 'Nuvarande kung' : stats?.totalWins ? 'Tidigare monark' : 'Utmanare';
  const line = stats?.isCurrentKing ? 'Historien skrivs fortfarande.' : stats?.fridayWins ? 'Fredagarna fruktar detta namn.' : stats?.totalWins ? 'En gång kung. Alltid farlig.' : 'Denna spelare väntar fortfarande på sin första krona.';
  const badges: ComputedPlayerBadge[] = stats?.badges ?? [];
  const topBadges = sortBadges(badges).slice(0, 8);

  return (
    <section className='royal-profile-hero'>
      <div className='royal-hero-aura' />
      <div className='royal-hero-crown-line' />
      {stats?.isCurrentKing && <div className='royal-hero-king-tag'>👑 Regerande kung</div>}

      <div className='royal-hero-content'>
        <div className='royal-orbit-stage'>
          <div className='royal-orbit-ring' />
          {topBadges.map((badge, i) => (
            <OrbitBadge key={badge.id} badge={badge} position={orbitPosition(i, topBadges.length)} />
          ))}

          <div className={`royal-avatar${stats?.isCurrentKing ? ' is-king' : ''}`}>
            {player.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.imageUrl} alt={`${player.name} profilbild`} />
            ) : (
              <span>{initials}</span>
            )}
          </div>
        </div>

        <div className='royal-player-identity'>
          <h1>{player.name}</h1>
          <p className='royal-player-title'>{title}</p>
          <p className='royal-player-reign'>{reignLine(stats)}</p>
          <p className='royal-player-quote'>&ldquo;{line}&rdquo;</p>
        </div>

        <div className='royal-mobile-badges'>
          {topBadges.map((badge) => (
            <span key={badge.id} className={`royal-mobile-badge rarity-${badge.definition.rarity as Rarity}`}>
              <span>{badge.definition.emoji}</span>
              <span>{badge.definition.name}</span>
            </span>
          ))}
        </div>
      </div>
      <div className='royal-gold-divider' />
    </section>
  );
}
