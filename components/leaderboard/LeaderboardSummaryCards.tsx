export function LeaderboardSummaryCards({ data }: { data: any }) {
  const cards = [
    ['Nuvarande kung', data.currentKing?.name ?? 'Ingen ännu'],
    ['Längsta dynasti', data.longestStreak?.name ? `${data.longestStreak.name} (${data.longestStreak.longestStreak})` : 'Ingen data'],
    ['Mest trontid', data.mostThroneTime?.name ?? 'Ingen data'],
    ['Fredagsmästare', data.fridayChampion?.name ?? 'Ingen data'],
  ];
  return <div className='grid md:grid-cols-4 gap-3'>{cards.map(([l, v]) => <div key={String(l)} className='rounded-2xl bg-zinc-900 p-4 shadow'><p className='text-sm text-zinc-400'>{l}</p><p className='font-semibold'>{v}</p></div>)}</div>;
}
