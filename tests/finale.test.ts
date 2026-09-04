import { describe, expect, it } from 'vitest';
import { extractTransfers } from '../lib/domain/finale';

const E = (winnerId: string, previousKingId: string | null, i: number, note: string | null = null) => ({
  winnerId, previousKingId, occurredAt: new Date(2026, 0, 1 + i), eventType: 'NEW_KING',
  streakCount: 1, previousStreakCount: 0, announcementText: `a${i}`, note, isFridayFinal: false,
});

describe('extractTransfers', () => {
  it('första kröningen blir ett byte från tomma tronen', () => {
    const { transfers } = extractTransfers([E('calle', null, 0)]);
    expect(transfers).toHaveLength(1);
    expect(transfers[0].fromId).toBeNull();
    expect(transfers[0].toId).toBe('calle');
  });

  it('samma kung igen blir försvar, inte byte', () => {
    const { transfers, defences, timeline } = extractTransfers([E('calle', null, 0), E('calle', 'calle', 1), E('axel', 'calle', 2)]);
    expect(transfers).toHaveLength(2);
    expect(defences).toEqual({ calle: 1 });
    expect(timeline.map((t) => t.kind)).toEqual(['transfer', 'defence', 'transfer']);
  });

  it('händelser sorteras i tidsordning oavsett indata', () => {
    const { transfers } = extractTransfers([E('axel', 'calle', 5), E('calle', null, 0)]);
    expect(transfers[0].toId).toBe('calle');
  });
});
