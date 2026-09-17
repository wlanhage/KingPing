import { describe, expect, it } from 'vitest';
import { classicCrownRatings, crownRatings, K_FACTOR, START_RATING } from '../lib/domain/crown-rating';

let clock = Date.parse('2026-03-02T09:00:00Z');
/** Varje kröning en timme efter den förra, så ordningen i listan är entydig. */
const next = () => new Date((clock += 60 * 60 * 1000));
const crown = (winnerId: string, previousKingId: string | null) => ({ winnerId, previousKingId, occurredAt: next() });
/** En runda där hela utslagsordningen är känd, vinnaren först. previousKingId spelar ingen roll här. */
const placement = (standings: string[]) => ({ winnerId: standings[0], previousKingId: null, standings, occurredAt: next() });

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

describe('kronrating med full placering', () => {
  it('en placering med två spelare ger exakt samma resultat som ett övertag', () => {
    const viaPlacement = crownRatings([placement(['Anna', 'Erik'])]);
    const viaCrownEvent = crownRatings(season(['Erik', 'Anna']));
    expect(viaPlacement.Anna.rating).toBeCloseTo(viaCrownEvent.Anna.rating);
    expect(viaPlacement.Erik.rating).toBeCloseTo(viaCrownEvent.Erik.rating);
  });

  it('tre jämnstarka spelare: vinnaren stiger dubbelt så mycket som mittenspelaren står still', () => {
    const table = crownRatings([placement(['Anna', 'Erik', 'Calle'])]);
    const shift = K_FACTOR / (3 - 1) / 2; // share * (1 - expected(lika, lika))
    expect(table.Anna.rating).toBeCloseTo(START_RATING + 2 * shift);
    expect(table.Erik.rating).toBeCloseTo(START_RATING); // vann en, förlorade en
    expect(table.Calle.rating).toBeCloseTo(START_RATING - 2 * shift);
    expect(table.Anna.played).toBe(1);
  });

  it('en runda med full placering är nollsummespel för alla inblandade', () => {
    const table = crownRatings([placement(['Anna', 'Erik', 'Calle', 'Lucas'])]);
    const total = table.Anna.rating + table.Erik.rating + table.Calle.rating + table.Lucas.rating;
    expect(total).toBeCloseTo(4 * START_RATING);
  });

  it('en placering med färre än två spelare räknas som ingen placering alls', () => {
    const withEmpty = crownRatings([{ ...crown('Anna', 'Erik'), standings: [] }]);
    const withoutField = crownRatings([crown('Anna', 'Erik')]);
    expect(withEmpty).toEqual(withoutField);
  });

  it('ordningen i inlistan spelar ingen roll även med placeringar inblandade', () => {
    const wins = [placement(['Anna', 'Erik', 'Calle']), crown('Calle', 'Anna'), placement(['Erik', 'Calle'])];
    const grouped = [...wins].sort((a, b) => a.winnerId.localeCompare(b.winnerId));
    expect(crownRatings(grouped)).toEqual(crownRatings(wins));
  });

  it('klassisk kronrating ignorerar placeringen — bara kronbytet räknas', () => {
    const win = { winnerId: 'Anna', previousKingId: 'Erik', standings: ['Anna', 'Erik', 'Calle'], occurredAt: next() };
    const classic = classicCrownRatings([win]);
    const withPlacement = crownRatings([win]);

    expect(classic.Calle).toBeUndefined(); // klassisk bryr sig aldrig om placeringen
    expect(classic.Erik.rating).toBeCloseTo(START_RATING - K_FACTOR / 2);

    expect(withPlacement.Calle).toBeDefined(); // nya varianten ser hela fältet
    expect(withPlacement.Erik.rating).toBeCloseTo(START_RATING); // förlorade mot Anna, vann mot Calle — jämnar ut
  });
});
