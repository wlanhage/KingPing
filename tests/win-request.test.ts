import { expect, it } from 'vitest';
import { sameWinRequest } from '../lib/domain/win-request';
it('compares exact ordered placements and normalized empty notes', () => {
  const saved = { winnerId: 'a', standings: ['a', 'b'], note: null };
  expect(sameWinRequest(saved, 'a', ['a', 'b'], '')).toBe(true);
  expect(sameWinRequest(saved, 'b', ['a', 'b'], '')).toBe(false);
  expect(sameWinRequest(saved, 'a', ['b', 'a'], '')).toBe(false);
  expect(sameWinRequest(saved, 'a', ['a', 'b'], 'changed')).toBe(false);
  expect(sameWinRequest({ ...saved, note: 'Nice' }, 'a', ['a', 'b'], ' Nice ')).toBe(true);
});
