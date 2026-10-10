import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeasonLab } from '@/components/lab/SeasonLab';
import type { LabData } from '@/lib/domain/season-lab';

const data: LabData = {
  seasons: [{ id: 's', slug: 'spring', name: 'Spring', start: 0, end: null }],
  players: [{ id: 'a', name: 'Axel', created: 0, afk: [] }],
  wins: [{ id: 'w', winnerId: 'a', at: 1000, standings: ['a'] }],
  reigns: [{ playerId: 'a', start: 1000, end: null }],
};

describe('separate lab pages', () => {
  it('opens the grounded lab on forecasts with a link to the experimental lab', () => {
    const html = renderToStaticMarkup(<SeasonLab data={data} initialSeason='s' now={2000} />);
    expect(html).toContain('Season');
    expect(html).toContain('En möjlig framtida tabell');
    expect(html).toContain('href="/lab/experimental?season=spring"');
    expect(html).not.toContain('En krona. 256 möjliga framtider.');
  });

  it('opens experiments separately with a link back to the grounded lab', () => {
    const html = renderToStaticMarkup(<SeasonLab data={data} initialSeason='s' now={2000} experimental />);
    expect(html).toContain('En krona. 256 möjliga framtider.');
    expect(html).toContain('href="/lab?season=spring"');
    expect(html).not.toContain('01 / Prognos &amp; facit');
    expect(html).not.toContain('Ridge-straff väljs');
  });
});
