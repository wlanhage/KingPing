/**
 * Stjärnhimmel bakom hela sidan för teman som vill ha den. Tre lager driver sakta i olika
 * hastighet (parallax), tre blinklager pulserar i olika rytm så enskilda stjärnor tycks blinka.
 * Ren CSS — inga skript, ingen canvas.
 */
export function Starfield() {
  return (
    <div className='starfield' aria-hidden>
      <span className='starfield-layer starfield-far' />
      <span className='starfield-layer starfield-mid' />
      <span className='starfield-layer starfield-near' />
      <span className='starfield-twinkle starfield-twinkle-a' />
      <span className='starfield-twinkle starfield-twinkle-b' />
      <span className='starfield-twinkle starfield-twinkle-c' />
    </div>
  );
}
