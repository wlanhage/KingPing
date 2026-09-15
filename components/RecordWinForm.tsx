'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Coronation, type CoronationCopy, type CoronationEvent, type LaneWords } from './Coronation';
import { resolveFinal } from '@/lib/domain/round';

export type WinFormCopy = { crown: string; crowning: string; crowningNow: string; coronation: CoronationCopy; lane: LaneWords };

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RecordWinForm({ players, startingGroup, lastWinAt, cooldownMs, copy }: { players: { id: string; name: string }[]; startingGroup: string[]; lastWinAt: string | null; cooldownMs: number; copy: WinFormCopy }) {
  // Bordet börjar som förra rundans grupp: oftast noll tryck. Vinnare och finalförlorare är ett tryck var.
  const [atTable, setAtTable] = useState<string[]>(startingGroup);
  const [winnerPick, setWinnerPick] = useState<string | null>(null);
  const [runnerUpPick, setRunnerUpPick] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coronation, setCoronation] = useState<CoronationEvent | null>(null);
  // null fram till mount → identisk render på server och klient (ingen hydration-mismatch).
  const [now, setNow] = useState<number | null>(null);

  const participants = useMemo(() => players.filter((p) => atTable.includes(p.id)), [players, atTable]);
  const participantIds = participants.map((p) => p.id);
  const { winnerId, runnerUpId } = resolveFinal(participantIds, winnerPick, runnerUpPick);
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name;
  const winnerName = nameOf(winnerId);
  const ready = !!winnerId && !!runnerUpId;
  const toggleAtTable = (id: string) => setAtTable(atTable.includes(id) ? atTable.filter((x) => x !== id) : [...atTable, id]);

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

  // Två klick i samma ögonblick hinner före Reacts omrendering av disabled — refen stoppar det andra.
  const inFlight = useRef(false);

  async function submit() {
    if (inFlight.current || !ready) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, runnerUpId, participantIds, note }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Något gick fel. Försök igen.');
        setConfirming(false);
        setSubmitting(false);
        inFlight.current = false;
        return;
      }
      // Läs ut kröningen ur svaret och avfyra THE ROYAL CORONATION SPECTACULAR™.
      const data = await res.json().catch(() => null);
      const win = data?.win;
      const previousKingId: string | null = win?.previousKingId ?? null;
      const isNewRuler = previousKingId !== winnerId; // samma kung som försvarar → previousKingId === winnerId
      setConfirming(false);
      setCoronation({
        winnerName: winnerName ?? 'Den nya regenten',
        deposedName: previousKingId ? players.find((p) => p.id === previousKingId)?.name ?? null : null,
        streakCount: win?.streakCount ?? 1,
        isNewRuler,
        eventType: win?.eventType ?? 'NEW_KING',
        previousStreakCount: win?.previousStreakCount ?? 0,
        isFriday: !!win?.isFridayFinal,
        daysSinceLastWin: null,
        returningStreak: !!data?.stage?.returningStreak,
        beatRival: !!data?.stage?.beatRival,
      });
    } catch {
      setError('Kunde inte nå servern. Försök igen.');
      setConfirming(false);
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  return (
    <>
      <form
        className='crown-form'
        // Medan bekräftelsen är öppen får rundan bakom inte ändras (t.ex. via tangentbordet).
        inert={confirming}
        onSubmit={(e) => {
          e.preventDefault();
          if (!onCooldown && ready) {
            setError(null);
            setConfirming(true);
          }
        }}
      >
        <fieldset className='round' disabled={onCooldown}>
          <legend className='crown-label'>Vid bordet <em>({participants.length})</em></legend>
          <div className='chips'>
            {players.map((p) => (
              <label key={p.id} className='chip'>
                <input type='checkbox' checked={atTable.includes(p.id)} onChange={() => toggleAtTable(p.id)} />
                <span>{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {participants.length < 2 ? (
          <p className='crown-hint'>Minst två måste ha stått vid bordet.</p>
        ) : (
          <>
            <fieldset className='round' disabled={onCooldown}>
              <legend className='crown-label'>Vann finalen</legend>
              <div className='chips'>
                {participants.map((p) => (
                  <label key={p.id} className='chip chip-winner'>
                    <input type='radio' name='winner' checked={winnerId === p.id} onChange={() => setWinnerPick(p.id)} />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className='round' disabled={onCooldown}>
              <legend className='crown-label'>Förlorade finalen</legend>
              <div className='chips'>
                {/* Vinnaren står kvar men går inte att välja, så inga chips flyttar sig under fingret. */}
                {participants.map((p) => (
                  <label key={p.id} className='chip'>
                    <input type='radio' name='runnerUp' checked={runnerUpId === p.id} disabled={winnerId === p.id} onChange={() => setRunnerUpPick(p.id)} />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <label className='crown-field'>
          <span className='crown-label'>Anteckning <em>(valfritt)</em></span>
          <input className='crown-input' placeholder='Vad hände? Ett ord eller en hel saga' value={note} onChange={(e) => setNote(e.target.value)} disabled={onCooldown} />
        </label>

        <button className='crown-btn' disabled={!ready || onCooldown}>
          {onCooldown ? `Ny vinnare om ${formatCountdown(remainingMs)}` : `${copy.crown} ${winnerName ?? 'vinnaren'}`}
        </button>

        {onCooldown && (
          <p className='crown-hint'>En vinnare sattes nyss. För att undvika dubbelsättningar kan nästa {copy.crowning} ske om {formatCountdown(remainingMs)}.</p>
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
            <h3 id='confirm-title' className='modal-title'>Bekräfta {copy.crowning}</h3>
            <p className='modal-body'>Är du säker på att du vill sätta <strong>{winnerName}</strong> som vinnare?</p>
            <p className='modal-body round-summary'>Finalen mot <strong>{nameOf(runnerUpId)}</strong>. Vid bordet: {participants.map((p) => p.name).join(', ')}.</p>
            <div className='modal-actions'>
              <button type='button' className='btn-ghost' onClick={() => setConfirming(false)} disabled={submitting}>Avbryt</button>
              <button type='button' className='crown-btn' onClick={submit} disabled={submitting || !ready}>
                {submitting ? copy.crowningNow : `Ja, ${copy.crown.toLowerCase()} ${winnerName}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {coronation && <Coronation event={coronation} copy={copy.coronation} words={copy.lane} onDone={() => location.reload()} />}
    </>
  );
}
