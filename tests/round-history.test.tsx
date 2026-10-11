import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoundHistory } from '../components/history/RoundHistory';
const players = [{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Björn' }];
it('renders actual placements, notes, result links and preserved pagination', () => {
  const html = renderToStaticMarkup(<RoundHistory players={players} filters={{ q: '', player: '', page: 1 }} seasonSlug='s1' total={21} pageSize={20} events={[{ id: 'r1', occurredAt: '2026-10-01', winnerId: 'a', standings: ['a', 'b'], note: 'Jämnt!', announcementText: 'Anna tar kronan.' }]} />);
  expect(html).toContain('Anna'); expect(html).toContain('Björn');
  expect(html).toContain('Jämnt!'); expect(html).toContain('/rundor/r1');
  expect(html).toContain('page=2'); expect(html).toContain('season=s1');
  expect(html).toContain('Placering');
});
it('marks incomplete historical rounds without inventing a second place', () => {
  const html = renderToStaticMarkup(<RoundHistory players={players} filters={{ q: '', player: '', page: 1 }} total={1} pageSize={20} events={[{ id: 'r1', occurredAt: '2026-10-01', winnerId: 'a', standings: [], note: null, announcementText: 'Vinst' }]} />);
  expect(html).toContain('Placeringen spelades inte in');
});
it('shows an actionable no-results state', () => {
  const html = renderToStaticMarkup(<RoundHistory players={players} filters={{ q: 'missing', player: '', page: 1 }} total={0} pageSize={20} events={[]} />);
  expect(html).toContain('Inga rundor matchar');
  expect(html).toContain('Rensa filter');
});
