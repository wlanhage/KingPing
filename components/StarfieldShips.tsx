/**
 * Två skepp som korsar stjärnhimlen då och då: en TIE-jagare åt höger, en X-wing åt vänster.
 * Ett eget fast lager ovanpå stjärnfältet, ren CSS — en lång animation där skeppet bara syns
 * i början av varje varv, så det blir en stund mellan passagerna.
 */
export function StarfieldShips() {
  return (
    <div className='starfield-ships' aria-hidden>
      <span className='starfield-ship starfield-ship-tie'><TieFighter /></span>
      <span className='starfield-ship starfield-ship-xwing'><XWing /></span>
    </div>
  );
}

function TieFighter() {
  return (
    <svg viewBox='0 0 40 40'>
      <polygon points='2,8 9,4 9,36 2,32' />
      <polygon points='38,8 31,4 31,36 38,32' />
      <rect x='9' y='18.5' width='22' height='3' />
      <circle cx='20' cy='20' r='6.5' />
      <circle cx='20' cy='20' r='2.6' fill='#05070f' />
    </svg>
  );
}

function XWing() {
  return (
    <svg viewBox='0 0 40 40'>
      <path d='M9 6 L26 17.5 M9 34 L26 22.5 M6 12 L24 19 M6 28 L24 21' stroke='currentColor' strokeWidth='2.6' strokeLinecap='round' fill='none' />
      <path d='M12 17.5 H32 L38 20 L32 22.5 H12 Z' />
      {[[9, 6], [9, 34], [6, 12], [6, 28]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r='1.8' fill='#ff8aa0' />)}
    </svg>
  );
}
