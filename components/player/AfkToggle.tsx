'use client';
import { useState } from 'react';

export function AfkToggle({ playerId, isAfk }: { playerId: string; isAfk: boolean }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ afk: !isAfk }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Något gick fel.');
        setSubmitting(false);
        return;
      }
      location.reload();
    } catch {
      setError('Kunde inte nå servern. Försök igen.');
      setSubmitting(false);
    }
  }

  return (
    <div className='afk-toggle'>
      <button type='button' className='btn-ghost' onClick={toggle} disabled={submitting}>
        {isAfk ? '👋 Tillbaka från AFK' : '💤 Sätt som AFK'}
      </button>
      {error && <p className='crown-error'>{error}</p>}
    </div>
  );
}
