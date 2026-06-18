import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AddPlayerForm } from '@/components/AddPlayerForm';

export const dynamic = 'force-dynamic';

export default async function Players() {
  const players = await prisma.player.findMany({ orderBy: { name: 'asc' } });
  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>Riddare</h1>
        <p className='subtitle'>Rikets utmanare. Klicka in på en riddare för full profil.</p>
      </section>

      <section className='card add-knight-panel'>
        <h2 style={{ margin: '0 0 .2rem' }}>Dubba en ny riddare</h2>
        <p className='muted' style={{ margin: '0 0 1rem' }}>Lägg till en ny spelare i riket.</p>
        <AddPlayerForm />
      </section>

      <section className='grid cols-3'>
        {players.map((player) => (
          <Link className='card knight-card' key={player.id} href={`/players/${player.id}`}>
            <span className='knight-initial' aria-hidden>{player.name.trim()[0]?.toUpperCase() ?? '–'}</span>
            <h3 style={{ margin: 0 }}>{player.name}</h3>
            <p className='muted' style={{ marginBottom: 0 }}>Visa profil →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
