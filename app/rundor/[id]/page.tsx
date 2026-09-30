import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRound } from '@/lib/domain/round';
import { formatDateTime } from '@/lib/format';
import { getTheme } from '@/lib/theme';
import { ordinal } from '@/components/stage/rundan';
import { RoundReplay } from '@/components/stage/RoundReplay';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const round = await getRound((await params).id);
  return { title: round?.standings[0] ? `Rundan i repris · ${round.standings[0].name}` : 'Rundan i repris' };
}

/** En runda i repris: placeringen som lista, och 3D-reprisen i Jeditemplet bakom en knapp. */
export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const round = await getRound((await params).id);
  if (!round) notFound();
  const theme = getTheme(round.theme);
  const players = round.standings;
  return (
    <main className='page-stack'>
      <section>
        <p className='replay-eyebrow'>Jeditemplet · Coruscant</p>
        <h1 className='title-xl'>Rundan i repris</h1>
        <p className='subtitle'>{formatDateTime(round.occurredAt)}{players.length >= 2 ? ` · ${players.length} spelare` : ''}</p>
      </section>
      {players.length < 2 ? (
        <section className='card'>
          <p style={{ margin: 0 }}>Den här rundan spelades in utan placering, så det finns inget att spela upp.</p>
        </section>
      ) : (
        <section className='card replay-card'>
          <ol className='replay-standings'>
            {players.map((p, i) => (
              <li key={p.id}>
                <span className='replay-place'>{ordinal(i + 1)}</span>
                <strong>{p.name}</strong>
                {i === 0 && <span aria-label='vinnare'>👑</span>}
                {i === players.length - 1 && players.length > 2 && <span className='muted'>åkte ut först</span>}
              </li>
            ))}
          </ol>
          <RoundReplay roundId={round.id} players={players} crowningWord={theme.verbs.crowning} />
        </section>
      )}
      <Link href='/history' className='replay-back'>← Till krönikan</Link>
    </main>
  );
}
