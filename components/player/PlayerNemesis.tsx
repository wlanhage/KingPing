import Link from 'next/link';

type Nemesis = {
  rival: { id: string; name: string };
  stolenFrom: number; // gånger spelaren tog kronan FRÅN rivalen
  stolenBy: number;   // gånger rivalen tog kronan från spelaren
  total: number;
};

function verdict(stolenFrom: number, stolenBy: number): string {
  if (stolenFrom > stolenBy) return 'Övertaget är ditt — för nu.';
  if (stolenBy > stolenFrom) return 'Rivalen har övertaget. Hämnden väntar.';
  return 'Dödläge. Varje krona är ett krig.';
}

export function PlayerNemesis({ nemesis, playerName }: { nemesis: Nemesis | null; playerName: string }) {
  if (!nemesis) {
    return (
      <section className='royal-feud-panel is-empty'>
        <h2>⚔️ Ärkefiende</h2>
        <p className='royal-panel-sub'>Ingen rival ännu. Byt kronan fram och tillbaka med någon så uppstår en fejd.</p>
      </section>
    );
  }

  const { rival, stolenFrom, stolenBy } = nemesis;
  const initial = rival.name.trim()[0]?.toUpperCase() ?? '?';
  const leadFrom = stolenFrom >= stolenBy;

  return (
    <section className='royal-feud-panel'>
      <h2>⚔️ Ärkefiende</h2>
      <p className='royal-panel-sub'>Den kronan bytt händer med flest gånger.</p>

      <div className='royal-feud-arena'>
        <div className='royal-feud-side'>
          <div className='royal-feud-avatar is-self'><span>{playerName.trim()[0]?.toUpperCase() ?? '?'}</span></div>
          <p className='royal-feud-name'>{playerName}</p>
        </div>

        <div className='royal-feud-clash' aria-hidden>⚔️</div>

        <div className='royal-feud-side'>
          <Link href={`/players/${rival.id}`} className='royal-feud-avatar is-rival'><span>{initial}</span></Link>
          <Link href={`/players/${rival.id}`} className='royal-feud-name royal-feud-rival'>{rival.name}</Link>
        </div>
      </div>

      <div className='royal-feud-tally'>
        <div className={`royal-feud-stat${leadFrom ? ' is-lead' : ''}`}>
          <span className='royal-feud-num'>{stolenFrom}</span>
          <span className='royal-feud-label'>kronor du snott</span>
        </div>
        <div className={`royal-feud-stat${!leadFrom ? ' is-lead' : ''}`}>
          <span className='royal-feud-num'>{stolenBy}</span>
          <span className='royal-feud-label'>kronor snodda från dig</span>
        </div>
      </div>

      <p className='royal-feud-verdict'>{verdict(stolenFrom, stolenBy)}</p>
    </section>
  );
}
