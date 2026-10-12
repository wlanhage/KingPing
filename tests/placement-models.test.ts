import { describe, expect, it } from 'vitest';
import { fitPlackettLuce, forecastCheck, headToHead, lineupOdds, placementRatings, strengthToRating, survivalCurves, type PlacedRound } from '../lib/domain/placement-models';

let clock = Date.parse('2026-09-15T09:00:00Z');
const round = (...standings: string[]): PlacedRound => ({ id: `r${clock}`, occurredAt: new Date((clock += 3_600_000)), standings });

describe('inbördes ur placeringar', () => {
  it('varje par räknas en gång per runda, åt rätt håll', () => {
    const table = headToHead([round('a', 'b', 'c'), round('b', 'a')]);
    expect(table.a.b).toEqual({ ahead: 1, met: 2 });
    expect(table.b.a).toEqual({ ahead: 1, met: 2 });
    expect(table.a.c).toEqual({ ahead: 1, met: 1 });
    expect(table.c.a).toEqual({ ahead: 0, met: 1 });
  });

  it('rundor utan hel placering hoppas över', () => {
    expect(headToHead([{ id: 'x', occurredAt: new Date(), standings: ['a'] }])).toEqual({});
  });
});

describe('Plackett–Luce', () => {
  it('utan skillnad i resultat står alla på 1000', () => {
    const w = fitPlackettLuce([round('a', 'b'), round('b', 'a')]);
    expect(strengthToRating(w.a)).toBeCloseTo(1000, 3);
    expect(strengthToRating(w.b)).toBeCloseTo(1000, 3);
  });

  it('den som alltid vinner hamnar högst, men inte i oändligheten', () => {
    const w = fitPlackettLuce([round('a', 'b', 'c'), round('a', 'c', 'b'), round('a', 'b', 'c')]);
    expect(w.a).toBeGreaterThan(w.b);
    expect(w.b).toBeGreaterThan(w.c);
    expect(Number.isFinite(w.a)).toBe(true);
  });

  it('intervallet omsluter skattningen och följer samma ordning', () => {
    const ratings = placementRatings([round('a', 'b', 'c'), round('a', 'c', 'b'), round('b', 'a', 'c'), round('a', 'b', 'c')], { samples: 40 });
    expect(ratings.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    for (const r of ratings) {
      expect(r.low).toBeLessThanOrEqual(r.rating + 1e-6);
      expect(r.high).toBeGreaterThanOrEqual(r.rating - 1e-6);
    }
    expect(ratings[0].rounds).toBe(4);
  });

  it('samma seed ger samma intervall', () => {
    const rounds = [round('a', 'b'), round('a', 'b'), round('b', 'a')];
    expect(placementRatings(rounds, { samples: 20 })).toEqual(placementRatings(rounds, { samples: 20 }));
  });
});

describe('vinstchans för en uppställning', () => {
  it('summerar till ett, och vinst är w delat med summan', () => {
    const odds = lineupOdds({ a: 3, b: 1, c: 1 }, ['a', 'b', 'c']);
    expect(odds.a.win).toBeCloseTo(0.6);
    expect(odds.a.win + odds.b.win + odds.c.win).toBeCloseTo(1);
    expect(odds.a.last + odds.b.last + odds.c.last).toBeCloseTo(1);
    const places = odds.a.expectedPlace + odds.b.expectedPlace + odds.c.expectedPlace;
    expect(places).toBeCloseTo(1 + 2 + 3);
  });

  it('jämna styrkor ger jämn chans och mittenplacering', () => {
    const odds = lineupOdds({}, ['a', 'b', 'c', 'd']);
    expect(odds.a.win).toBeCloseTo(0.25);
    expect(odds.a.last).toBeCloseTo(0.25);
    expect(odds.a.expectedPlace).toBeCloseTo(2.5);
  });

  it('två spelare: chansen är som Elos förväntade poäng', () => {
    const odds = lineupOdds({ a: 10, b: 1 }, ['a', 'b']);
    expect(odds.a.win).toBeCloseTo(10 / 11);
    expect(odds.b.last).toBeCloseTo(10 / 11);
  });
});

describe('kontroll framåt', () => {
  it('förutsäger varje runda bara med rundorna före den', () => {
    const rounds = Array.from({ length: 12 }, () => round('a', 'b', 'c'));
    const check = forecastCheck(rounds, { warmup: 4 })!;
    expect(check.rounds).toBe(8);
    expect(check.favouriteHits).toBe(8);
    expect(check.logLoss).toBeLessThan(check.baselineLogLoss);
    expect(check.meanWinnerOdds).toBeGreaterThan(check.meanBaselineOdds);
  });

  it('för lite data ger ingen kontroll', () => {
    expect(forecastCheck([round('a', 'b')], { warmup: 5 })).toBeNull();
  });
});

describe('överlevnadskurva', () => {
  it('räknar utslagningar och låter små rundors vinnare falla ur underlaget', () => {
    // a: vinner en tremanna, tvåa i en fyrmanna. b: sist i båda.
    const [a] = survivalCurves([round('a', 'c', 'b'), round('d', 'a', 'c', 'b')]).filter((c) => c.id === 'a');
    expect(a.survival[0]).toBe(1);
    expect(a.survival[1]).toBe(1);
    expect(a.survival[2]).toBe(1);
    // Knockout 3 finns bara i fyrmannarundan, och där åkte a ut.
    expect(a.atRisk[3]).toBe(1);
    expect(a.survival[3]).toBe(0);
  });

  it('den som alltid åker ut först har noll efter första utslagningen', () => {
    const b = survivalCurves([round('a', 'c', 'b'), round('d', 'a', 'c', 'b')]).find((c) => c.id === 'b')!;
    expect(b.survival).toEqual([1, 0]);
  });
});
