import { describe, expect, it } from 'vitest';
import { knockoutPlace, standingsError, standingsFromKnockouts, startingAbsent } from '../lib/domain/standings';

describe('standingsFromKnockouts', () => {
  const all = ['Anna', 'Calle', 'Erik', 'Sara'];

  it('den som står kvar vinner, och den som åkte ut först hamnar sist', () => {
    expect(standingsFromKnockouts(all, ['Erik', 'Anna', 'Sara'])).toEqual(['Calle', 'Sara', 'Anna', 'Erik']);
  });

  it('inte klar förrän exakt en står kvar', () => {
    expect(standingsFromKnockouts(all, [])).toBeNull();
    expect(standingsFromKnockouts(all, ['Erik', 'Anna'])).toBeNull();
  });

  it('kryssade spelare räknas inte, inte ens om de hunnit tryckas ut', () => {
    expect(standingsFromKnockouts(['Anna', 'Calle'], ['Erik', 'Anna'])).toEqual(['Calle', 'Anna']);
  });

  it('en ensam spelare är ingen runda', () => {
    expect(standingsFromKnockouts(['Anna'], [])).toBeNull();
  });

  it('muterar inte utslagningslistan', () => {
    const out = ['Erik', 'Anna', 'Sara'];
    standingsFromKnockouts(all, out);
    expect(out).toEqual(['Erik', 'Anna', 'Sara']);
  });

  it('platsen räknas från botten: först ut av fyra är fyra', () => {
    expect(knockoutPlace(4, 0)).toBe(4);
    expect(knockoutPlace(4, 2)).toBe(2);
  });
});

describe('startingAbsent', () => {
  const active = ['Anna', 'Calle', 'Erik', 'Sara'];
  it('den som inte var med i förra rundan börjar kryssad', () => {
    expect(startingAbsent(active, ['Calle', 'Anna', 'Erik'])).toEqual(['Sara']);
  });
  it('spelare som blivit AFK sedan dess räknas inte in i förra gruppen', () => {
    expect(startingAbsent(active, ['Calle', 'Olle', 'Anna'])).toEqual(['Erik', 'Sara']);
  });
  it('utan användbar förra runda börjar alla som med', () => {
    expect(startingAbsent(active, [])).toEqual([]);
    expect(startingAbsent(active, ['Calle', 'Olle'])).toEqual([]);
  });
});

describe('standingsError', () => {
  it('godtar en placering med vinnaren först', () => {
    expect(standingsError('a', ['a', 'b', 'c'])).toBeNull();
  });
  it('underkänner för kort, dubbletter och fel vinnare', () => {
    expect(standingsError('a', ['a'])).toMatch(/minst två/);
    expect(standingsError('a', ['a', 'b', 'a'])).toMatch(/flera gånger/);
    expect(standingsError('a', ['b', 'a'])).toMatch(/först/);
  });
});
