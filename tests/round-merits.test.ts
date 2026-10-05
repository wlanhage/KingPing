import { describe, expect, it } from 'vitest';
import { pickMerits } from '../lib/domain/round';

const at = new Date('2026-09-30T12:00:00Z');
const d = (iso: string) => new Date(iso);

describe('pickMerits', () => {
  it('flest vinster blir mästare, längst regeringstid (utom mästaren) blir skeppet, de utan vinst padawaner', () => {
    const m = pickMerits(['a', 'b', 'c', 'd'], at, [{ id: 'a', wins: 9 }, { id: 'b', wins: 3 }], [
      { playerId: 'a', startedAt: d('2026-01-01'), endedAt: d('2026-06-01') },
      { playerId: 'b', startedAt: d('2026-08-01'), endedAt: d('2026-09-01') },
      { playerId: 'b', startedAt: d('2026-09-20'), endedAt: null },
    ]);
    expect(m).toEqual({ master: 'a', falcon: 'b', padawans: ['c', 'd'] });
  });
  it('en regeringstid räknas bara fram till rundan, och ingen merit utan vinster eller regeringar', () => {
    const m = pickMerits(['a', 'b'], at, [], [
      { playerId: 'a', startedAt: d('2026-09-29T12:00:00Z'), endedAt: d('2026-12-31') },
      { playerId: 'b', startedAt: d('2026-09-01'), endedAt: d('2026-09-02T12:00:00Z') },
    ]);
    expect(m.master).toBeUndefined();
    expect(m.falcon).toBe('b');
    expect(m.padawans).toEqual(['a', 'b']);
  });
  it('lika är lika: den först i placeringen', () => {
    expect(pickMerits(['b', 'a'], at, [{ id: 'a', wins: 2 }, { id: 'b', wins: 2 }], []).master).toBe('b');
  });
});
