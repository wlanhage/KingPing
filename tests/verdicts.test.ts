import { describe, expect, it } from 'vitest';
import { superlatives, topRivalry, verdictFor, winless, type VerdictRow } from '../components/finale/v2/verdicts';
import type { WeaveTransfer } from '../lib/domain/weave';

const row = (o: Partial<VerdictRow> & { id: string; rank: number }): VerdictRow => ({
  name: o.id.toUpperCase(), totalWins: 0, longestStreak: 0, takeoverWins: 0, timesDethroned: 0, fridayWins: 0, longestReignMs: 0, ...o,
});
const T = (fromId: string | null, toId: string, i: number): WeaveTransfer => ({
  fromId, toId, eventType: 'NEW_KING', occurredAt: new Date(2026, 0, 1 + i).toISOString(), announcementText: `t${i}`,
});

describe('verdictFor', () => {
  it('noll vinster får rikets tröst', () => {
    expect(verdictFor(row({ id: 'oliver', rank: 7 }), 0, 7)).toBe('Riket tjänade dig inte väl. Nästa säsong är din.');
  });
  it('vinnaren är härskaren oavsett övrigt', () => {
    expect(verdictFor(row({ id: 'axel', rank: 1, totalWins: 17, takeoverWins: 9 }), 8, 7)).toMatch(/Härskaren/);
  });
  it('tvåan är tronarvingen', () => {
    expect(verdictFor(row({ id: 'lanhage', rank: 2, totalWins: 12 }), 5, 7)).toMatch(/Tronarvingen/);
  });
  it('många försvar går före erövringar', () => {
    expect(verdictFor(row({ id: 'x', rank: 3, totalWins: 5, takeoverWins: 4 }), 4, 7)).toMatch(/galler — 4 försvar/);
  });
  it('lånad krona kräver både störtanden och få vinster', () => {
    expect(verdictFor(row({ id: 'x', rank: 4, totalWins: 2, timesDethroned: 3 }), 0, 7)).toMatch(/Kronan var lånad. 3/);
    expect(verdictFor(row({ id: 'x', rank: 4, totalWins: 9, timesDethroned: 3 }), 0, 7)).not.toMatch(/lånad/);
  });
  it('en enda vinst får sin egen rad — och olika rader för olika ranker', () => {
    const a = verdictFor(row({ id: 'x', rank: 4, totalWins: 1 }), 0, 7);
    const b = verdictFor(row({ id: 'y', rank: 5, totalWins: 1 }), 0, 7);
    const c = verdictFor(row({ id: 'z', rank: 6, totalWins: 1 }), 0, 7);
    expect(new Set([a, b, c]).size).toBe(3);
    expect(verdictFor(row({ id: 'x', rank: 4, totalWins: 1 }), 0, 7)).toBe(a); // deterministisk
  });
  it('sista plats med vinster får hjärtat', () => {
    expect(verdictFor(row({ id: 'x', rank: 7, totalWins: 2 }), 0, 7)).toMatch(/först i hjärtat/);
  });
  it('winless plockar bara de utan vinst, i rankordning', () => {
    const w = winless([row({ id: 'b', rank: 7 }), row({ id: 'a', rank: 6 }), row({ id: 'c', rank: 1, totalWins: 9 })]);
    expect(w.map((x) => x.id)).toEqual(['a', 'b']);
    expect(winless([row({ id: 'c', rank: 1, totalWins: 9 })])).toEqual([]);
  });
});

describe('topRivalry', () => {
  const names = { axel: 'Axel', lanhage: 'Lanhage', calle: 'Calle' };
  it('hittar paret med flest byten, med riktning', () => {
    const r = topRivalry([T(null, 'axel', 0), T('axel', 'lanhage', 1), T('lanhage', 'axel', 2), T('axel', 'lanhage', 3), T('lanhage', 'calle', 4)], names)!;
    expect(r.total).toBe(3);
    expect([r.a, r.b].sort()).toEqual(['Axel', 'Lanhage']);
    expect(r.aToB + r.bToA).toBe(3);
  });
  it('kräver minst två byten', () => {
    expect(topRivalry([T(null, 'axel', 0), T('axel', 'lanhage', 1)], names)).toBeNull();
  });
  it('tronens första kröning räknas inte som fejd', () => {
    expect(topRivalry([T(null, 'axel', 0), T(null, 'axel', 1)], names)).toBeNull();
  });
});

describe('superlatives', () => {
  it('lyfter en per kategori och hoppar över nollor', () => {
    const rows = [row({ id: 'axel', rank: 1, totalWins: 17, takeoverWins: 6, fridayWins: 0, longestReignMs: 8_000_000 }), row({ id: 'lanhage', rank: 2, totalWins: 12, takeoverWins: 5, fridayWins: 3, longestReignMs: 12_000_000 })];
    const s = superlatives(rows, { axel: 8, lanhage: 5 }, (ms) => `${Math.round(ms / 3_600_000)}h`);
    expect(s.map((x) => x.label)).toEqual(['Kronvakten', 'Erövraren', 'Fredagarnas skräck', 'Längsta enskilda välde']);
    expect(s[0].name).toBe('AXEL');
    expect(s[2].name).toBe('LANHAGE');
    expect(s[3].value).toBe('3h');
  });
  it('tom säsong ger inga superlativ', () => {
    expect(superlatives([], {}, () => '')).toEqual([]);
  });
});
