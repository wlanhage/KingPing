export function PlayerHero({ player, stats }: { player: any; stats: any }) {
  const initials = player.name.split(' ').map((s: string) => s[0]).join('').slice(0,2).toUpperCase();
  const title = stats?.isCurrentKing ? 'Rikets sittande härskare' : stats?.totalWins ? 'Tidigare monark' : 'Söker återkomst';
  const line = stats?.isCurrentKing ? 'Historien skrivs fortfarande.' : stats?.fridayWins ? 'Fredagarna fruktar detta namn.' : stats?.totalWins ? 'En gång kung. Alltid farlig.' : 'Denna spelare väntar fortfarande på sin första krona.';
  return <div className='rounded-2xl bg-zinc-900 p-6 shadow'><div className='flex items-center gap-4'><div className='h-14 w-14 rounded-full bg-zinc-800 grid place-content-center font-bold'>{initials}</div><div><h1 className='text-3xl font-bold'>{player.name}</h1><p className='text-zinc-400'>{stats?.isCurrentKing ? 'Nuvarande kung' : 'Utmanare'} · {title}</p></div></div><p className='mt-4 text-zinc-300'>{line}</p><div className='mt-4 text-xs text-zinc-500'>Badges will render here later.</div></div>;
}
