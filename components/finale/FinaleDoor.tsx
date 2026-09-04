'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FinaleIcon } from './FinaleIcon';

const seenKey = (slug: string) => `kp-finale-seen-${slug}`;

/** Sätt true under utveckling för att se dörren vid varje omladdning. Ska vara false i drift. */
const ALWAYS_SHOW_DOOR = false;

/**
 * Helskärmsdörr som visas EN gång per avslutad säsong och webbläsare.
 * Båda knapparna sätter seen-flaggan — dörren tjatar aldrig. Klicket på
 * "Träd in" är också användargesten som senare tillåter ljud i finalen.
 */
export function FinaleDoor({ slug, name }: { slug: string; name: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (ALWAYS_SHOW_DOOR) { setShow(true); return; }
    try { if (!window.localStorage.getItem(seenKey(slug))) setShow(true); } catch {}
  }, [slug]);

  function markSeen() {
    try { window.localStorage.setItem(seenKey(slug), '1'); } catch {}
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className='finale-door' role='dialog' aria-modal='true' aria-label='Säsongen är över'>
      <div className='finale-door-panel'>
        <FinaleIcon className='finale-door-icon' size={44} />
        <p className='finale-door-eyebrow'>Hör upp</p>
        <h2 className='finale-door-title'>{name} är över</h2>
        <p className='finale-door-sub'>Krönikan är skriven. Träd in och se hur kronan vandrade.</p>
        <div className='finale-door-actions'>
          <button type='button' className='btn-ghost' onClick={markSeen}>Inte nu</button>
          <Link href={`/seasons/${slug}/final`} className='crown-btn' onClick={markSeen}>Träd in i krönikan</Link>
        </div>
      </div>
    </div>
  );
}
