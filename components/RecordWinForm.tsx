'use client';
import { useEffect, useMemo, useState } from 'react';

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RecordWinForm({ players, lastWinAt, cooldownMs }: { players: { id: string; name: string }[]; lastWinAt: string | null; cooldownMs: number }) {
  const [winnerId, setWinnerId] = useState(players[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null fram till mount → identisk render på server och klient (ingen hydration-mismatch).
  const [now, setNow] = useState<number | null>(null);

  const selected = useMemo(() => players.find((p) => p.id === winnerId), [players, winnerId]);

  const cooldownEndsAt = lastWinAt ? new Date(lastWinAt).getTime() + cooldownMs : 0;
  const remainingMs = now === null ? 0 : Math.max(0, cooldownEndsAt - now);
  const onCooldown = remainingMs > 0;

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) setConfirming(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [confirming, submitting]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Något gick fel. Försök igen.');
        setConfirming(false);
        setSubmitting(false);
        return;
      }
      location.reload();
    } catch {
      setError('Kunde inte nå servern. Försök igen.');
      setConfirming(false);
      setSubmitting(false);
    }
  }

  return (
    <>
      <form
        className='crown-form'
        onSubmit={(e) => {
          e.preventDefault();
          if (!onCooldown && winnerId) {
            setError(null);
            setConfirming(true);
          }
        }}
      >
        <label className='crown-field'>
          <span className='crown-label'>Spelare</span>
          <select className='crown-select' value={winnerId} onChange={(e) => setWinnerId(e.target.value)} disabled={onCooldown}>
            {players.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className='crown-field'>
          <span className='crown-label'>Anteckning <em>(valfritt)</em></span>
          <input className='crown-input' placeholder='T.ex. avgörande final' value={note} onChange={(e) => setNote(e.target.value)} disabled={onCooldown} />
        </label>

        <button className='crown-btn' disabled={!winnerId || onCooldown}>
          {onCooldown ? `Ny vinnare om ${formatCountdown(remainingMs)}` : `Kröna ${selected?.name ?? 'vinnaren'}`}
        </button>

        {onCooldown && (
          <p className='crown-hint'>En vinnare sattes nyss. För att undvika dubbelsättningar kan en ny krönas om {formatCountdown(remainingMs)}.</p>
        )}
        {error && <p className='crown-error'>{error}</p>}
      </form>

      {confirming && (
        <div
          className='modal-overlay'
          role='dialog'
          aria-modal='true'
          aria-labelledby='confirm-title'
          onClick={() => { if (!submitting) setConfirming(false); }}
        >
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <h3 id='confirm-title' className='modal-title'>Bekräfta kröning</h3>
            <p className='modal-body'>Är du säker på att du vill sätta <strong>{selected?.name}</strong> som vinnare?</p>
            <div className='modal-actions'>
              <button type='button' className='btn-ghost' onClick={() => setConfirming(false)} disabled={submitting}>Avbryt</button>
              <button type='button' className='crown-btn' onClick={submit} disabled={submitting}>
                {submitting ? 'Kröner…' : `Ja, kröna ${selected?.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
