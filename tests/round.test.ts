import { describe, expect, it } from 'vitest';
import { resolveFinal, roundError, startingGroup } from '../lib/domain/round';

describe('startingGroup', () => {
  const active = ['Anna', 'Calle', 'Erik', 'Sara'];
  it('börjar med förra rundans grupp', () => {
    expect(startingGroup(active, ['Erik', 'Anna', 'Calle'])).toEqual(['Erik', 'Anna', 'Calle']);
  });
  it('den som blivit AFK sedan dess faller bort', () => {
    expect(startingGroup(active, ['Erik', 'Olle', 'Anna'])).toEqual(['Erik', 'Anna']);
  });
  it('utan användbar förra runda: alla aktiva', () => {
    expect(startingGroup(active, [])).toEqual(active);
    expect(startingGroup(active, ['Erik', 'Olle'])).toEqual(active);
  });
});

describe('resolveFinal', () => {
  const table = ['Anna', 'Calle', 'Erik'];
  it('tar valen som de är när båda står vid bordet', () => {
    expect(resolveFinal(table, 'Calle', 'Anna')).toEqual({ winnerId: 'Calle', runnerUpId: 'Anna' });
  });
  it('finalförloraren fylls i av sig själv när bara två stod vid bordet', () => {
    expect(resolveFinal(['Anna', 'Calle'], 'Calle', null)).toEqual({ winnerId: 'Calle', runnerUpId: 'Anna' });
    expect(resolveFinal(['Anna', 'Calle'], null, null)).toEqual({ winnerId: null, runnerUpId: null });
  });
  it('val av någon som inte längre står vid bordet släpps', () => {
    expect(resolveFinal(['Anna', 'Erik'], 'Calle', 'Olle')).toEqual({ winnerId: null, runnerUpId: null });
  });
  it('blir finalförloraren vald som vinnare försvinner hen som förlorare', () => {
    expect(resolveFinal(table, 'Anna', 'Anna')).toEqual({ winnerId: 'Anna', runnerUpId: null });
  });
});

describe('roundError', () => {
  it('godtar en fullständig runda, och en utan uppgifter (äldre klienter)', () => {
    expect(roundError('a', ['a', 'b', 'c'], 'b')).toBeNull();
    expect(roundError('a', [], null)).toBeNull();
  });
  it('underkänner orimliga rundor', () => {
    expect(roundError('a', ['a', 'b'], 'a')).toMatch(/Vinnaren kan inte/);
    expect(roundError('a', [], 'a')).toMatch(/Vinnaren kan inte/);
    expect(roundError('a', ['a'], null)).toMatch(/Minst två/);
    expect(roundError('a', ['a', 'b', 'a'], null)).toMatch(/flera gånger/);
    expect(roundError('a', ['b', 'c'], 'b')).toMatch(/Vinnaren måste/);
    expect(roundError('a', ['a', 'b'], 'c')).toMatch(/förlorade finalen måste/);
  });
});
