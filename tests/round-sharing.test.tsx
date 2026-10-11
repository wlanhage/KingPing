import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const data = vi.hoisted(() => ({ getRound: vi.fn() }));
vi.mock('../lib/domain/round', () => data);
vi.mock('../components/stage/RoundReplay', () => ({ RoundReplay: () => null }));
import RoundPage, { generateMetadata } from '../app/rundor/[id]/page';

beforeEach(() => {
  data.getRound.mockResolvedValue({
    id: 'legacy', winner: { id: 'anna', name: 'Anna' },
    occurredAt: new Date('2026-10-01T12:00:00Z'), theme: 'realm',
    standings: [], hour: 14, merits: { padawans: [] },
  });
});

it('identifies the known winner when sharing a round with unknown placements', async () => {
  const html = renderToStaticMarkup(await RoundPage({ params: Promise.resolve({ id: 'legacy' }) }));
  expect(html).toContain('<strong>Anna</strong>');
  expect(html).toContain('vann rundan');
  expect(html).toContain('utan placering');
  expect(html).toContain('Kopiera länk');
});

it('names the winner in shared page metadata even without recorded placements', async () => {
  expect(await generateMetadata({ params: Promise.resolve({ id: 'legacy' }) })).toEqual({ title: 'Rundan i repris · Anna' });
});
