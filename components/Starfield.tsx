import { HyperspaceJump } from './HyperspaceJump';

/**
 * Stjärnhimmel bakom hela sidan för teman som vill ha den. Tre lager driver sakta i olika
 * hastighet (parallax), tre blinklager pulserar i olika rytm så enskilda stjärnor tycks blinka.
 * Ren CSS — inga skript, ingen canvas. Rymden ligger i en egen behållare så hyperrymdshoppet
 * kan zooma den utan att rubba drivet.
 */
export function Starfield() {
  return (
    <div className='starfield' aria-hidden>
      <div className='starfield-space'>
        <span className='starfield-layer starfield-far' />
        <span className='starfield-layer starfield-mid' />
        <span className='starfield-layer starfield-near' />
        <span className='starfield-twinkle starfield-twinkle-a' />
        <span className='starfield-twinkle starfield-twinkle-b' />
        <span className='starfield-twinkle starfield-twinkle-c' />
      </div>
      <span className='starfield-streaks' />
      <span className='starfield-flash' />
      <HyperspaceJump />
    </div>
  );
}
