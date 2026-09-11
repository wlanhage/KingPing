import { describe, expect, it } from 'vitest';
import { describeWin } from '../lib/audit';

describe('loggbokens beskrivning av en kröning', () => {
  it('tom tron nämner ingen föregående regent', () => {
    expect(describeWin({ winner: 'Erik', previousKing: null, streakCount: 1 })).toBe('Erik tog den tomma tronen.');
  });

  it('övertagande namnger den som blev av med kronan', () => {
    expect(describeWin({ winner: 'Anna', previousKing: 'Erik', streakCount: 1 })).toBe('Anna tog tronen från Erik.');
  });

  it('samma kung igen är ett försvar, inte ett övertagande', () => {
    // Utan den här grenen hade loggen påstått att Erik tog tronen från sig själv.
    expect(describeWin({ winner: 'Erik', previousKing: 'Erik', streakCount: 3 })).toBe('Erik försvarade tronen (3 raka).');
  });
});
