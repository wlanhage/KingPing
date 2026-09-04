import type { NationState } from '@prisma/client';
import type { Theme } from '@/lib/theme';

/** Rikets läge enligt den senaste kröningen, med temats namn — tyranni i riket är imperiet i galaxen. */
export function NationSeal({ state, theme }: { state: NationState; theme: Theme }) {
  const s = theme.nationStates[state];
  return (
    <section className={`nation-seal nation-${state.toLowerCase()}`} aria-label={theme.nationLabel}>
      <span className='nation-seal-emoji' aria-hidden>{s.emoji}</span>
      <div className='nation-seal-text'>
        <p className='nation-seal-eyebrow'>{theme.nationLabel}</p>
        <h2 className='nation-seal-name'>{s.name}</h2>
        <p className='nation-seal-blurb'>{s.blurb}</p>
      </div>
    </section>
  );
}
