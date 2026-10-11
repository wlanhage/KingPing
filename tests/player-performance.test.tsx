import { expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlayerPerformance } from '../components/player/PlayerPerformance';
import { playerPerformance } from '../lib/domain/performance';
const players = [{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Björn' }];
it('shows the sample size, result links and season-preserving rival links', () => {
  const stats = playerPerformance('a', players, [{ id: 'r1', winnerId: 'a', standings: ['a', 'b'], occurredAt: '2026-10-01' }]);
  const html = renderToStaticMarkup(<PlayerPerformance stats={stats} playerName='Anna' seasonSlug='s1' />);
  expect(html).toContain('100%');
  expect(html).toContain('1 registrerade rundor');
  expect(html).toContain('/rundor/r1');
  expect(html).toContain('/players/b?season=s1');
  expect(html).toContain('Före');
});
it('does not show a false zero percent for players with no known losses', () => {
  const stats = playerPerformance('a', players, [{ id: 'r1', winnerId: 'a', standings: [], occurredAt: '2026-10-01' }]);
  const html = renderToStaticMarkup(<PlayerPerformance stats={stats} playerName='Anna' />);
  expect(html).not.toContain('0%');
  expect(html).toContain('utan placering');
});
