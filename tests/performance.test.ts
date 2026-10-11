import { describe, expect, it } from 'vitest';
import { playerPerformance, type PerformanceRound } from '../lib/domain/performance';
const roster = [{ id: 'a', name: 'Anna' }, { id: 'b', name: 'Björn' }, { id: 'c', name: 'Cleo' }];
const round = (id: string, standings: string[], winnerId = standings[0] ?? 'a', at = `2026-10-${id.padStart(2, '0')}T12:00:00Z`): PerformanceRound => ({ id, winnerId, standings, occurredAt: at });
describe('placement-based performance', () => {
  it('uses only known participation as the win-rate denominator, excluding legacy rounds', () => {
    const result = playerPerformance('a', roster, [round('1', ['a', 'b']), round('2', ['b', 'a']), round('3', []), round('4', ['b', 'c'])]);
    expect(result).toMatchObject({ played: 2, wins: 1, losses: 1, winRate: 50, averagePlace: 1.5, legacyWins: 1, currentStreak: 0, bestStreak: 1 });
  });
  it('does not invent a win rate or opponent for legacy-only history', () => {
    expect(playerPerformance('a', roster, [round('1', [])])).toMatchObject({ played: 0, winRate: null, averagePlace: null, legacyWins: 1, recent: [], rivals: [] });
  });
  it('counts winning streaks across absent rounds and returns latest ten participations', () => {
    const rounds = [round('1', ['b', 'a']), ...Array.from({ length: 12 }, (_, i) => round(String(i + 2), i === 5 ? ['c', 'b'] : ['a', 'b']))];
    const result = playerPerformance('a', roster, rounds.reverse());
    expect(result.currentStreak).toBe(11);
    expect(result.bestStreak).toBe(11);
    expect(result.recent).toHaveLength(10);
    expect(result.recent[0].roundId).toBe('13');
  });
  it('uses pairwise placement finishes for rivals, even when neither wins', () => {
    const result = playerPerformance('b', roster, [round('1', ['a', 'b', 'c']), round('2', ['c', 'b', 'a']), round('3', ['a', 'c', 'b'])]);
    expect(result.rivals).toEqual([
      { id: 'a', name: 'Anna', played: 3, ahead: 1, behind: 2, winRate: expect.closeTo(100 / 3) },
      { id: 'c', name: 'Cleo', played: 3, ahead: 1, behind: 2, winRate: expect.closeTo(100 / 3) },
    ]);
  });
  it('rejects malformed evidence instead of manufacturing stats', () => {
    const invalid = [round('1', ['a', 'a']), round('2', ['b', 'a'], 'a'), round('3', ['a']), round('4', ['a', 'ghost']), round('5', ['a', 'b'], 'a', 'invalid')];
    expect(playerPerformance('a', roster, invalid)).toMatchObject({ played: 0, legacyWins: 0, rivals: [] });
  });
  it('breaks timestamp ties by round ID and leaves inputs unchanged', () => {
    const at = '2026-10-11T12:00:00Z';
    const rounds = [round('b', ['a', 'b'], 'a', at), round('a', ['b', 'a'], 'b', at)];
    expect(playerPerformance('a', roster, rounds)).toMatchObject({ currentStreak: 1, bestStreak: 1 });
    expect(rounds[0].id).toBe('b');
  });
  it('tracks a best streak after a loss resets current form', () => {
    expect(playerPerformance('a', roster, [round('1', ['a', 'b']), round('2', ['a', 'c']), round('3', ['b', 'a'])])).toMatchObject({ bestStreak: 2, currentStreak: 0 });
  });
});
