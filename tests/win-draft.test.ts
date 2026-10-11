import { expect, it } from 'vitest';
import { parseWinDraft } from '../lib/domain/win-draft';
const draft = { requestId: 'b67cfa3a-7c85-4c91-b9b7-64b58ba08b7c', winnerId: 'a', standings: ['a', 'b'], note: 'Finalen' };
it('restores exactly the submitted round for a retry after refresh', () => {
  expect(parseWinDraft(JSON.stringify(draft))).toEqual(draft);
});
it.each([null, '', '{', '{}', JSON.stringify({ ...draft, requestId: 'bad' }), JSON.stringify({ ...draft, standings: ['a', 'a'] }), JSON.stringify({ ...draft, standings: ['b', 'a'] }), JSON.stringify({ ...draft, note: 'a'.repeat(501) })])('ignores corrupt recovery data (%s)', (raw) => {
  expect(parseWinDraft(raw)).toBeNull();
});
