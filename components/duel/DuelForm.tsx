'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coronation, type CoronationEvent } from '../Coronation';
import type { WinFormCopy } from '../RecordWinForm';
import { duelOdds, formatResult, resultError } from '@/lib/domain/duel';
import { START_RATING } from '@/lib/domain/crown-rating';

type Player = { id: string; name: string };

const digits = (value: string) => value.replace(/\D/g, '').slice(0, 2);
const toNumber = (value: string) => (value.trim() === '' ? null : Number(value));
const percent = (p: number) => `${Math.round(p * 100)} %`;

function formatCountdown(ms: number) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Registrera 1 mot 1. Utan KronMatch sparas en duell som inte rör tronen. Med KronMatch går
 * matchen kröningsvägen: samma cooldown och bekräftelse som en runda, och vinnaren tar kronan.
 */
export function DuelForm({ players, ratings, challenge, lastWinAt, cooldownMs, copy }: {
  players: Player[];
  ratings: Record<string, number>;
  /** Förifyllt från "Utmana kungen": motståndaren, och KronMatch ikryssad. */
  challenge: string | null;
  lastWinAt: string | null;
  cooldownMs: number;
  copy: WinFormCopy;
}) {
  const router = useRouter();
  const [pair, setPair] = useState<[string, string]>(['', challenge ?? '']);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [sets, setSets] = useState(false);
  const [score, setScore] = useState<[string, string]>(['', '']);
  const [kronMatch, setKronMatch] = useState(Boolean(challenge));
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [coronation, setCoronation] = useState<CoronationEvent | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [cooldownEnd, setCooldownEnd] = useState(lastWinAt ? new Date(lastWinAt).getTime() + cooldownMs : 0);
  // Ett nytt försök efter ett tappat svar använder samma id, så att matchen inte sparas två gånger.
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const name = (id: string | null) => players.find((p) => p.id === id)?.name ?? '';
  const ready = Boolean(pair[0] && pair[1] && pair[0] !== pair[1]);
  const loserId = winnerId ? pair.find((id) => id !== winnerId) ?? null : null;
  const [own, other] = score.map(toNumber);
  const result = sets ? { winnerSets: own, loserSets: other } : { winnerPoints: own, loserPoints: other };
  const problem = resultError(result);
  const remainingMs = now === null ? 0 : Math.max(0, cooldownEnd - now);
  const blocked = kronMatch && remainingMs > 0;
  const odds = ready ? duelOdds(ratings[pair[0]] ?? START_RATING, ratings[pair[1]] ?? START_RATING) : null;

  function choose(i: 0 | 1, id: string) {
    const next = [...pair] as [string, string];
    next[i] = id;
    setPair(next);
    setWinnerId(null);
    requestId.current = null;
  }

  async function submit() {
    if (!winnerId || !loserId || problem || submitting) return;
    requestId.current ??= crypto.randomUUID();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/duels', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: requestId.current, winnerId, loserId, kronMatch, note: kronMatch && note.trim() ? note.trim() : undefined, ...result }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429 && typeof data.remainingMs === 'number') setCooldownEnd(Date.now() + data.remainingMs);
        if (res.status < 500) requestId.current = null;
        setError(data.error ?? 'Kunde inte spara matchen.');
        return;
      }
      requestId.current = null;
      setConfirming(false);
      const text = formatResult(result);
      setSaved(`${name(winnerId)} slog ${name(loserId)}${text ? ` ${text}` : ''}${kronMatch ? ' och tog kronan' : ''}`);
      if (data.kronMatch && data.win) {
        const win = data.win;
        setCooldownEnd(new Date(win.occurredAt).getTime() + cooldownMs);
        setCoronation({
          winnerName: name(winnerId), deposedName: win.previousKingId ? name(win.previousKingId) || null : null,
          streakCount: win.streakCount ?? 1, isNewRuler: win.previousKingId !== winnerId,
          eventType: win.eventType ?? 'NEW_KING', previousStreakCount: win.previousStreakCount ?? 0,
          isFriday: !!win.isFridayFinal, daysSinceLastWin: null,
          returningStreak: !!data.stage?.returningStreak, beatRival: !!data.stage?.beatRival,
        });
      } else {
        reset();
      }
    } catch {
      setError('Svaret kom inte fram. Försök igen: samma match sparas inte två gånger.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setWinnerId(null);
    setScore(['', '']);
    setNote('');
    setKronMatch(false);
    router.refresh();
  }

  return (
    <>
      {saved && <div className='round-saved' role='status'><strong>✓ {saved}</strong></div>}
      <form className='crown-form' inert={confirming || !!coronation} onSubmit={(e) => {
        e.preventDefault();
        if (!winnerId || problem || blocked) return;
        if (kronMatch) setConfirming(true); else submit();
      }}>
        <fieldset className='duel-picker'>
          <legend className='crown-label'>Spelare</legend>
          <div className='duel-players'>
            {([0, 1] as const).map((i) => (
              <select key={i} className='crown-select' aria-label={`Spelare ${i + 1}`} value={pair[i]} onChange={(e) => choose(i, e.target.value)}>
                <option value=''>Välj spelare…</option>
                {players.filter((p) => p.id !== pair[1 - i]).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ))}
          </div>
          {odds && <p className='duel-odds'>
            Före matchen: {name(pair[0])} {percent(odds.a)} · {name(pair[1])} {percent(odds.b)}.
            {' '}Vinner {name(pair[0])}: ±{Math.round(odds.aWins)}. Vinner {name(pair[1])}: ±{Math.round(odds.bWins)}.
          </p>}
          {ready && <div className='duel-winner' role='group' aria-label='Vem vann?'>
            <span className='crown-label'>Vem vann?</span>
            {pair.map((id) => <button key={id} type='button' className='btn-ghost' aria-pressed={winnerId === id} onClick={() => setWinnerId(id)}>{name(id)}</button>)}
          </div>}
        </fieldset>

        {winnerId && <fieldset className='final-score'>
          <legend className='crown-label'>Resultat <em>(valfritt)</em></legend>
          <div className='duel-format' role='group' aria-label='Antal set'>
            <button type='button' aria-pressed={!sets} onClick={() => { setSets(false); setScore(['', '']); }}>Ett set</button>
            <button type='button' aria-pressed={sets} onClick={() => { setSets(true); setScore(['', '']); }}>Flera set</button>
          </div>
          <label><span>{name(winnerId)}</span><input className='crown-input' inputMode='numeric' value={score[0]} onChange={(e) => setScore([digits(e.target.value), score[1]])} aria-label={`${sets ? 'Vunna set' : 'Poäng'} för ${name(winnerId)}`} /></label>
          <span aria-hidden>–</span>
          <label><input className='crown-input' inputMode='numeric' value={score[1]} onChange={(e) => setScore([score[0], digits(e.target.value)])} aria-label={`${sets ? 'Vunna set' : 'Poäng'} för ${name(loserId)}`} /><span>{name(loserId)}</span></label>
          <small className='duel-format-hint'>{sets ? 'Antal vunna set, t.ex. 3–1.' : 'Poängen i setet, t.ex. 11–7.'}</small>
          {problem && <p className='crown-error'>{problem}</p>}
        </fieldset>}

        <label className='kron-match'>
          <input type='checkbox' checked={kronMatch} onChange={(e) => setKronMatch(e.target.checked)} />
          <span><strong>KronMatch</strong> — vinnaren tar kronan, precis som efter en runda.</span>
        </label>
        {kronMatch && <label className='crown-field'>
          <span className='crown-label'>Anteckning <em>(valfritt)</em></span>
          <input className='crown-input' maxLength={500} placeholder='Vad hände?' value={note} onChange={(e) => setNote(e.target.value)} />
        </label>}

        <button className='crown-btn' disabled={!winnerId || !!problem || blocked || submitting}>
          {blocked ? `Kronan kan bytas om ${formatCountdown(remainingMs)}`
            : submitting ? 'Sparar…'
              : kronMatch ? `${copy.crown} ${name(winnerId) || 'vinnaren'}` : 'Spara matchen'}
        </button>
        {blocked && <p className='crown-hint'>En vinnare sattes nyss. Kryssa ur KronMatch för att spara matchen utan kronan.</p>}
        {error && !confirming && <p className='crown-error' role='alert'>{error}</p>}
      </form>

      {confirming && (
        <div className='modal-overlay' role='dialog' aria-modal='true' aria-labelledby='duel-confirm-title' onClick={() => { if (!submitting) setConfirming(false); }}>
          <div className='modal' onClick={(e) => e.stopPropagation()}>
            <h3 id='duel-confirm-title' className='modal-title'>KronMatch: bekräfta {copy.crowning}</h3>
            <p className='modal-body'><strong>{name(winnerId)}</strong> slog {name(loserId)}{formatResult(result) ? ` ${formatResult(result)}` : ''} och tar kronan.</p>
            {error && <p className='crown-error' role='alert'>{error}</p>}
            <div className='modal-actions'>
              <button type='button' className='btn-ghost' onClick={() => setConfirming(false)} disabled={submitting}>Avbryt</button>
              <button type='button' className='crown-btn' onClick={submit} disabled={submitting} autoFocus>
                {submitting ? copy.crowningNow : `Ja, ${copy.crown.toLowerCase()} ${name(winnerId)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {coronation && <Coronation event={coronation} copy={copy.coronation} words={copy.lane} onDone={() => { setCoronation(null); reset(); }} />}
    </>
  );
}
