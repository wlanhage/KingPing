import { describe, expect, it } from 'vitest';
import { countByWeekday, weekdayIndex } from '../lib/domain/weekday';

describe('weekdayIndex', () => {
  it('räknar i svensk tid: sen fredagkväll UTC är fortfarande fredag i Stockholm', () => {
    expect(weekdayIndex(new Date('2026-09-04T21:30:00Z'))).toBe(4); // fredag
  });
  it('strax före midnatt UTC på söndag är måndag i Stockholm', () => {
    expect(weekdayIndex(new Date('2026-09-06T22:30:00Z'))).toBe(0);
  });
});

describe('countByWeekday', () => {
  it('summerar per dag, måndag först', () => {
    const c = countByWeekday([new Date('2026-08-31T10:00:00Z'), new Date('2026-09-04T10:00:00Z'), new Date('2026-09-04T14:00:00Z')]);
    expect(c).toEqual([1, 0, 0, 0, 2, 0, 0]);
  });
});
