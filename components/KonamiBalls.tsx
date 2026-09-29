'use client';
import { useEffect, useState } from 'react';

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'].join();
const BALLS = 40;

type Ball = { left: number; size: number; delay: number; duration: number };

/**
 * PÅSKÄGG: ↑ ↑ ↓ ↓ ← → ← → B A var som helst i riket regnar pingisbollar över skärmen.
 * Bollarna slumpas först vid koden (klient-only → ingen hydration-mismatch).
 */
export function KonamiBalls() {
  const [rain, setRain] = useState<{ id: number; balls: Ball[] } | null>(null);

  useEffect(() => {
    let keys: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      keys = [...keys, e.key.toLowerCase()].slice(-10);
      if (keys.join() !== KONAMI) return;
      keys = [];
      setRain({
        id: Date.now(),
        balls: Array.from({ length: BALLS }, () => ({
          left: Math.random() * 100,
          size: 14 + Math.random() * 18,
          delay: Math.random() * 1.5,
          duration: 2.5 + Math.random() * 2,
        })),
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Städa bort regnet när sista bollen hunnit ut (max delay + max duration).
  useEffect(() => {
    if (!rain) return;
    const id = setTimeout(() => setRain(null), 6000);
    return () => clearTimeout(id);
  }, [rain]);

  if (!rain) return null;

  return (
    <div key={rain.id} className='konami-rain' aria-hidden>
      {rain.balls.map((b, i) => (
        <span
          key={i}
          className='konami-ball'
          style={{ left: `${b.left}%`, width: b.size, height: b.size, animationDelay: `${b.delay}s`, animationDuration: `${b.duration}s` }}
        />
      ))}
    </div>
  );
}
