'use client';
import { useState } from 'react';

export function RecordWinForm() {
  const [winnerId, setWinnerId] = useState('');
  const [note, setNote] = useState('');

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
        <input className='input' placeholder='Winner ID' value={winnerId} onChange={(e) => setWinnerId(e.target.value)} />
        <input className='input' placeholder='Note' value={note} onChange={(e) => setNote(e.target.value)} />
        <button className='btn'>Krön vinnaren</button>
      </div>
    </form>
  );
}
