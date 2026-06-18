'use client';
import { useEffect, useState } from 'react';
import type { ComputedPlayerBadge } from '@/lib/badges/badge-types';

const RARITY_TAG: Record<string, string> = {
  mythical: 'Mytisk',
  legendary: 'Legendarisk',
  epic: 'Episk',
  rare: 'Sällsynt',
  common: 'Vanlig',
};

export function AllBadgesButton({ badges }: { badges: ComputedPlayerBadge[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button className='all-badges-btn' onClick={() => setOpen(true)}>
        🛡️ Alla utmärkelser <span>{badges.length}</span>
      </button>

      {open && (
        <div className='modal-overlay' role='dialog' aria-modal='true' aria-labelledby='badges-title' onClick={() => setOpen(false)}>
          <div className='modal modal-badges' onClick={(e) => e.stopPropagation()}>
            <div className='modal-badges-head'>
              <h3 id='badges-title' className='modal-title'>Utmärkelser · {badges.length}</h3>
              <button className='modal-close' onClick={() => setOpen(false)} aria-label='Stäng'>✕</button>
            </div>

            {badges.length ? (
              <div className='modal-badges-list'>
                {badges.map((b) => (
                  <article key={b.id} className={`badge-codex-card rarity-accent-${b.definition.rarity}`}>
                    <div className={`badge-codex-medallion rarity-${b.definition.rarity}`} aria-hidden>{b.definition.emoji}</div>
                    <div className='badge-codex-body'>
                      <h4 className='badge-codex-name'>{b.definition.name}</h4>
                      <span className={`badge-codex-rarity rarity-text-${b.definition.rarity}`}>{RARITY_TAG[b.definition.rarity] ?? b.definition.rarity}</span>
                      <p className='badge-codex-desc'>{b.definition.description}</p>
                      {b.reason && <p className='badge-codex-reason'>{b.reason}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className='muted'>Inga utmärkelser ännu — dags att vinna några ronder.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
