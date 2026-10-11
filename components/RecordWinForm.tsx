'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseWinDraft, WIN_DRAFT_KEY, type WinDraft } from '@/lib/domain/win-draft';
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

export function RecordWinForm({ players, startingAbsent, lastWinAt, cooldownMs, copy }: { players: { id: string; name: string }[]; startingAbsent: string[]; lastWinAt: string | null; cooldownMs: number; copy: WinFormCopy }) {
  const router = useRouter();
  const [pending, setPending] = useState<WinDraft | null>(null);
  const [savedRound, setSavedRound] = useState<{ id: string; name: string } | null>(null);
  const [serverCooldownEnd, setServerCooldownEnd] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const savedLinkRef = useRef<HTMLAnchorElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  // Förra rundans grupp börjar som med, övriga kryssade.
  const [absent, setAbsent] = useState<string[]>(startingAbsent);
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
  const pristine = out.length === 0 && absent.length === startingAbsent.length && absent.every((id) => startingAbsent.includes(id));

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

  const cooldownEndsAt = Math.max(serverCooldownEnd, lastWinAt ? new Date(lastWinAt).getTime() + cooldownMs : 0);
  const remainingMs = now === null ? 0 : Math.max(0, cooldownEndsAt - now);
  const onCooldown = remainingMs > 0;

  useEffect(() => {
    try { setPending(parseWinDraft(sessionStorage.getItem(WIN_DRAFT_KEY))); } catch { /* Private browsing may block storage. */ }
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!confirming) return;
    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !inFlight.current) setConfirming(false);
      if (e.key !== 'Tab' || !dialog) return;
      const buttons = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
      if (!buttons.length) { e.preventDefault(); return; }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  }, [confirming]);

  useEffect(() => {
    if (confirming || submitting || coronation) return;
    // Restore only after the form's inert attribute has been removed from the DOM.
    const fallback = error ? errorRef.current : savedLinkRef.current;
    const target = pending ? retryRef.current : submitRef.current?.disabled ? fallback : returnFocus.current ? submitRef.current : null;
    const frame = requestAnimationFrame(() => target?.focus());
    return () => cancelAnimationFrame(frame);
  }, [pending, confirming, submitting, coronation]);

  // Två klick i samma ögonblick hinner före Reacts omrendering av disabled — refen stoppar det andra.
  const inFlight = useRef(false);

  function clearPending() {
    setPending(null);
    try { sessionStorage.removeItem(WIN_DRAFT_KEY); } catch { /* Recording still works without storage. */ }
  }

  async function submit() {
    if (inFlight.current || (!pending && (!winnerId || !standings))) return;
    const draft = pending ?? { requestId: crypto.randomUUID(), winnerId: winnerId!, standings: standings!, note };
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    setPending(draft);
    try { sessionStorage.setItem(WIN_DRAFT_KEY, JSON.stringify(draft)); } catch { /* Retry still retains its key in memory. */ }
    try {
      const res = await fetch('/api/wins', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft), signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status < 500) clearPending();
        if (res.status === 429 && typeof data.remainingMs === 'number') setServerCooldownEnd(Date.now() + data.remainingMs);
        setError(data.error ?? 'Något gick fel. Försök igen.');
        setConfirming(false);
        return;
      }
      if (!data?.win?.id) throw new Error('Missing saved result');
      clearPending();
      const win = data.win;
      const savedWinnerName = nameOf(draft.winnerId) ?? 'Vinnaren';
      setSavedRound({ id: win.id, name: savedWinnerName });
      setServerCooldownEnd(new Date(win.occurredAt).getTime() + cooldownMs);
      const previousKingId: string | null = win.previousKingId ?? null;
      setConfirming(false);
      setCoronation({
        winnerName: savedWinnerName,
        deposedName: previousKingId ? nameOf(previousKingId) ?? null : null,
        streakCount: win.streakCount ?? 1, isNewRuler: previousKingId !== draft.winnerId,
        eventType: win.eventType ?? 'NEW_KING', previousStreakCount: win.previousStreakCount ?? 0,
        isFriday: !!win.isFridayFinal, daysSinceLastWin: null,
        returningStreak: !!data.stage?.returningStreak, beatRival: !!data.stage?.beatRival,
      });
    } catch {
      setError('Svaret kom inte fram. Rundans resultat ligger kvar — försök igen så kontrollerar vi om den redan är sparad.');
      setConfirming(false);
    } finally {
      setSubmitting(false);
      inFlight.current = false;
    }
  }

  return (
    <>
      {savedRound && <div className='round-saved' role='status'><strong>✓ {savedRound.name}s runda är sparad</strong><Link ref={savedLinkRef} href={`/rundor/${savedRound.id}`}>Visa resultat & dela →</Link></div>}
      {pending && !confirming && <section className='round-recovery' aria-live='polite'>
        <strong>En runda väntar på bekräftelse</strong>
        <p>{nameOf(pending.winnerId) ?? 'Vinnaren'} · {pending.standings.length} spelare. Samma resultat skickas igen utan att skapa en dubbelrunda.</p>
        {error && <p role='alert'>{error}</p>}
        <button ref={retryRef} type='button' className='crown-btn' disabled={submitting} onClick={submit}>{submitting ? 'Kontrollerar rundan…' : 'Kontrollera & försök igen'}</button>
        <Link href='/history'>Kontrollera krönikan →</Link>
      </section>}
      <form
        className='crown-form'
        // Medan bekräftelsen är öppen får placeringen bakom inte ändras (t.ex. via tangentbordet).
        inert={confirming || !!pending || submitting || !!coronation}
        onSubmit={(e) => {
          e.preventDefault();
          if (!onCooldown && winnerId) {
            setError(null);
            returnFocus.current = submitRef.current;
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
          <div className='round-progress' aria-label={`${out.length} av ${Math.max(0, participantIds.length - 1)} utslagningar`}>
            <span>{participantIds.length} vid bordet</span><strong>{winnerId ? 'Redo att spara' : `${remaining} kvar`}</strong>
            <progress value={out.length} max={Math.max(1, participantIds.length - 1)} />
          </div>
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
          <button type='button' className='btn-ghost standings-reset' aria-disabled={pristine} onClick={() => { setOut([]); setAbsent(startingAbsent); }}>Börja om</button>
        </fieldset>

        <label className='crown-field'>
          <span className='crown-label'>Anteckning <em>(valfritt)</em></span>
          <input className='crown-input' placeholder='Vad hände? Ett ord eller en hel saga' maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} disabled={onCooldown} />
        </label>

        <button ref={submitRef} className='crown-btn' disabled={!winnerId || onCooldown}>
          {onCooldown ? `Ny vinnare om ${formatCountdown(remainingMs)}` : `${copy.crown} ${winnerName ?? 'vinnaren'}`}
        </button>

        {onCooldown && (
          <p className='crown-hint'>En vinnare sattes nyss. För att undvika dubbelsättningar kan nästa {copy.crowning} ske om {formatCountdown(remainingMs)}.</p>
        )}
        {error && !pending && <p ref={errorRef} tabIndex={-1} className='crown-error' role='alert'>{error}</p>}
      </form>

      {confirming && (
        <div
          className='modal-overlay'
          role='dialog'
          aria-modal='true'
          aria-labelledby='confirm-title'
          onClick={() => { if (!submitting) setConfirming(false); }}
        >
          <div ref={dialogRef} className='modal' onClick={(e) => e.stopPropagation()}>
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

      {coronation && <Coronation event={coronation} copy={copy.coronation} words={copy.lane} onDone={() => { setCoronation(null); setOut([]); setNote(''); router.refresh(); }} />}
    </>
  );
}
