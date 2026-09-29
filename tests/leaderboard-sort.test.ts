import { describe, expect, it } from 'vitest';
import { sortRows } from '../components/leaderboard/SortableTable';

const row = (id: string, wins: number | null, name = id) => ({ id, values: { wins, name } });
const ids = (rows: { id: string }[]) => rows.map((r) => r.id).join('');

describe('sortRows', () => {
  const rows = [row('a', 2), row('b', null), row('c', 5), row('d', 2)];
  it('sorterar tal åt båda hållen', () => {
    expect(ids(sortRows(rows, 'wins', true))).toBe('cadb');
    expect(ids(sortRows(rows, 'wins', false))).toBe('adcb');
  });
  it('tomma värden hamnar sist oavsett riktning', () => {
    expect(sortRows(rows, 'wins', true).at(-1)?.id).toBe('b');
    expect(sortRows(rows, 'wins', false).at(-1)?.id).toBe('b');
  });
  it('namn sorteras på svenska: Ö efter Z', () => {
    expect(ids(sortRows([row('1', 0, 'Örjan'), row('2', 0, 'Zlatan'), row('3', 0, 'Axel')], 'name', false))).toBe('321');
  });
  it('rör inte originalet', () => {
    sortRows(rows, 'wins', true);
    expect(ids(rows)).toBe('abcd');
  });
});
