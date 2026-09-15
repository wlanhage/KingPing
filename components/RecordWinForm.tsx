'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Coronation, type CoronationCopy, type CoronationEvent, type LaneWords } from './Coronation';
import { knockoutPlace, standingsFromKnockouts } from '@/lib/domain/standings';

export type WinFormCopy = { crown: string; crowning: string; crowningNow: string; coronation: CoronationCopy; lane: LaneWords };

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function RecordWinForm({ players, lastWinAt, cooldownMs, copy }: { players: { id: string; name: string }[]; lastWinAt: string | null; cooldownMs: number; copy: WinFormCopy }) {
  // Alla börjar som med i rundan. `absent` = kryssade, `out` = utslagna i den ordning de trycktes in.
  const [absent, setAbsent] = useState<string[]>([]);
  const [out, setOut] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coronation, setCoronation] = useState<CoronationEvent | null>(null);
  // null fram till mount → identisk render på server och klient (ingen hydration-mismatch).
  const [now, setNow] = useState<number | null>(null);

  const participantIds = useMemo(() => players.filter((p) => !absent.includes(p.id)).map((p) => p.id), [players, absent]);
  const standings = useMemo(() => standingsFromKnockouts(participantIds, out), [participantIds, out]);
  const winnerId = standings?.[0] ?? null;
  const nameOf = (id: string | null) => players.find((p) => p.id === id)?.name;
  const winnerName = nameOf(winnerId);
  const remaining = participantIds.length - out.length;

  // Tryck på en spelare: åkte ut som nästa. Tryck igen: ångra. Den sista som står kvar är vinnaren
  // och kan inte slås ut; en kryssad spelare tas med igen.
  function knock(id: string) {
    if (absent.includes(id)) return toggleAbsent(id);
    if (out.includes(id)) return setOut(out.filter((x) => x !== id));
    if (remaining > 1) setOut([...out, id]);
  }

  function toggleAbsent(id: string) {
    if (absent.includes(id)) return setAbsent(absent.filter((x) => x !== id));
    setAbsent([...absent, id]);
    // Kryssas den som stod kvar ensam blir den senast utslagna vinnare: minst en ska alltid stå kvar.
    const nextOut = out.filter((x) => x !== id);
    setOut(nextOut.slice(0, Math.max(0, participantIds.length - 2)));
  }

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
    if (inFlight.current || !winnerId) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId, standings, note }),
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
        // Medan bekräftelsen är öppen får placeringen bakom inte ändras (t.ex. via tangentbordet).
        inert={confirming}
        onSubmit={(e) => {
          e.preventDefault();
          if (!onCooldown && winnerId) {
            setError(null);
            setConfirming(true);
          }
        }}
      >
        <fieldset className='standings' disabled={onCooldown}>
          <legend className='crown-label'>Placering</legend>
          <p className='standings-prompt' aria-live='polite'>
            {onCooldown
              ? `Nästa ${copy.crowning} om ${formatCountdown(remainingMs)}.`
              : participantIds.length < 2
              ? 'Minst två måste ha spelat.'
              : winnerId
                ? `${winnerName} står kvar och vinner rundan.`
                : out.length === 0
                  ? 'Vem åkte ut först?'
                  : `Vem åkte ut sedan? ${remaining} kvar.`}
          </p>
          <p className='standings-help'>Tryck på spelarna i den ordning de åkte ut. Kryssa den som inte var med.</p>
          <ul className='standings-list'>
            {players.map((p) => {
              const index = out.indexOf(p.id);
              const state = absent.includes(p.id) ? 'absent' : index >= 0 ? 'out' : p.id === winnerId ? 'winner' : 'in';
              const place = knockoutPlace(participantIds.length, index);
              return (
                <li key={p.id} className='standing-row' data-state={state}>
                  <button
                    type='button'
                    className='standing-main'
                    onClick={() => knock(p.id)}
                    aria-label={
                      state === 'absent' ? `${p.name} var inte med. Tryck för att ta med.`
                        : state === 'out' ? `${p.name}, plats ${place}. Tryck för att ångra.`
                          : state === 'winner' ? `${p.name} vinner rundan.`
                            : `${p.name} åkte ut som nästa.`
                    }
                  >
                    <span className='standing-place' aria-hidden>{state === 'out' ? place : state === 'winner' ? '👑' : ''}</span>
                    <span className='standing-name'>{p.name}</span>
                  </button>
                  <button
                    type='button'
                    className='standing-cross'
                    onClick={() => toggleAbsent(p.id)}
                    aria-pressed={state === 'absent'}
                    aria-label={`${p.name} var inte med`}
                    title={state === 'absent' ? 'Ta med igen' : 'Var inte med'}
                  >
                    {state === 'absent' ? '↺' : '✕'}
                  </button>
                </li>
              );
            })}
          </ul>
          {/* Alltid monterad: försvann knappen när man tryckte på den tappade tangentbordet fokus. */}
          <button type='button' className='btn-ghost standings-reset' aria-disabled={out.length === 0 && absent.length === 0} onClick={() => { setOut([]); setAbsent([]); }}>Börja om</button>
        </fieldset>

        <label className='crown-field'>
          <span className='crown-label'>Anteckning <em>(valfritt)</em></span>
          <input className='crown-input' placeholder='Vad hände? Ett ord eller en hel saga' value={note} onChange={(e) => setNote(e.target.value)} disabled={onCooldown} />
        </label>

        <button className='crown-btn' disabled={!winnerId || onCooldown}>
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
            <ol className='standing-summary' aria-label='Placering'>
              {standings?.map((id) => <li key={id}>{nameOf(id)}</li>)}
            </ol>
            <div className='modal-actions'>
              <button type='button' className='btn-ghost' onClick={() => setConfirming(false)} disabled={submitting}>Avbryt</button>
              <button type='button' className='crown-btn' onClick={submit} disabled={submitting || !winnerId}>
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
