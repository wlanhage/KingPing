import { getKingdomStats } from '@/lib/domain/riket';
import { RecordWinForm } from '@/components/RecordWinForm';
import { BadgeGrid } from '@/components/badges/BadgeGrid';

export default async function Page() {
  const kingdom = await getKingdomStats();
  const king = kingdom.currentKing;

  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>👑 Rundpingisriket</h1>
        <p className='subtitle'>Överblick över tronen, utmanarna och den senaste dramatiken.</p>
      </section>

      <section className='grid cols-2'>
        <div className='card'>
          <p className='muted'>Nuvarande kung</p>
          <div className='kpi-value'>{king?.name ?? 'Ingen ännu'}</div>
          <p className='muted'>Badges</p>
          <BadgeGrid badges={king?.badges ?? []} limit={4} />
        </div>

        <div className='card'>
          <h2 style={{ marginTop: 0 }}>Krön nästa vinnare</h2>
          <RecordWinForm />
        </div>
      </section>
    </main>
  );
}
