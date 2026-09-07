import Link from 'next/link';
import type { Theme } from '@/lib/theme';

type FeudCopy = Theme['profile'];

type Nemesis = {
  rival: { id: string; name: string };
  stolenFrom: number; // gånger spelaren tog kronan FRÅN rivalen
  stolenBy: number;   // gånger rivalen tog kronan från spelaren
  total: number;
};

function verdict(stolenFrom: number, stolenBy: number, copy: FeudCopy): string {
  if (stolenFrom > stolenBy) return copy.feudLead;
  if (stolenBy > stolenFrom) return copy.feudBehind;
  return copy.feudTie;
}

export function PlayerNemesis({ nemesis, playerName, copy }: { nemesis: Nemesis | null; playerName: string; copy: FeudCopy }) {
  if (!nemesis) {
    return (
      <article className='royal-feud-cell is-empty'>
        <p className='royal-feud-title'>{copy.feudTitle}</p>
        <p className='royal-feud-empty'>{copy.feudEmpty}</p>
      </article>
    );
  }

  const { rival, stolenFrom, stolenBy } = nemesis;
  const initial = rival.name.trim()[0]?.toUpperCase() ?? '?';
  const leadFrom = stolenFrom >= stolenBy;

  return (
    <article className='royal-feud-cell'>
      <p className='royal-feud-title'>{copy.feudTitle}</p>

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
          <span className='royal-feud-label'>{copy.feudTaken}</span>
        </div>
        <div className={`royal-feud-stat${!leadFrom ? ' is-lead' : ''}`}>
          <span className='royal-feud-num'>{stolenBy}</span>
          <span className='royal-feud-label'>{copy.feudLost}</span>
        </div>
      </div>

      <p className='royal-feud-verdict'>{verdict(stolenFrom, stolenBy, copy)}</p>
    </article>
  );
}
