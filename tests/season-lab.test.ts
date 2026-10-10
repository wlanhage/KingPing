import { describe, expect, it } from 'vitest';
import { forecastSeason, labSnapshot, evaluateRanks, backtestSeasons, labCsv, evaluateScenarios, comparableBacktests, type LabData } from '@/lib/domain/season-lab';
const day = 86400000;
const at = (n: number) => n * day;
const data = (): LabData => ({
  seasons: [{ id: 's', slug: 's', name: 'Season', start: at(10), end: at(20) }],
  players: ['a', 'b', 'c'].map((id) => ({ id, name: id.toUpperCase(), created: 0, afk: [] })),
  wins: [{ id: '1', winnerId: 'a', at: at(11), standings: ['a', 'b'] }, { id: '2', winnerId: 'b', at: at(17), standings: ['b', 'a'] }],
  reigns: [{ playerId: 'a', start: at(8), end: at(17) }, { playerId: 'b', start: at(17), end: null }],
});
describe('season prediction lab', () => {
  it('clamps throne time to the season and forecast cutoff', () => {
    const snap = labSnapshot(data(), 's', at(15));
    expect(snap.rows.find((r) => r.id === 'a')?.throneMs).toBe(at(5));
    expect(snap.rounds).toBe(1);
    expect(labSnapshot(data(), 's', at(25)).rows.find((r) => r.id === 'b')?.throneMs).toBe(at(3));
  });
  it('does not change a prediction when future results or players change', () => {
    const d = data();
    const first = forecastSeason(d, 's', at(15), at(20), 'form');
    d.wins.push({ id: 'future', winnerId: 'c', at: at(19), standings: ['c', 'a', 'b'] });
    d.reigns[0].end = at(19);
    d.players.push({ id: 'future', name: 'Future', created: at(18), afk: [] });
    expect(forecastSeason(d, 's', at(15), at(20), 'form')).toEqual(first);
  });
  it('only trains on earlier completed seasons and explicitly gates sparse ML', () => {
    const d = data();
    expect(forecastSeason(d, 's', at(15), at(20), 'ridge').available).toBe(false);
    d.seasons.push({ id: 'old1', slug: 'old1', name: 'Old 1', start: at(0), end: at(4) }, { id: 'old2', slug: 'old2', name: 'Old 2', start: at(4), end: at(8) });
    d.wins.push({ id: 'old', winnerId: 'a', at: at(1), standings: [] }, { id: 'old2', winnerId: 'b', at: at(5), standings: [] });
    d.reigns.push({ playerId: 'a', start: at(1), end: at(4) }, { playerId: 'b', start: at(5), end: at(8) });
    const trained = forecastSeason(d, 's', at(15), at(20), 'ridge');
    expect(trained.available).toBe(true);
    expect(trained.trainingSeasons).toBe(2);
    d.seasons.push({ id: 'later', slug: 'later', name: 'Later', start: at(21), end: at(30) });
    expect(forecastSeason(d, 's', at(15), at(20), 'ridge')).toEqual(trained);
  });
  it('simulates reproducible, bounded rank ranges and title probabilities', () => {
    const result = forecastSeason(data(), 's', at(15), at(20), 'form');
    expect(result).toEqual(forecastSeason(data(), 's', at(15), at(20), 'form'));
    expect(result.rows.reduce((sum, r) => sum + r.titleChance, 0)).toBeCloseTo(1);
    for (const row of result.rows) {
      expect(row.lowRank).toBeGreaterThanOrEqual(1);
      expect(row.highRank).toBeLessThanOrEqual(3);
      expect(row.projectedMs).toBeGreaterThanOrEqual(row.throneMs);
    }
  });
  it('uses historical AFK status and excludes players who did not exist yet', () => {
    const d = data(); d.players[1].afk = [{ start: at(14), end: at(18) }]; d.players[2].created = at(16);
    expect(labSnapshot(d, 's', at(15)).rows.map((r) => r.id)).toEqual(['a']);
    expect(labSnapshot(d, 's', at(19)).rows.map((r) => r.id)).toContain('b');
  });
  it('reports honest empty states without invented predictions', () => {
    const d = data(); d.wins = []; d.reigns = [];
    expect(forecastSeason(d, 's', at(15), at(20), 'form').rows).toEqual([]);
    expect(evaluateRanks([], [])).toBeNull();
  });
  it('scores rank error, exact rank, winner and pair order against outcomes', () => {
    expect(evaluateRanks([{ id: 'a', rank: 1 }, { id: 'b', rank: 2 }, { id: 'c', rank: 3 }], [{ id: 'b', rank: 1 }, { id: 'a', rank: 2 }, { id: 'c', rank: 3 }])).toMatchObject({ count: 3, mae: 2 / 3, exact: 1 / 3, winner: 0, pairAccuracy: 2 / 3 });
  });
  it('counts an unforeseen final winner as a miss rather than dropping the season', () => {
    expect(evaluateRanks([{ id: 'a', rank: 1 }], [{ id: 'new', rank: 1 }, { id: 'a', rank: 2 }])?.winner).toBe(0);
  });
  it('exports outcomes and safely escapes spreadsheet names', () => {
    const rows = forecastSeason(data(), 's', at(15), at(20), 'form').rows;
    rows[0].name = '=HYPERLINK("unsafe")';
    const csv = labCsv(rows, [{ id: rows[0].id, rank: 2 }], 'form');
    expect(csv).toContain("'" + '=HYPERLINK(""unsafe"")');
    expect(csv).toContain('"form","1","2","1"');
  });
  it('respects the exclusive season end and locks projections when no future time remains', () => {
    const d = data(); d.wins.push({ id: 'boundary', winnerId: 'c', at: at(20), standings: [] });
    expect(labSnapshot(d, 's', at(20)).rounds).toBe(2);
    const result = forecastSeason(d, 's', at(20), at(25), 'form');
    expect(result.horizon).toBe(at(20));
    for (const row of result.rows) {
      expect(row.projectedMs).toBe(row.throneMs);
      expect(row.lowRank).toBe(row.rank);
      expect(row.highRank).toBe(row.rank);
    }
  });
  it('backtests closed seasons only and leaves active outcomes unscored', () => {
    const d = data(); d.seasons.push({ id: 'live', slug: 'live', name: 'Live', start: at(20), end: null });
    const reports = backtestSeasons(d, .5, at(25));
    expect(reports.map((r) => r.seasonId)).toEqual(['s']);
    expect(reports[0].models.find((m) => m.model === 'current')?.metrics?.mae).toBe(0);
  });
});

