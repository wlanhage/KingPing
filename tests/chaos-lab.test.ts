import { describe, expect, it } from 'vitest';
import { crownMemory, simulateMultiverse, weekendRebellion, type MultiverseOptions } from '@/lib/domain/chaos-lab';
import type { LabData } from '@/lib/domain/season-lab';
const DAY = 86400000;
const start = Date.parse('2026-10-05T00:00:00Z');
const data = (): LabData => ({
  seasons: [{ id: 's', slug: 's', name: 'Season', start, end: start + 14 * DAY }],
  players: ['a', 'b', 'c'].map((id) => ({ id, name: id, created: start - DAY, afk: [] })),
  wins: [1, 2, 3, 4].map((d, i) => ({ id: String(i), winnerId: ['a', 'b', 'b', 'a'][i], at: start + d * DAY, standings: [] })),
  reigns: [{ playerId: 'a', start: start + DAY, end: start + 2 * DAY }, { playerId: 'b', start: start + 2 * DAY, end: start + 4 * DAY }, { playerId: 'a', start: start + 4 * DAY, end: null }],
});
const options: MultiverseOptions = { seed: 7, chaos: .25, boostId: null, boost: 1, exileId: null };
describe('chaos lab', () => {
  it('counts observed crown transitions including defenses, without inventing participants', () => {
    const memory = crownMemory(data(), 's', start + 5 * DAY);
    expect(memory.transitions).toBe(3);
    expect(memory.cells.find((c) => c.from === 'b' && c.to === 'b')?.count).toBe(1);
    expect(memory.cells.filter((c) => c.from === 'c' || c.to === 'c').every((c) => c.count === 0)).toBe(true);
  });
  it('conserves future throne time and preserves already accrued history', () => {
    const result = simulateMultiverse(data(), 's', start + 5 * DAY, start + 10 * DAY, options);
    expect(result.rows.reduce((s, r) => s + r.projectedMs - r.throneMs, 0)).toBeCloseTo(5 * DAY, 3);
    expect(result.rows.reduce((s, r) => s + r.titleChance, 0)).toBeCloseTo(1);
    for (const row of result.rows) {
      expect(row.projectedMs).toBeGreaterThanOrEqual(row.throneMs);
      expect(row.histogram.reduce((s, n) => s + n, 0)).toBe(result.runs);
    }
  });
  it('produces seeded reproducible scenarios that change with a new seed', () => {
    const first = simulateMultiverse(data(), 's', start + 5 * DAY, start + 10 * DAY, options);
    expect(simulateMultiverse(data(), 's', start + 5 * DAY, start + 10 * DAY, options)).toEqual(first);
    expect(simulateMultiverse(data(), 's', start + 5 * DAY, start + 10 * DAY, { ...options, seed: 8 }).rows).not.toEqual(first.rows);
  });
  it('ignores future results, reign endings, and players not yet created', () => {
    const d = data(); const first = simulateMultiverse(d, 's', start + 5 * DAY, start + 10 * DAY, options);
    d.wins.push({ id: 'future', winnerId: 'c', at: start + 8 * DAY, standings: ['c', 'a'] });
    d.reigns[2].end = start + 9 * DAY;
    d.players.push({ id: 'future', name: 'Future', created: start + 6 * DAY, afk: [] });
    expect(simulateMultiverse(d, 's', start + 5 * DAY, start + 10 * DAY, options)).toEqual(first);
  });
  it('exiles a reigning player only from future time, retaining their accrued time', () => {
    const result = simulateMultiverse(data(), 's', start + 5 * DAY, start + 10 * DAY, { ...options, exileId: 'a' });
    const a = result.rows.find((r) => r.id === 'a')!;
    expect(a.projectedMs).toBe(a.throneMs);
    expect(result.rows.reduce((s, r) => s + r.projectedMs - r.throneMs, 0)).toBeCloseTo(5 * DAY, 3);
  });
  it('returns an explicit unavailable state if the future field is empty', () => {
    const d = data(); d.players = d.players.slice(0, 1);
    expect(simulateMultiverse(d, 's', start + 5 * DAY, start + 10 * DAY, { ...options, exileId: 'a' }).rows).toEqual([]);
  });
  it('weights Stockholm weekends accurately, including daylight-saving transitions', () => {
    const from = Date.parse('2026-10-23T22:00:00Z'); // Saturday 00:00 Stockholm
    const to = Date.parse('2026-10-25T23:00:00Z'); // Monday 00:00 Stockholm: 49-hour weekend
    const d = data(); d.seasons[0].start = from; d.seasons[0].end = to;
    d.reigns = [{ playerId: 'a', start: from, end: to }]; d.wins = [];
    const removed = weekendRebellion(d, 's', to, 0);
    expect(removed.rows.find((r) => r.id === 'a')?.weekendMs).toBe(49 * 3600000);
    expect(removed.rows.find((r) => r.id === 'a')?.weightedMs).toBe(0);
    expect(weekendRebellion(d, 's', to, 1).rows.find((r) => r.id === 'a')?.weightedMs).toBe(49 * 3600000);
  });
  it('a comeback boost changes future time but leaves observed time intact', () => {
    const baseline = simulateMultiverse(data(), 's', start + 5 * DAY, start + 10 * DAY, { ...options, chaos: 1 });
    const boosted = simulateMultiverse(data(), 's', start + 5 * DAY, start + 10 * DAY, { ...options, chaos: 1, boostId: 'c', boost: 4 });
    expect(boosted.rows.find((r) => r.id === 'c')!.projectedMs).toBeGreaterThan(baseline.rows.find((r) => r.id === 'c')!.projectedMs);
    expect(boosted.rows.map((r) => [r.id, r.throneMs]).sort()).toEqual(baseline.rows.map((r) => [r.id, r.throneMs]).sort());
  });
  it('reports pacing assumptions and event caps while conserving the horizon', () => {
    const d = data(); d.wins = d.wins.slice(0, 1);
    expect(simulateMultiverse(d, 's', start + 5 * DAY, start + 10 * DAY, options).timingObserved).toBe(false);
    d.wins = [0, 1].map((i) => ({ id: String(i), winnerId: 'a', at: start + DAY + i * 60000, standings: [] }));
    const capped = simulateMultiverse(d, 's', start + 5 * DAY, start + 10 * DAY, options);
    expect(capped.cappedRuns).toBe(256);
    expect(capped.rows.reduce((s, r) => s + r.projectedMs - r.throneMs, 0)).toBeCloseTo(5 * DAY, 3);
  });
  it('leaves the input data untouched and records complete branching paths', () => {
    const d = data(); const before = structuredClone(d);
    const result = simulateMultiverse(d, 's', start + 5 * DAY, start + 10 * DAY, options);
    weekendRebellion(d, 's', start + 5 * DAY, 0);
    expect(d).toEqual(before);
    expect(result.rows.every((r) => r.paths.length === 12 && r.paths.every((p) => p.length === 13))).toBe(true);
  });
  it('has honest empty states and freezes a completed projection at the end', () => {
    const d = data(); d.wins = []; d.reigns = [];
    expect(simulateMultiverse(d, 's', start + 5 * DAY, start + 10 * DAY, options).rows).toEqual([]);
    const ended = simulateMultiverse(data(), 's', start + 14 * DAY, start + 30 * DAY, options);
    expect(ended.remainingMs).toBe(0);
    expect(ended.rows.every((r) => r.projectedMs === r.throneMs)).toBe(true);
  });
});
