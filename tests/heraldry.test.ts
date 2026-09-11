import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOP_VESSEL, VESSEL_STEPS, assignCharacters, sigilOf, vesselTier, winsToNextVessel } from '../lib/domain/heraldry';
import { HELM, sigilSvg, vesselSvg } from '../lib/og/sigil';
import swapi from '../lib/theme/themes/swapi-starships.json';
import people from '../lib/theme/themes/swapi-people.json';
import { realm } from '../lib/theme/themes/realm';
import { starWars } from '../lib/theme/themes/star-wars';

const NAMES = ['Axel', 'Bandeiras', 'Cissi', 'David', 'Elin', 'Fredrik', 'Gustav', 'Hanna'];

describe('vapen', () => {
  it('samma namn ger samma vapen — annars byter folk ansikte vid varje omrendering', () => {
    expect(sigilOf('Axel')).toEqual(sigilOf('Axel'));
  });

  it('namnet normaliseras, så mellanslag och versaler inte ger ett nytt vapen', () => {
    expect(sigilOf('  AXEL ')).toEqual(sigilOf('axel'));
  });

  it('vapnet rör sig inte av spelet — bara kronan gör det', () => {
    const plain = sigilSvg('Axel', { colors: realm.colors });
    const king = sigilSvg('Axel', { colors: realm.colors, isKing: true });
    expect(king).not.toEqual(plain);
    // Hjälmen är densamma i båda; det är krönet som skiljer.
    expect(king).toContain(HELM);
    expect(plain).toContain(HELM);
  });

  it('åtta namn ger minst fem olika vapen — annars är spridningen värdelös', () => {
    const distinct = new Set(NAMES.map((n) => JSON.stringify(sigilOf(n))));
    expect(distinct.size).toBeGreaterThanOrEqual(5);
  });

  it('plymen lutar inom det ritbara spannet, så fjädern aldrig sticker ut ur ringen', () => {
    for (const name of NAMES) expect(Math.abs(sigilOf(name).tilt)).toBeLessThanOrEqual(22);
  });
});

describe('farkost', () => {
  it('trappan följer VESSEL_STEPS', () => {
    expect(VESSEL_STEPS.map((w) => vesselTier(w))).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('steget under en gräns ger fortfarande föregående nivå', () => {
    expect(vesselTier(2)).toBe(1);
    expect(vesselTier(6)).toBe(2);
    expect(vesselTier(14)).toBe(3);
    expect(vesselTier(29)).toBe(4);
  });

  it('noll och orimliga vinster kraschar inte och hamnar innanför flottan', () => {
    expect(vesselTier(0)).toBe(0);
    expect(vesselTier(-5)).toBe(0);
    expect(vesselTier(9999)).toBe(TOP_VESSEL);
  });

  it('räknar ner till nästa farkost och tar slut på toppen', () => {
    expect(winsToNextVessel(0)).toBe(1);
    expect(winsToNextVessel(5)).toBe(2);
    expect(winsToNextVessel(30)).toBeNull();
  });
});

describe('teman', () => {
  it('varje tema namnger exakt sex farkoster — en per nivå', () => {
    for (const theme of [realm, starWars]) {
      expect(theme.heraldry.vessels).toHaveLength(TOP_VESSEL + 1);
      expect(theme.heraldry.vessels.every((v) => v.name.trim().length > 0)).toBe(true);
    }
  });

  it('varje nivå och skrov ritar något, i temats färger', () => {
    for (const theme of [realm, starWars]) {
      for (let tier = 0; tier <= TOP_VESSEL; tier++) {
        const svg = vesselSvg(tier, { colors: theme.colors, hull: theme.heraldry.hull });
        expect(svg.startsWith('<svg')).toBe(true);
        expect(svg.endsWith('</svg>')).toBe(true);
        expect(svg).toContain(theme.colors.gold);
      }
    }
  });

  it('vapnet ritas i det aktiva temats färger, inte i rikets', () => {
    expect(sigilSvg('Axel', { colors: starWars.colors })).toContain(starWars.colors.gold);
  });
});

describe('SWAPI-flottan', () => {
  it('den incheckade flottan har ett skepp per steg', () => {
    expect(swapi.ships).toHaveLength(TOP_VESSEL + 1);
  });

  it('skeppen växer strikt i längd — annars är stegen ingen stege', () => {
    const lengths = swapi.ships.map((s) => s.lengthM);
    expect(lengths).toEqual([...lengths].sort((a, b) => a - b));
    expect(new Set(lengths).size).toBe(lengths.length);
  });

  it('galaxen visar SWAPI:s namn, riket sina egna', () => {
    expect(starWars.heraldry.vessels.map((v) => v.name)).toEqual(swapi.ships.map((s) => s.name));
    expect(realm.heraldry.vessels.every((v) => v.note === undefined)).toBe(true);
  });
});

const squad = (names: string[]) =>
  names.map((name, i) => ({ id: `p${i}`, name, createdAt: new Date(2026, 0, 1 + i) }));

describe('figurtilldelning', () => {
  it('tio spelare får tio olika figurer ur en lista på 24', () => {
    const got = assignCharacters(squad(NAMES.concat('Ida', 'Johan')), 24);
    expect(new Set(Object.values(got)).size).toBe(10);
  });

  it('en ny spelare rubbar ingen annans figur — därför sorteras det äldst först', () => {
    const before = assignCharacters(squad(NAMES), 24);
    // Aaron hamnar först i bokstavsordning men sist i tid: sorterar vi på namn byter halva kontoret figur.
    const after = assignCharacters([...squad(NAMES), { id: 'ny', name: 'Aaron', createdAt: new Date(2030, 0, 1) }], 24);
    for (const id of Object.keys(before)) expect(after[id]).toBe(before[id]);
    expect(after.ny).toBeDefined();
  });

  it('samma trupp ger samma tilldelning varje gång', () => {
    expect(assignCharacters(squad(NAMES), 24)).toEqual(assignCharacters(squad(NAMES), 24));
  });

  it('fler spelare än figurer delar i stället för att krascha', () => {
    const got = assignCharacters(squad(NAMES), 3);
    expect(Object.keys(got)).toHaveLength(NAMES.length);
    expect(Object.values(got).every((i) => i >= 0 && i < 3)).toBe(true);
  });

  it('ett tema utan rollista ger ingen tilldelning alls', () => {
    expect(assignCharacters(squad(NAMES), 0)).toEqual({});
  });
});

describe('SWAPI-rollistan', () => {
  it('galaxen har porträtt, riket ritar sin sköld', () => {
    expect(starWars.heraldry.characters).toHaveLength(people.people.length);
    expect(realm.heraldry.characters).toBeUndefined();
  });

  it('varje porträtt pekar på en fil som faktiskt ligger i public/', () => {
    for (const c of starWars.heraldry.characters ?? []) {
      expect(c.image).toMatch(/^\/characters\/[a-z0-9-]+\.jpg$/);
      expect(existsSync(`public${c.image}`)).toBe(true);
    }
  });
});
