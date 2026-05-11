import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';

const rarityPriority: Record<Rarity, number> = {
  mythical: 5,
  legendary: 4,
  epic: 3,
  rare: 2,
  common: 1,
};

const rarityTone: Record<Rarity, string> = {
  common: 'border-slate-400/40 bg-slate-900/90 text-slate-200',
  rare: 'border-sky-300/60 bg-sky-950/80 text-sky-100 shadow-[0_0_22px_rgba(56,189,248,0.3)]',
  epic: 'border-violet-300/60 bg-violet-950/80 text-violet-100 shadow-[0_0_22px_rgba(167,139,250,0.35)]',
  legendary: 'border-amber-300/70 bg-amber-950/75 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.35)]',
  mythical: 'border-fuchsia-300/70 bg-fuchsia-950/75 text-fuchsia-100 shadow-[0_0_28px_rgba(217,70,239,0.3),0_0_36px_rgba(251,191,36,0.28)]',
};

const orbitPositions = [
  'top-0 left-1/2 -translate-x-1/2',
  'top-[12%] right-[16%]',
  'top-[38%] right-[4%]',
  'bottom-[10%] right-[18%]',
  'bottom-0 left-1/2 -translate-x-1/2',
  'bottom-[10%] left-[18%]',
  'top-[38%] left-[4%]',
  'top-[12%] left-[16%]',
];

function sortBadges(badges: ComputedPlayerBadge[]) {
  return [...badges].sort((a, b) => rarityPriority[b.definition.rarity as Rarity] - rarityPriority[a.definition.rarity as Rarity]);
}

function OrbitBadge({ badge, className }: { badge: ComputedPlayerBadge; className: string }) {
  const rarity = badge.definition.rarity as Rarity;
  return (
    <div className={`absolute ${className} hidden md:block`} title={`${badge.definition.name} (${badge.definition.rarity})`}>
      <div className={`w-20 h-20 rounded-full border-2 ${rarityTone[rarity]} grid place-items-center backdrop-blur-sm`}>
        <span className='text-2xl leading-none'>{badge.definition.emoji}</span>
      </div>
      <div className='mt-1 text-center'>
        <p className='text-[11px] font-medium text-slate-100 leading-tight max-w-24'>{badge.definition.name}</p>
        <p className='text-[10px] uppercase tracking-wider text-amber-300/90'>{badge.definition.rarity}</p>
      </div>
    </div>
  );
}

export function PlayerHero({ player, stats }: { player: any; stats: any }) {
  const initials = player.name.split(' ').map((s: string) => s[0]).join('').slice(0, 1).toUpperCase();
  const title = stats?.isCurrentKing ? 'Nuvarande kung' : stats?.totalWins ? 'Tidigare monark' : 'Utmanare';
  const line = stats?.isCurrentKing ? 'Historien skrivs fortfarande.' : stats?.fridayWins ? 'Fredagarna fruktar detta namn.' : stats?.totalWins ? 'En gång kung. Alltid farlig.' : 'Denna spelare väntar fortfarande på sin första krona.';
  const badges: ComputedPlayerBadge[] = stats?.badges ?? [];
  const topBadges = sortBadges(badges).slice(0, 8);

  return (
    <section className='relative overflow-hidden rounded-2xl border border-yellow-500/20 bg-slate-950/80 shadow-2xl p-6 md:p-10'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_45%),radial-gradient(circle_at_bottom,rgba(30,64,175,0.22),transparent_55%)]' />
      <div className='relative flex flex-col items-center text-center min-h-[560px] justify-center'>
        <div className='relative w-full max-w-[680px] min-h-[380px]'>
          <div className='absolute inset-x-10 top-8 bottom-8 hidden md:block rounded-full border border-yellow-500/35' />

          {topBadges.map((badge, i) => (
            <OrbitBadge key={badge.id} badge={badge} className={orbitPositions[i] ?? orbitPositions[0]} />
          ))}

          <div className='relative mx-auto mt-16 md:mt-12 h-52 w-52 md:h-64 md:w-64 rounded-full border-4 border-yellow-400/70 bg-slate-900 grid place-items-center text-7xl md:text-8xl font-semibold text-amber-200 shadow-[0_0_35px_rgba(251,191,36,0.28)] overflow-hidden'>
            <div className='absolute -inset-10 bg-amber-300/10 blur-2xl' />
            {player.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.imageUrl} alt={`${player.name} profilbild`} className='h-full w-full object-cover' />
            ) : (
              <span className='relative'>{initials}</span>
            )}
          </div>
        </div>

        <h1 className='mt-4 text-4xl md:text-5xl font-semibold text-slate-100'>{player.name}</h1>
        <p className='mt-2 text-lg text-amber-300'>{title}</p>
        <p className='text-slate-300 mt-1'>Regerar i {stats?.currentReignMs ? 'aktiv period' : 'inte aktivt just nu'}</p>
        <p className='mt-3 max-w-xl text-slate-300 italic'>“{line}”</p>

        <div className='md:hidden mt-5 flex flex-wrap justify-center gap-2'>
          {topBadges.map((badge) => (
            <span key={badge.id} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${rarityTone[badge.definition.rarity as Rarity]}`}>
              <span>{badge.definition.emoji}</span>
              <span>{badge.definition.name}</span>
            </span>
          ))}
        </div>
      </div>
      <div className='relative mt-3 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent' />
    </section>
  );
}
