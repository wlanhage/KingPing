'use client';
import { useEffect, useRef, useState } from 'react';

const ADS = [
  { src: '/ads/axels-forehand-kurs.jpg', alt: 'Axels Forehand-Kurs — sluta försvara, börja bestämma', buy: 'KÖP NU!' },
  { src: '/ads/william-och-oliver.png', alt: 'William & Oliver — Oliver Emote Pack', buy: 'SÄKRA OLIVER EMOTE PACK NU!' },
];

/**
 * FEJKANNONS: slumpar en av annonserna i ADS.
 * Poppar upp av sig själv efter en slumpad fördröjning (default 15–100 s) och
 * visar annonsbilden i ~70 % av skärmen, med en riktig KÖP NU-knapp under och
 * ett riktigt X uppe till höger. Rent skämt — inget köps på riktigt.
 */
export function FakeAd({
  minSeconds = 15,
  maxSeconds = 100,
}: { minSeconds?: number; maxSeconds?: number }) {
  const [show, setShow] = useState(false);
  const [ad, setAd] = useState(ADS[0]);
  const [imgBroken, setImgBroken] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Slumpa fördröjning och schemalägg popupen (klient-only → ingen hydration-mismatch).
  useEffect(() => {
    const delayS = Math.floor(minSeconds + Math.random() * (maxSeconds - minSeconds + 1));
    const id = setTimeout(() => {
      setAd(ADS[Math.floor(Math.random() * ADS.length)]);
      setShow(true);
    }, delayS * 1000);
    return () => clearTimeout(id);
  }, [minSeconds, maxSeconds]);

  // Esc stänger + fokusera X när den dyker upp.
  useEffect(() => {
    if (!show) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShow(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  if (!show) return null;

  return (
    <div className='fakead-overlay' role='dialog' aria-modal='true' aria-label='Annons' onClick={() => setShow(false)}>
      <div className='fakead-card' onClick={(e) => e.stopPropagation()}>
        <button ref={closeRef} type='button' className='fakead-x' aria-label='Stäng annons' onClick={() => setShow(false)}>✕</button>

        {imgBroken ? (
          <div className='fakead-fallback'>
            <p className='fakead-fallback-kicker'>🏓 STOPP! Detta är INTE en vanlig kurs…</p>
            <h2 className='fakead-fallback-title'>AXELS FOREHAND-KURS</h2>
            <p className='fakead-fallback-sub'>Sluta försvara. Börja bestämma.</p>
            <p className='fakead-fallback-note'>(Lägg annonsbilden i <code>public/ads/axels-forehand-kurs.jpg</code>.)</p>
          </div>
        ) : (
          <img className='fakead-img' src={ad.src} alt={ad.alt} onError={() => setImgBroken(true)} draggable={false} />
        )}

        <button type='button' className='fakead-buy' onClick={() => setShow(false)}>
          {ad.buy}
        </button>
      </div>
    </div>
  );
}
