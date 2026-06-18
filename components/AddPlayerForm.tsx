'use client';
import { useState } from 'react';

export function AddPlayerForm() {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Namnet måste vara minst 2 tecken.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.includes('Unique') ? 'En riddare med det namnet finns redan.' : (data.error ?? 'Något gick fel.'));
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
    <form className='add-knight-form' onSubmit={submit}>
      <input
        className='crown-input'
        placeholder='Namnge en ny riddare…'
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label='Namn på ny riddare'
      />
      <button className='crown-btn' disabled={submitting}>
        {submitting ? 'Dubbar…' : 'Dubba riddare'}
      </button>
      {error && <p className='crown-error' style={{ flexBasis: '100%' }}>{error}</p>}
    </form>
  );
}
