import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { AddPlayerForm } from '@/components/AddPlayerForm';
import { getActiveTheme } from '@/lib/theme/server';
import { getCurrentKing } from '@/lib/domain/riket';
import { playerPortrait } from '@/lib/og/sigil';
import { assignCharacters } from '@/lib/domain/heraldry';

export const dynamic = 'force-dynamic';

export default async function Players() {
  const { theme } = await getActiveTheme();
  const [players, king] = await Promise.all([prisma.player.findMany({ orderBy: { name: 'asc' } }), getCurrentKing()]);
  // Tilldelningen behöver HELA truppen, inte bara den som visas — annars kan två få samma figur.
  const characters = assignCharacters(players, theme.heraldry.characters?.length ?? 0);
  return (
    <main className='page-stack'>
      <section>
        <h1 className='title-xl'>{theme.pages.players.title}</h1>
        <p className='subtitle'>{theme.pages.players.subtitle}</p>
      </section>

      <section className='card add-knight-panel'>
        <h2 style={{ margin: '0 0 .2rem' }}>{theme.profile.addTitle}</h2>
        <p className='muted' style={{ margin: '0 0 1rem' }}>{theme.profile.addSubtitle}</p>
        <AddPlayerForm copy={{ placeholder: theme.profile.addPlaceholder, button: theme.profile.addButton, busy: theme.profile.addBusy, duplicate: theme.profile.addDuplicate }} />
      </section>

      <section className='grid cols-3'>
        {players.map((player) => {
          const portrait = playerPortrait(player.name, { theme, isKing: player.id === king?.playerId, characterIndex: characters[player.id] });
          return (
            <Link className='card knight-card' key={player.id} href={`/players/${player.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className={`knight-sigil${portrait.character ? ' is-photo' : ''}`} src={portrait.src} alt='' width={44} height={44} />
              <h3 style={{ margin: 0 }}>{player.name}</h3>
              {portrait.character && <p className='knight-alias'>{portrait.character.name}</p>}
              <p className='muted' style={{ marginBottom: 0 }}>{theme.profile.viewProfile}</p>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
