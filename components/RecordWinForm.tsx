'use client';
import { useMemo, useState } from 'react';

export function RecordWinForm({ players }: { players: { id: string; name: string }[] }) {
  const [winnerId, setWinnerId] = useState(players[0]?.id ?? '');
  const [note, setNote] = useState('');
  const selected = useMemo(() => players.find((p) => p.id === winnerId), [players, winnerId]);

  return (
    <form
      className='page-stack'
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch('/api/wins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ winnerId, note }),
        });
        location.reload();
      }}
    >
      <div className='form-row'>
        <select className='input' value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
          {players.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <input className='input' placeholder='Anteckning (valfritt)' value={note} onChange={(e) => setNote(e.target.value)} />
        <button className='btn' disabled={!winnerId}>Krön vinnaren</button>
      </div>
      <p className='muted' style={{ margin: 0 }}>Vald spelare: <strong>{selected?.name ?? 'Ingen'}</strong></p>
    </form>
  );
}
