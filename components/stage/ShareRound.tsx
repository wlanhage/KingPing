'use client';
import { useState } from 'react';

/** Sharing is explicit: no messages are sent by the app. The player chooses the destination. */
export function ShareRound({ roundId, winnerName, standings }: { roundId: string; winnerName: string; standings: string[] }) {
  const [status, setStatus] = useState('');
  const [fallback, setFallback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function copyLink() {
    const url = new URL(`/rundor/${roundId}`, window.location.origin).href;
    setStatus(''); setFallback(null);
    try { await navigator.clipboard.writeText(url); setStatus('Resultatlänken är kopierad.'); }
    catch { setFallback(url); setStatus('Kopiera länken nedan för att dela rundan.'); }
  }
  async function share() {
    if (busy) return;
    setBusy(true); setStatus(''); setFallback(null);
    const url = new URL(`/rundor/${roundId}`, window.location.origin).href;
    const text = `${winnerName} vann rundan!${standings.length >= 2 ? ` ${standings.map((name, i) => `${i + 1}. ${name}`).join(' · ')}` : ''}`;
    try {
      if (navigator.share) await navigator.share({ title: `${winnerName} tar kronan`, text, url });
      else await copyLink();
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) { setFallback(url); setStatus('Kopiera länken nedan för att dela rundan.'); }
    } finally { setBusy(false); }
  }
  return <div className='round-share'>
    <button type='button' className='btn-ghost' onClick={share} disabled={busy}>{busy ? 'Öppnar delning…' : 'Dela rundan ↗'}</button>
    <button type='button' className='btn-ghost' onClick={copyLink}>Kopiera länk</button>
    <span role='status'>{status}</span>
    {fallback && <label>Resultatlänk<input readOnly value={fallback} onFocus={(e) => e.currentTarget.select()} /></label>}
  </div>;
}
