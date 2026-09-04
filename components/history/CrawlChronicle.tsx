'use client';
import { useEffect, useRef } from 'react';

export type CrawlItem = { id: string; date: string; winner: string; text: string };

/** Hur många pixlar texten flyttas i planet per skrollad pixel. Lite över 1 kompenserar för att planet lutar. */
const SPEED = 1.15;

/**
 * Star Wars-textrullen, men styrd av skrollhjulet: sidan får en lång skrollsträcka, scenen
 * sitter fast i viewporten och texten flyttas uppåt genom perspektivet i takt med skrollen.
 * Transformen sätts direkt på elementet så att React inte renderar om vid varje skrollsteg.
 */
export function CrawlChronicle({ eyebrow, title, subtitle, items }: { eyebrow?: string; title: string; subtitle: string; items: CrawlItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const crawlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const crawl = crawlRef.current;
    if (!track || !crawl) return;
    let raf = 0;
    const size = () => { track.style.height = `calc(100vh + ${Math.ceil(crawl.scrollHeight / SPEED)}px)`; };
    const move = () => { raf = 0; crawl.style.transform = `translateY(${-window.scrollY * SPEED}px)`; };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(move); };
    size();
    move();
    // Typsnitten kan landa efter mount och ändra texthöjden — mät om då.
    document.fonts?.ready.then(size);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', size);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', size);
      cancelAnimationFrame(raf);
    };
  }, [items.length]);

  return (
    <div ref={trackRef} className='crawl-track'>
      <div className='crawl-stage'>
        <header className='crawl-head'>
          {eyebrow && <p className='crawl-eyebrow'>{eyebrow}</p>}
          <h1 className='crawl-title'>{title}</h1>
          <p className='crawl-sub'>{subtitle}</p>
        </header>
        <div className='crawl-viewport'>
          <div className='crawl-plane'>
            <div ref={crawlRef} className='crawl'>
              {items.map((it) => (
                <p key={it.id} className='crawl-item'>
                  <span className='crawl-item-meta'>{it.date} · {it.winner}</span>
                  {it.text}
                </p>
              ))}
              {!items.length && <p className='crawl-item'>Inga händelser ännu. Galaxen väntar.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
