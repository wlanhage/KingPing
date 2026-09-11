'use client';
import { useEffect } from 'react';

const JUMP_MS = 900;
const FLASH_MS = 1300;

/**
 * Hyperrymdshoppet: när man klickar på en intern länk dras stjärnorna ut i streck och
 * bilden blixtrar till, medan nästa sida laddas. Lyssnar i capture-fasen så Next hinner
 * inte avbryta klicket innan vi sett det. Ingen effekt vid reducerad rörelse.
 */
export function HyperspaceJump() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timers: number[] = [];
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.origin !== location.origin) return;
      if (link.pathname === location.pathname && link.search === location.search) return;
      const field = document.querySelector('.starfield');
      if (!field) return;
      field.classList.add('is-jumping', 'is-flashing');
      timers.forEach(clearTimeout);
      timers = [
        window.setTimeout(() => field.classList.remove('is-jumping'), JUMP_MS),
        window.setTimeout(() => field.classList.remove('is-flashing'), FLASH_MS),
      ];
    };
    document.addEventListener('click', onClick, true);
    return () => { document.removeEventListener('click', onClick, true); timers.forEach(clearTimeout); };
  }, []);
  return null;
}
