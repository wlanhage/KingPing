import { describe, expect, it } from 'vitest';
import { crownDuels, duelRatings, scoreError } from '../lib/domain/duel';
import { K_FACTOR, START_RATING } from '../lib/domain/crown-rating';
import { sameWinRequest } from '../lib/domain/win-request';
import { parseWinDraft } from '../lib/domain/win-draft';

describe('poäng', () => {
  it('ingen poäng är ok, en halv är det inte', () => {
    expect(scoreError(null, null)).toBeNull();
    expect(scoreError(undefined, undefined)).toBeNull();
    expect(scoreError(11, null)).toMatch(/båda/);
  });

  it('vinnaren måste ha flest, och poängen ska vara rimliga heltal', () => {
    expect(scoreError(11, 7)).toBeNull();
    expect(scoreError(7, 11)).toMatch(/fler poäng/);
    expect(scoreError(5, 5)).toMatch(/fler poäng/);
    expect(scoreError(-1, 0)).toMatch(/hela tal/);
    expect(scoreError(100, 3)).toMatch(/hela tal/);
    expect(scoreError(2.5, 1)).toMatch(/hela tal/);
  });
});

describe('duell-rating', () => {
  const at = (h: number) => new Date(Date.UTC(2026, 9, 12, h));

  it('första duellen mellan två nya: halva K-faktorn åt varje håll', () => {
    const [a, b] = duelRatings([{ id: '1', winnerId: 'a', loserId: 'b', occurredAt: at(9), crown: false }]);
    expect(a).toEqual({ id: 'a', rating: START_RATING + K_FACTOR / 2, wins: 1, losses: 0 });
    expect(b).toEqual({ id: 'b', rating: START_RATING - K_FACTOR / 2, wins: 0, losses: 1 });
  });

  it('räknas i tidsordning, oavsett ordningen de kommer i', () => {
    const matches = [
      { id: '2', winnerId: 'b', loserId: 'a', occurredAt: at(10), crown: false },
      { id: '1', winnerId: 'a', loserId: 'b', occurredAt: at(9), crown: false },
    ];
    expect(duelRatings(matches)).toEqual(duelRatings([...matches].reverse()));
    // Efter 1–1 ligger b, som vann den sista som underdog, före.
    expect(duelRatings(matches)[0].id).toBe('b');
  });

  it('en KronMatch är en runda med exakt två i placeringen', () => {
    const duels = crownDuels([
      { id: 'r1', occurredAt: at(9), standings: ['a', 'b'] },
      { id: 'r2', occurredAt: at(10), standings: ['a', 'b', 'c'] },
      { id: 'r3', occurredAt: at(11), standings: [] },
    ]);
    expect(duels).toEqual([{ id: 'r1', winnerId: 'a', loserId: 'b', occurredAt: at(9), crown: true }]);
  });
});

describe('finalpoäng i en sparad runda', () => {
  const saved = { winnerId: 'a', standings: ['a', 'b'], note: null, finalWinnerPoints: 11, finalRunnerUpPoints: 7 };

  it('samma försök igen är samma runda, en annan poäng är det inte', () => {
    expect(sameWinRequest(saved, 'a', ['a', 'b'], undefined, [11, 7])).toBe(true);
    expect(sameWinRequest(saved, 'a', ['a', 'b'], undefined, [11, 8])).toBe(false);
    expect(sameWinRequest(saved, 'a', ['a', 'b'])).toBe(false);
  });

  it('ett sparat utkast från före poängen läses fortfarande in', () => {
    const old = JSON.stringify({ requestId: '6f1c1b1e-8a1f-4d5c-9b3a-1c2d3e4f5a6b', winnerId: 'a', standings: ['a', 'b'], note: '' });
    expect(parseWinDraft(old)?.winnerId).toBe('a');
  });
});
