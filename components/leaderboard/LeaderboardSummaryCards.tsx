export function LeaderboardSummaryCards({ data }: { data: any }) {
  const cards = [
    ['Nuvarande kung', data.currentKing?.name ?? 'Ingen ännu'],
    ['Längsta dynasti', data.longestStreak?.name ? `${data.longestStreak.name} (${data.longestStreak.longestStreak})` : 'Ingen data'],
    ['Mest trontid', data.mostThroneTime?.name ?? 'Ingen data'],
    ['Fredagsmästare', data.fridayChampion?.name ?? 'Ingen data'],
  ];
  return (
    <div className='grid cols-4'>
      {cards.map(([l, v]) => (
        <div key={String(l)} className='card'>
          <p className='muted'>{l}</p>
          <p className='kpi-value'>{v}</p>
        </div>
      ))}
    </div>
  );
}
