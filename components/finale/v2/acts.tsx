'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { FinaleSummary } from '@/lib/domain/finale';
import { formatDuration } from '@/lib/format';
import { JESTER_ROASTS } from '@/components/Coronation';
import { getTheme } from '@/lib/theme';
import { superlatives, topRivalry, verdictFor, winless } from './verdicts';

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

/**
 * Delar upp text i spans så bokstäverna kan stagger-animeras — men ett ord får aldrig
 * brytas var som helst ("RUNDPINGI / SRIKET"). Varje ord är nowrap; långa
 * sammansättningar får EN tillåten brytpunkt före ett känt suffix, så "Rundpingisriket"
 * blir "Rundpingis / riket" när det inte får plats på en rad.
 */
const BREAK_BEFORE = ['riket', 'galaxen', 'imperiet', 'ligan', 'kungadömet'];

function Split({ text }: { text: string }) {
  const words = text.split(' ');
  return (
    <span aria-label={text}>
      {words.map((word, w) => {
        const lower = word.toLowerCase();
        const suffix = BREAK_BEFORE.find((sfx) => lower.endsWith(sfx) && lower.length > sfx.length + 3);
        const cut = suffix ? word.length - suffix.length : -1;
        return (
          <span key={w} className='hud-word'>
            {[...word].map((ch, i) => (
              <span key={i}>
                {i === cut && <wbr />}
                <span className='hud-char' aria-hidden>{ch}</span>
              </span>
            ))}
            {w < words.length - 1 && ' '}
          </span>
        );
      })}
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

  // Inga lådor: varje siffra är en annotation som svävar i rymden — mätlinje, etikett,
  // stor siffra, en rad detalj — omväxlande vänster/höger så galaxen syns emellan.
  const callouts: React.ReactNode[] = [];
  if (peaks.longestStreak) callouts.push(
    <div key='streak' className='hud-callout' data-reveal>
      <p className='hud-eyebrow'>Längsta välde</p>
      <p className='hud-big'>{peaks.longestStreak.name}</p>
      <p className='hud-detail'><span className='hud-num' data-counter={peaks.longestStreak.streak}>0</span> raka vinster</p>
    </div>,
  );
  if (peaks.biggestBreak) callouts.push(
    <div key='break' className='hud-callout' data-reveal>
      <p className='hud-eyebrow'>Det stora störtandet</p>
      <p className='hud-big hud-big-quote'>&ldquo;{peaks.biggestBreak.announcementText.split('\n').pop()}&rdquo;</p>
      <p className='hud-detail'>En dynasti på <span className='hud-num' data-counter={peaks.biggestBreak.brokenStreak}>0</span> föll för {peaks.biggestBreak.byName}</p>
    </div>,
  );
  callouts.push(
    <div key='transfers' className='hud-callout' data-reveal>
      <p className='hud-eyebrow'>Tronskiften</p>
      <p className='hud-big'><span data-counter={wrapped.transfers}>0</span></p>
      <p className='hud-detail'>och <span className='hud-num' data-counter={wrapped.defences}>0</span> försvar av kronan</p>
    </div>,
  );
  if (wrapped.averageReignMs !== null) callouts.push(
    <div key='reign' className='hud-callout' data-reveal>
      <p className='hud-eyebrow'>Regeringstid i snitt</p>
      <p className='hud-big'>{formatDuration(wrapped.averageReignMs)}</p>
      {wrapped.shortestReignMs !== null && <p className='hud-detail'>kortast: {formatDuration(wrapped.shortestReignMs)} 💀</p>}
    </div>,
  );
  if (notes.length > 0) callouts.push(
    <div key='note' className='hud-callout' data-reveal>
      <p className='hud-eyebrow'>Ur loggboken</p>
      <p className='hud-big hud-big-quote'>&ldquo;{notes[notes.length - 1].text}&rdquo;</p>
      <p className='hud-detail'>— {notes[notes.length - 1].byName}</p>
    </div>,
  );

  return (
    <section ref={ref} className='v2-act v2-numbers' data-act='numbers'>
      {callouts.map((c, i) => (
        <div key={i} className={`hud-beat${i % 2 === 1 ? ' hud-beat-right' : ''}`}>{c}</div>
      ))}
    </section>
  );
}

export function RivalryV2({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useReveal(ref, reduced);
  const names = Object.fromEntries(summary.standings.map((s) => [s.id, s.name]));
  const rivalry = topRivalry(summary.transfers, names);
  const supers = superlatives(summary.standings, summary.defences, formatDuration);
  const none = winless(summary.standings);
  return (
    <section ref={ref} className='v2-act v2-rivalry' data-act='rivalry'>
      {rivalry && (
        <div className='hud-duel' data-reveal>
          <p className='hud-eyebrow'>Säsongens fejd</p>
          <p className='hud-duel-names'>
            <span>{rivalry.a}</span>
            <span className='hud-duel-vs'>⚔</span>
            <span>{rivalry.b}</span>
          </p>
          <p className='hud-detail'>
            Kronan bytte händer <span className='hud-num' data-counter={rivalry.total}>0</span> gånger mellan er —{' '}
            {rivalry.a} tog den {rivalry.aToB}, {rivalry.b} tog tillbaka den {rivalry.bToA}.
          </p>
        </div>
      )}
      {supers.length > 0 && (
        <ul className='hud-supers'>
          {supers.map((sp) => (
            <li key={sp.label} className='hud-super' data-reveal>
              <span className='hud-eyebrow'>{sp.label}</span>
              <span className='hud-super-name'>{sp.name}</span>
              <span className='hud-super-value'>{sp.value}</span>
            </li>
          ))}
        </ul>
      )}
      {none.length > 0 && (
        <div className='hud-winless' data-reveal>
          <p className='hud-eyebrow'>Utan krona</p>
          <p className='hud-super-name'>{none.map((r) => r.name).join(' · ')}</p>
          <p className='hud-detail'>{verdictFor(none[0], 0, summary.standings.length)}</p>
          {/* Noll vinster betyder också noll störtanden — den enda som aldrig förlorade tronen. */}
          <p className='hud-detail hud-winless-twist'>0 vinster · 0 störtanden — obesegrad, tekniskt sett.</p>
        </div>
      )}
    </section>
  );
}

export function DepartureV2({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  useReveal(ref, reduced);
  const next = summary.nextSeason;
  const nextTheme = next ? getTheme(next.theme) : null;
  // Nästa temas färger som CSS-variabler på akten, så texten skiftar palett med nebulosan.
  const vars = nextTheme
    ? ({ '--dep-gold': nextTheme.colors.gold, '--dep-accent': nextTheme.colors.accent, '--dep-text': nextTheme.colors.text } as React.CSSProperties)
    : undefined;
  return (
    <section ref={ref} className='v2-act v2-departure' data-act='departure' style={vars}>
      <p className='hud-eyebrow' data-reveal>Riket lämnar omloppsbanan</p>
      <h2 className='hud-title hud-title-sm' data-reveal><Split text={`Farväl, ${summary.season.name}`} /></h2>
      {next && nextTheme ? (
        <div className='hud-next' data-reveal>
          <p className='hud-detail'>Nästa säsong</p>
          <p className='hud-next-name'>{next.name}</p>
          <p className='hud-next-tagline'>{nextTheme.tagline}</p>
        </div>
      ) : (
        <p className='hud-detail' data-reveal>Nästa säsong väntar bortom horisonten.</p>
      )}
      <p className='hud-hint' data-reveal>Vad som kröns kan aldrig dö.</p>
      {/* Vägen hem. Finns en nästa säsong är startsidan redan i dess tema, så knappen
          bjuder in dit; annars tillbaka till tronsalen. */}
      <Link href='/' className='crown-btn v2-home' data-reveal>
        {next && nextTheme ? `Träd in i ${nextTheme.nav.home} →` : 'Tillbaka till tronsalen →'}
      </Link>
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
