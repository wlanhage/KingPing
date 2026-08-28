'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { FinaleSummary } from '@/lib/domain/finale';
import { formatDuration } from '@/lib/format';

export function NumbersAct({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const { peaks, wrapped, notes } = summary;

  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.numbers-panel').forEach((panel) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: panel, start: 'top top', end: '+=1200', pin: true, scrub: 0.5 } });
        tl.from(panel.querySelectorAll('.numbers-reveal'), { autoAlpha: 0, y: 30, stagger: 0.4, duration: 0.8 });
        panel.querySelectorAll<HTMLElement>('.numbers-counter').forEach((el) => {
          const target = Number(el.dataset.target ?? '0');
          const obj = { v: 0 };
          // Markup bär det riktiga värdet (så reduced motion läser rätt siffra);
          // nollställ först här, när tweenen faktiskt ska räkna upp det.
          el.textContent = '0';
          tl.to(obj, { v: target, duration: 1, snap: { v: 1 }, onUpdate: () => { el.textContent = String(Math.round(obj.v)); } }, '<');
        });
        const dragons = panel.querySelectorAll('.coro-dragon');
        if (dragons.length) tl.from(dragons, { x: '-20vw', autoAlpha: 0, stagger: 0.2, duration: 0.8 }, '<');
        tl.to({}, { duration: 0.5 });
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} className='finale-numbers' data-act='numbers'>
      {peaks.longestStreak && (
        <div className='finale-act numbers-panel numbers-mountain'>
          <div>
            {[0, 1, 2].map((i) => <span key={i} className='coro-dragon numbers-dragon' style={{ top: `${14 + i * 12}%` }} aria-hidden>🐉</span>)}
            <p className='numbers-reveal coldopen-dates'>Säsongens längsta välde</p>
            <h2 className='numbers-reveal finale-cover-title'>{peaks.longestStreak.name}</h2>
            <p className='numbers-reveal numbers-big'><span className='numbers-counter' data-target={peaks.longestStreak.streak}>{peaks.longestStreak.streak}</span> raka vinster</p>
          </div>
        </div>
      )}
      {peaks.biggestBreak && (
        <div className='finale-act numbers-panel numbers-break'>
          <div>
            <p className='numbers-reveal coldopen-dates'>Det stora störtandet</p>
            <p className='numbers-reveal numbers-quote'>&ldquo;{peaks.biggestBreak.announcementText.split('\n').pop()}&rdquo;</p>
            <p className='numbers-reveal'>En dynasti på <span className='numbers-counter numbers-big' data-target={peaks.biggestBreak.brokenStreak}>{peaks.biggestBreak.brokenStreak}</span> föll för {peaks.biggestBreak.byName}.</p>
          </div>
        </div>
      )}
      <div className='finale-act numbers-panel'>
        <div>
          <p className='numbers-reveal coldopen-dates'>Säsongen i siffror</p>
          <dl className='numbers-grid'>
            <div className='numbers-reveal'><dt>Tronskiften</dt><dd><span className='numbers-counter' data-target={wrapped.transfers}>{wrapped.transfers}</span></dd></div>
            <div className='numbers-reveal'><dt>Försvar</dt><dd><span className='numbers-counter' data-target={wrapped.defences}>{wrapped.defences}</span></dd></div>
            {wrapped.shortestReignMs !== null && <div className='numbers-reveal'><dt>Kortaste regering</dt><dd>{formatDuration(wrapped.shortestReignMs)} 💀</dd></div>}
            {wrapped.averageReignMs !== null && <div className='numbers-reveal'><dt>Snittregering</dt><dd>{formatDuration(wrapped.averageReignMs)}</dd></div>}
          </dl>
          {notes.length > 0 && (
            <p className='numbers-reveal numbers-note'>&ldquo;{notes[notes.length - 1].text}&rdquo; — {notes[notes.length - 1].byName}</p>
          )}
        </div>
      </div>
    </section>
  );
}
