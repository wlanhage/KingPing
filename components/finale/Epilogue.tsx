'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { FinaleSummary } from '@/lib/domain/finale';
import { getTheme, themeCssVars } from '@/lib/theme';
import { JESTER_ROASTS } from '@/components/Coronation';

export function Epilogue({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const next = summary.nextSeason;
  const revealNext = next && next.theme !== summary.season.theme;

  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      if (revealNext) {
        // Crossfadea wrapperns tema-vars (inte <html>): wrappern bär säsongens tema
        // och dess vars vinner över layoutens — se SeasonFinale.
        const vars = themeCssVars(getTheme(next!.theme).colors);
        // closest() i stället för selektorsträngen '.finale': gsap.context scopar
        // strängar till ättlingar av ref, och wrappern är epilogens FÖRFADER — som
        // sträng ger den noll targets och crossfaden hade tyst uteblivit.
        const wrapper = ref.current!.closest('.finale');
        if (wrapper) gsap.to(wrapper, { ...vars, duration: 1.6, scrollTrigger: { trigger: '.epilogue-reveal', start: 'top 70%' } });
      }
      gsap.from('.epilogue-credit', { autoAlpha: 0, y: 26, stagger: 0.25, scrollTrigger: { trigger: '.epilogue-credits', start: 'top 75%', end: 'bottom bottom', scrub: 0.5 } });
    }, ref);
    return () => ctx.revert();
  }, [reduced, revealNext, next]);

  const theme = getTheme(summary.season.theme);
  const epithet = (rank: number) =>
    rank === 1 ? theme.epithets.rank1 : rank === 2 ? theme.epithets.rank2 : rank === 3 ? theme.epithets.rank3 : theme.roles.challenger;

  return (
    <section ref={ref} className='finale-act finale-epilogue' data-act='epilogue'>
      <div>
        {revealNext && (
          <div className='epilogue-reveal'>
            <p className='coldopen-dates'>Nästa kapitel</p>
            <h2 className='finale-cover-title'>{next!.name}</h2>
            <p className='subtitle'>Profetian säger att en ny mästare ska resa sig.</p>
          </div>
        )}
        <div className='epilogue-credits'>
          {summary.standings.map((row, i) => (
            <div key={row.id} className='epilogue-credit'>
              <p className='epilogue-name'>{row.name}</p>
              <p className='epilogue-role'>{epithet(row.rank)} · {row.totalWins} vinster</p>
              {i % 3 === 2 && <p className='epilogue-roast'>&ldquo;{JESTER_ROASTS[i % JESTER_ROASTS.length].replaceAll('{name}', row.name)}&rdquo;</p>}
            </div>
          ))}
          <div className='epilogue-credit'>
            <p className='epilogue-role'>Ingen pingisboll kom till skada under denna säsong.</p>
            <p className='epilogue-role'>Vad som kröns kan aldrig dö. 👑</p>
          </div>
        </div>
      </div>
    </section>
  );
}
