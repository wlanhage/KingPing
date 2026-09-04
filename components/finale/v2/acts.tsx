'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { FinaleSummary } from '@/lib/domain/finale';
import { formatDuration } from '@/lib/format';
import { JESTER_ROASTS } from '@/components/Coronation';

gsap.registerPlugin(ScrollTrigger);

/**
 * DOM-akterna i v2: HUD-typografi som ligger ovanpå rymden. Inga pinnade sektioner —
 * varje akt är en hög sektion vars text tänds när den kommer i bild. Det gör dem
 * immuna mot removeChild-klassen av buggar, och lämnar all "kamera" åt canvasen.
 */

function useReveal(ref: React.RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        const chars = el.querySelectorAll('.hud-char');
        gsap.from(chars.length ? chars : el, {
          autoAlpha: 0, y: 28, filter: 'blur(10px)', stagger: chars.length ? 0.025 : 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 80%', toggleActions: 'play none none reverse' },
        });
      });
      gsap.utils.toArray<HTMLElement>('[data-counter]').forEach((el) => {
        const target = Number(el.dataset.counter ?? '0');
        const obj = { v: 0 };
        el.textContent = '0';
        gsap.to(obj, {
          v: target, duration: 1.6, ease: 'power2.out', snap: { v: 1 },
          onUpdate: () => { el.textContent = String(Math.round(obj.v)); },
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
        });
      });
    }, ref);
    return () => ctx.revert();
  }, [ref, reduced]);
}

/** Delar upp text i spans så bokstäverna kan stagger-animeras. */
function Split({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className='hud-char' aria-hidden>{ch === ' ' ? ' ' : ch}</span>
      ))}
    </span>
  );
}

export function ColdOpenV2({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useReveal(ref, reduced);
  const from = new Date(summary.season.startedAt).toLocaleDateString('sv-SE');
  const to = summary.season.endedAt ? new Date(summary.season.endedAt).toLocaleDateString('sv-SE') : 'nu';
  return (
    <section ref={ref} className='v2-act v2-coldopen' data-act='coldopen'>
      <p className='hud-eyebrow' data-reveal>Krönikan · {from} — {to}</p>
      <h1 className='hud-title' data-reveal><Split text={summary.season.name} /></h1>
      <p className='hud-line' data-reveal>
        <span className='hud-num' data-counter={summary.wrapped.crownings}>0</span> kröningar ·{' '}
        <span className='hud-num' data-counter={summary.wrapped.players}>0</span> riddare · en tron
      </p>
      <p className='hud-hint' data-reveal>Skrolla för att lämna omloppsbanan ↓</p>
    </section>
  );
}

export function NumbersV2({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useReveal(ref, reduced);
  const { peaks, wrapped, notes } = summary;
  return (
    <section ref={ref} className='v2-act v2-numbers' data-act='numbers'>
      <div className='hud-grid'>
        {peaks.longestStreak && (
          <article className='hud-panel' data-reveal>
            <p className='hud-eyebrow'>Längsta välde</p>
            <p className='hud-big'>{peaks.longestStreak.name}</p>
            <p className='hud-line'><span className='hud-num' data-counter={peaks.longestStreak.streak}>0</span> raka</p>
          </article>
        )}
        {peaks.biggestBreak && (
          <article className='hud-panel' data-reveal>
            <p className='hud-eyebrow'>Det stora störtandet</p>
            <p className='hud-quote'>&ldquo;{peaks.biggestBreak.announcementText.split('\n').pop()}&rdquo;</p>
            <p className='hud-line'>En dynasti på <span className='hud-num' data-counter={peaks.biggestBreak.brokenStreak}>0</span> föll för {peaks.biggestBreak.byName}</p>
          </article>
        )}
        <article className='hud-panel' data-reveal>
          <p className='hud-eyebrow'>Tronskiften</p>
          <p className='hud-big'><span data-counter={wrapped.transfers}>0</span></p>
          <p className='hud-line'><span className='hud-num' data-counter={wrapped.defences}>0</span> försvar</p>
        </article>
        <article className='hud-panel' data-reveal>
          <p className='hud-eyebrow'>Regeringstid</p>
          {wrapped.averageReignMs !== null && <p className='hud-big'>{formatDuration(wrapped.averageReignMs)}</p>}
          {wrapped.shortestReignMs !== null && <p className='hud-line'>kortast: {formatDuration(wrapped.shortestReignMs)} 💀</p>}
        </article>
        {notes.length > 0 && (
          <article className='hud-panel hud-panel-wide' data-reveal>
            <p className='hud-eyebrow'>Ur loggboken</p>
            <p className='hud-quote'>&ldquo;{notes[notes.length - 1].text}&rdquo; — {notes[notes.length - 1].byName}</p>
          </article>
        )}
      </div>
    </section>
  );
}

export function GalaxyCaptionV2({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const live = useRef<HTMLSpanElement | null>(null);
  useReveal(ref, reduced);
  const total = summary.transfers.length;

  // HUD:en räknar spåren i takt med att de ritas i rymden, så skrollen ger feedback
  // även i DOM:en. Icke-pinnad ScrollTrigger på sektionen; progress 0–1 över den.
  useEffect(() => {
    if (reduced || !ref.current || !live.current) { if (live.current) live.current.textContent = String(total); return; }
    const st = ScrollTrigger.create({
      trigger: ref.current, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { if (live.current) live.current.textContent = String(Math.round(self.progress * total)); },
    });
    return () => st.kill();
  }, [reduced, total]);

  return (
    <section ref={ref} className='v2-act v2-galaxy' data-act='galaxy'>
      <div className='hud-corner'>
        <p className='hud-eyebrow' data-reveal>Kronans vandring</p>
        <p className='hud-line' data-reveal>
          Spår <span className='hud-num' ref={live}>0</span> av {total} · {summary.wrapped.players} planeter
        </p>
        <p className='hud-hint' data-reveal>Skrolla — kometen följer kronan</p>
      </div>
      <div className='v2-spacer' aria-hidden />
    </section>
  );
}

export function CoronationV2({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useReveal(ref, reduced);
  const winner = summary.standings[0];
  return (
    <section ref={ref} className='v2-act v2-coronation' data-act='coronation'>
      <div className='v2-spacer' aria-hidden />
      <p className='hud-eyebrow' data-reveal>Warp mot tronen</p>
      {winner && (
        <p className='hud-line' data-reveal>
          {winner.name} · <span className='hud-num' data-counter={winner.totalWins}>0</span> vinster · längsta streak {winner.longestStreak}
        </p>
      )}
    </section>
  );
}

export function EpilogueV2({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useReveal(ref, reduced);
  return (
    <section ref={ref} className='v2-act v2-epilogue' data-act='epilogue'>
      <div className='v2-spacer' aria-hidden />
      <div className='hud-credits'>
        {summary.standings.map((row, i) => (
          <div key={row.id} className='hud-credit' data-reveal>
            <p className='hud-credit-name'>{row.name}</p>
            <p className='hud-credit-role'>#{row.rank} · {row.totalWins} vinster</p>
            {i % 3 === 2 && <p className='hud-credit-roast'>&ldquo;{JESTER_ROASTS[i % JESTER_ROASTS.length].replaceAll('{name}', row.name)}&rdquo;</p>}
          </div>
        ))}
        <div className='hud-credit' data-reveal>
          <p className='hud-credit-role'>Ingen pingisboll kom till skada under denna säsong.</p>
          <p className='hud-credit-role'>Vad som kröns kan aldrig dö. 👑</p>
        </div>
      </div>
    </section>
  );
}
