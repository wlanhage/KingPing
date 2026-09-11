import { describe, expect, it } from 'vitest';
import { crownRatings, K_FACTOR, START_RATING } from '../lib/domain/crown-rating';

let clock = Date.parse('2026-03-02T09:00:00Z');
/** Varje kröning en timme efter den förra, så ordningen i listan är entydig. */
const next = () => new Date((clock += 60 * 60 * 1000));
const crown = (winnerId: string, previousKingId: string | null) => ({ winnerId, previousKingId, occurredAt: next() });

/** Bygger en sekvens av namn till kröningar; previousKingId följer av föregående vinnare. */
function season(names: string[]) {
  let king: string | null = null;
  return names.map((name) => {
    const win = crown(name, king);
    king = name;
    return win;
  });
}

describe('kronrating', () => {
  it('säsongens första kröning flyttar ingen rating — tronen stod tom', () => {
    const table = crownRatings(season(['Erik']));
    expect(table.Erik).toEqual({ rating: START_RATING, played: 0 });
  });

  it('ett övertag är nollsummespel mellan de två inblandade', () => {
    const table = crownRatings(season(['Erik', 'Anna']));
    expect(table.Anna.rating).toBeCloseTo(START_RATING + K_FACTOR / 2);
    expect(table.Erik.rating).toBeCloseTo(START_RATING - K_FACTOR / 2);
    expect(table.Anna.rating + table.Erik.rating).toBeCloseTo(2 * START_RATING);
  });

  it('att störta en tyrann ger mer än att ta kronan från en färsk kung', () => {
    // Erik tar kronan av Lucas, försvarar den tre gånger och blir högt ratad; Anna störtar honom.
    const tyrant = crownRatings([...season(['Lucas', 'Erik', 'Erik', 'Erik', 'Erik']), crown('Anna', 'Erik')]);
    // Calle tar kronan direkt av en nykrönt Oliver som inte hunnit försvara något.
    const fresh = crownRatings(season(['Lucas', 'Oliver', 'Calle']));

    const tyrantSlaying = tyrant.Anna.rating - START_RATING;
    const easyPickings = fresh.Calle.rating - START_RATING;
    expect(tyrantSlaying).toBeGreaterThan(easyPickings);
  });

  it('varje försvar ger mindre än det förra — en svit skenar inte', () => {
    const table = crownRatings(season(['Erik', 'Anna', 'Anna', 'Anna', 'Anna']));
    const climb: number[] = [];
    for (let n = 2; n <= 5; n += 1) {
      const sofar = crownRatings(season(['Erik', ...Array(n - 1).fill('Anna')]));
      climb.push(sofar.Anna.rating);
    }
    const steps = climb.slice(1).map((r, i) => r - climb[i]);
    expect(steps.every((step) => step > 0)).toBe(true);
    expect(steps).toEqual([...steps].sort((a, b) => b - a));
    expect(table.Anna.played).toBe(4); // ett övertag + tre försvar
  });

  it('den som vinner rundor rankas över den som råkade sitta på kronan över helgen', () => {
    // Anna tar kronan en fredag och sitter kvar till måndag utan att spela — en enda vinst.
    // Calle tar kronan på måndagen och försvarar den två gånger under veckan.
    const table = crownRatings(season(['Erik', 'Anna', 'Calle', 'Calle', 'Calle']));
    expect(table.Calle.rating).toBeGreaterThan(table.Anna.rating);
  });

  it('ordningen i inlistan spelar ingen roll — tiden avgör', () => {
    const wins = season(['Erik', 'Anna', 'Anna', 'Calle', 'Erik']);
    // getLeaderboard samlar vinsterna per spelare, alltså grupperade och inte kronologiska.
    const grouped = [...wins].sort((a, b) => a.winnerId.localeCompare(b.winnerId));
    expect(crownRatings(grouped)).toEqual(crownRatings(wins));
  });

  it('spelare som aldrig varit inblandade i ett kronbyte saknas i tabellen', () => {
    const table = crownRatings(season(['Erik', 'Anna']));
    expect(table.Sara).toBeUndefined();
  });
});
