'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * FEJKANNONS: "Axels Forehand-Kurs".
 * Poppar upp av sig själv efter en slumpad fördröjning (default 15–100 s) och
 * visar annonsbilden i ~70 % av skärmen, med en riktig KÖP NU-knapp under och
 * ett riktigt X uppe till höger. Rent skämt — inget köps på riktigt.
 */
export function FakeAd({
  src = '/ads/axels-forehand-kurs.jpg',
  minSeconds = 15,
  maxSeconds = 100,
}: { src?: string; minSeconds?: number; maxSeconds?: number }) {
  const [show, setShow] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Slumpa fördröjning och schemalägg popupen (klient-only → ingen hydration-mismatch).
  useEffect(() => {
    const delayS = Math.floor(minSeconds + Math.random() * (maxSeconds - minSeconds + 1));
    const id = setTimeout(() => setShow(true), delayS * 1000);
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
          <img className='fakead-img' src={src} alt='Axels Forehand-Kurs — sluta försvara, börja bestämma' onError={() => setImgBroken(true)} draggable={false} />
        )}

        <button type='button' className='fakead-buy' onClick={() => setShow(false)}>
          KÖP NU!
        </button>
      </div>
    </div>
  );
}
