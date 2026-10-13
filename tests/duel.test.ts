import { describe, expect, it } from 'vitest';
import { duelOdds, duelTable, formatResult, playerDuelSummary, resultError, scoreError, setsError, type DuelMatch } from '../lib/domain/duel';
import { K_FACTOR, START_RATING } from '../lib/domain/crown-rating';
import { sameWinRequest } from '../lib/domain/win-request';
import { parseWinDraft } from '../lib/domain/win-draft';

const at = (h: number) => new Date(Date.UTC(2026, 9, 13, h));
let n = 0;
const match = (winnerId: string, loserId: string, extra: Partial<DuelMatch> = {}): DuelMatch => ({ id: `m${++n}`, winnerId, loserId, occurredAt: at(n), crown: false, ...extra });

describe('resultat', () => {
  it('poäng: ingen är ok, en halv är det inte, vinnaren måste leda', () => {
    expect(scoreError(null, null)).toBeNull();
    expect(scoreError(11, null)).toMatch(/båda/);
    expect(scoreError(11, 7)).toBeNull();
    expect(scoreError(7, 11)).toMatch(/fler poäng/);
    expect(scoreError(100, 3)).toMatch(/hela tal/);
  });

  it('set: vinnaren har minst två och fler än förloraren', () => {
    expect(setsError(3, 1)).toBeNull();
    expect(setsError(2, 0)).toBeNull();
    expect(setsError(1, 0)).toMatch(/minst två/);
    expect(setsError(2, 2)).toMatch(/fler set/);
    expect(setsError(10, 1)).toMatch(/hela tal/);
  });

  it('ett set ger poäng, flera ger set — aldrig båda', () => {
    expect(resultError({ winnerPoints: 11, loserPoints: 7, winnerSets: 2, loserSets: 1 })).toMatch(/inte båda/);
    expect(resultError({ winnerSets: 3, loserSets: 2 })).toBeNull();
    expect(formatResult({ winnerSets: 3, loserSets: 2 })).toBe('3–2 i set');
    expect(formatResult({ winnerPoints: 11, loserPoints: 9 })).toBe('11–9');
    expect(formatResult({})).toBe('');
  });
});

describe('duell-tabellen', () => {
  it('första matchen mellan två nya: halva K-faktorn åt varje håll', () => {
    const { players, shifts } = duelTable([match('a', 'b')]);
    expect(players.map((p) => [p.id, p.rating])).toEqual([['a', START_RATING + K_FACTOR / 2], ['b', START_RATING - K_FACTOR / 2]]);
    expect(Object.values(shifts)).toEqual([K_FACTOR / 2]);
  });

  it('räknas i tidsordning oavsett ordningen matcherna kommer i', () => {
    const matches = [match('a', 'b'), match('b', 'a'), match('a', 'b')];
    expect(duelTable(matches)).toEqual(duelTable([...matches].reverse()));
  });

  it('svit, längsta vinstsvit och form', () => {
    const { players } = duelTable([match('a', 'b'), match('a', 'b'), match('a', 'b'), match('b', 'a')]);
    const a = players.find((p) => p.id === 'a')!;
    const b = players.find((p) => p.id === 'b')!;
    expect([a.wins, a.losses, a.streak, a.longestWinStreak]).toEqual([3, 1, -1, 3]);
    expect([b.streak, b.longestWinStreak]).toEqual([1, 1]);
    expect(a.form + b.form).toBeCloseTo(0);
  });

  it('jättedråp: vinst mot någon med minst 100 högre Elo före matchen', () => {
    // Tio raka vinster lyfter a över 1100; sedan slår c, ny på 1000, a.
    const matches = [...Array.from({ length: 10 }, () => match('a', 'b')), match('c', 'a')];
    const { players } = duelTable(matches);
    expect(players.find((p) => p.id === 'c')!.giantKills).toBe(1);
    expect(players.find((p) => p.id === 'a')!.giantKills).toBe(0);
  });

  it('inbördes med snittpoäng bara från matcher med poäng', () => {
    const { pairs } = duelTable([match('a', 'b', { winnerPoints: 11, loserPoints: 5 }), match('b', 'a', { winnerSets: 3, loserSets: 1 })]);
    expect(pairs.a.b).toEqual({ wins: 1, losses: 1, pointsFor: 11, pointsAgainst: 5, pointGames: 1 });
    expect(pairs.b.a).toEqual({ wins: 1, losses: 1, pointsFor: 5, pointsAgainst: 11, pointGames: 1 });
  });
});

describe('före matchen', () => {
  it('jämna spelare: halva chansen och halva K-faktorn', () => {
    expect(duelOdds(1000, 1000)).toEqual({ a: 0.5, b: 0.5, aWins: K_FACTOR / 2, bWins: K_FACTOR / 2 });
  });

  it('underdogen vinner mer', () => {
    const odds = duelOdds(1200, 1000);
    expect(odds.a).toBeGreaterThan(0.7);
    expect(odds.bWins).toBeGreaterThan(odds.aWins);
    expect(odds.a + odds.b).toBeCloseTo(1);
  });
});

describe('profilens sammanfattning', () => {
  it('favorit, nemesis och senaste matcherna med Elo-förändring', () => {
    const matches = [match('a', 'b'), match('a', 'b'), match('c', 'a', { crown: true, winnerPoints: 11, loserPoints: 9 })];
    const summary = playerDuelSummary(duelTable(matches), matches, 'a');
    expect(summary.favourite).toEqual({ id: 'b', wins: 2, losses: 0 });
    expect(summary.nemesis).toEqual({ id: 'c', wins: 0, losses: 1 });
    expect(summary.recent[0]).toMatchObject({ opponentId: 'c', won: false, result: '11–9', crown: true });
    expect(summary.recent[0].shift).toBeLessThan(0);
    expect(summary.rank).not.toBeNull();
  });

  it('den som inte spelat har ingen sammanfattning', () => {
    expect(playerDuelSummary(duelTable([]), [], 'x')).toMatchObject({ player: null, rank: null, recent: [] });
  });
});

describe('finalpoäng i en sparad runda', () => {
  const saved = { winnerId: 'a', standings: ['a', 'b'], note: null, finalWinnerPoints: 11, finalRunnerUpPoints: 7 };
  it('samma försök igen är samma runda, en annan poäng är det inte', () => {
    expect(sameWinRequest(saved, 'a', ['a', 'b'], undefined, [11, 7])).toBe(true);
    expect(sameWinRequest(saved, 'a', ['a', 'b'], undefined, [11, 8])).toBe(false);
  });
  it('ett sparat utkast från före poängen läses fortfarande in', () => {
    const old = JSON.stringify({ requestId: '6f1c1b1e-8a1f-4d5c-9b3a-1c2d3e4f5a6b', winnerId: 'a', standings: ['a', 'b'], note: '' });
    expect(parseWinDraft(old)?.winnerId).toBe('a');
  });
});