function longHistory(): LabData {
  const d = data();
  d.seasons = []; d.wins = []; d.reigns = [];
  for (let season = 0; season < 5; season++) {
    const start = at(season * 20);
    d.seasons.push({ id: `s${season}`, slug: `s${season}`, name: `Season ${season}`, start, end: start + at(10) });
    for (let round = 1; round < 10; round++) {
      const winnerId = ['a', 'b', 'c'][(round + season) % 3];
      d.wins.push({ id: `${season}-${round}`, at: start + at(round), winnerId, standings: [winnerId, ...['a', 'b', 'c'].filter((id) => id !== winnerId)] });
      d.reigns.push({ playerId: winnerId, start: start + at(round), end: start + at(round + 1) });
    }
  }
  return d;
}
describe('improved season learning and uncertainty evaluation', () => {
  it('uses recorded participation only, never inventing losses in unknown rounds', () => {
    const d = data();
    const first = labSnapshot(d, 's', at(15)).rows.find((r) => r.id === 'b')!;
    expect(first.appearances).toBe(1);
    d.wins.push({ id: 'unknown', winnerId: 'a', at: at(12), standings: [] });
    const second = labSnapshot(d, 's', at(15)).rows.find((r) => r.id === 'b')!;
    expect(second.appearances).toBe(1);
    expect(second.observedWinRate).toBe(first.observedWinRate);
    expect(labSnapshot(d, 's', at(15)).rows.find((r) => r.id === 'c')?.appearances).toBe(0);
  });
  it('reports temporal tuning from strictly earlier completed seasons', () => {
    const d = longHistory();
    const tuned = forecastSeason(d, 's4', at(85), at(90), 'ridge');
    expect(tuned.tuning.validationSeasons).toBe(2);
    expect([.1, 1, 10, 100]).toContain(tuned.tuning.penalty);
    expect(tuned.tuning.validationMse).toBeGreaterThanOrEqual(0);
    expect(forecastSeason(d, 's2', at(45), at(50), 'ridge').tuning).toMatchObject({ penalty: 1, validationSeasons: 0, validationMse: null });
    expect(tuned.rows.every((r) => Number.isFinite(r.projectedMs))).toBe(true);
  });
  it('does not allow selected-season or later outcomes to change fitted regression or tuning', () => {
    const d = longHistory();
    const before = forecastSeason(d, 's3', at(65), at(70), 'ridge');
    d.wins.push({ id: 'future', winnerId: 'c', at: at(68), standings: ['c', 'b', 'a'] });
    d.reigns.push({ playerId: 'c', start: at(68), end: at(69) });
    d.reigns.push({ playerId: 'a', start: at(80), end: at(1000) });
    expect(forecastSeason(d, 's3', at(65), at(70), 'ridge')).toEqual(before);
  });
  it('adds explicit horizon context to regression, without altering observed history', () => {
    const d = longHistory();
    const short = forecastSeason(d, 's4', at(85), at(86), 'ridge');
    const long = forecastSeason(d, 's4', at(85), at(90), 'ridge');
    expect(short.context.remainingDays).toBe(1);
    expect(long.context.remainingDays).toBe(5);
    expect(short.rows.map((r) => [r.id, r.throneMs]).sort()).toEqual(long.rows.map((r) => [r.id, r.throneMs]).sort());
    expect(short.rows.map((r) => [r.id, r.futureShare]).sort()).not.toEqual(long.rows.map((r) => [r.id, r.futureShare]).sort());
  });
  it('measures interval coverage and title probability error against actual outcomes', () => {
    const rows = [{ id: 'a', lowRank: 1, highRank: 2, titleChance: .75 }, { id: 'b', lowRank: 2, highRank: 2, titleChance: .25 }];
    const outcome = [{ id: 'b', rank: 1 }, { id: 'a', rank: 2 }];
    expect(evaluateScenarios(rows, outcome)).toMatchObject({ rankCount: 2, covered: 1, coverage: .5, titleBrier: 1.125 });
    expect(evaluateScenarios(rows, [{ id: 'new', rank: 1 }, { id: 'a', rank: 2 }, { id: 'b', rank: 3 }])?.titleBrier).toBe(1.625);
    expect(evaluateScenarios([], outcome)).toBeNull();
  });
  it('scores title probabilities when the whole forecast roster departs', () => {
    const d = longHistory();
    d.players.forEach((p) => { p.afk = [{ start: at(89), end: null }]; });
    d.players.push({ id: 'new', name: 'New', created: at(87), afk: [] });
    d.wins.push({ id: 'new-win', winnerId: 'new', at: at(88), standings: [] });
    d.reigns.push({ playerId: 'new', start: at(88), end: at(90) });
    const reports = backtestSeasons(d, .5, at(100));
    const turnover = reports.find((b) => b.seasonId === 's4')!;
    expect(turnover.models.every((m) => m.metrics === null && m.scenarios!.titleBrier! >= 1)).toBe(true);
    const comparison = comparableBacktests(reports);
    expect(comparison.scenarios.map((b) => b.seasonId)).toContain('s4');
    expect(comparison.ranks.map((b) => b.seasonId)).not.toContain('s4');
  });
  it('includes uncertainty diagnostics in every available backtest' , () => {
    const report = backtestSeasons(longHistory(), .5, at(100));
    expect(report.at(-1)?.models.find((m) => m.model === 'ridge')?.scenarios?.titleBrier).toBeGreaterThanOrEqual(0);
  });
});
