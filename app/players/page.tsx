import Link from 'next/link';
import { prisma } from '@/lib/prisma';

export default async function Players() {
  const players = await prisma.player.findMany();
  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>Spelare</h1>
        <p className='subtitle'>Klicka in på en spelare för detaljerad profil.</p>
      </section>
      <section className='grid cols-3'>
        {players.map((player) => (
          <Link className='card' key={player.id} href={`/players/${player.id}`}>
            <h3 style={{ margin: 0 }}>{player.name}</h3>
            <p className='muted' style={{ marginBottom: 0 }}>Visa profil →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
