import { labSnapshot, type LabData } from './season-lab';
import { weekdayIndex } from './local-time';

const DAY = 86_400_000;
const HOUR = 3_600_000;
const RUNS = 256;
const EVENT_LIMIT = 512;
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const normalize = (xs: number[]) => { const total = sum(xs); return xs.map((x) => total ? x / total : 1 / xs.length); };

/** Consecutive recorded winners, not imagined matches or unrecorded opponents. */
export function crownMemory(data: LabData, seasonId: string, cutoff: number) {
  const season = data.seasons.find((s) => s.id === seasonId);
  if (!season) throw new Error('Unknown season');
  const snapshot = labSnapshot(data, seasonId, cutoff);
  const wins = data.wins.filter((w) => w.at >= season.start && w.at < snapshot.at)
    .sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  const players = snapshot.rows.map(({ id, name, winShare }) => ({ id, name, winShare }));
  const ids = new Set(players.map((p) => p.id));
  const counts = new Map<string, Map<string, number>>();
  const gaps: number[] = [];
  for (let i = 1; i < wins.length; i++) {
    const gap = wins[i].at - wins[i - 1].at;
    if (gap > 0) gaps.push(gap);
    const from = wins[i - 1].winnerId, to = wins[i].winnerId;
    if (!ids.has(from) || !ids.has(to)) continue;
    if (!counts.has(from)) counts.set(from, new Map());
    counts.get(from)!.set(to, (counts.get(from)!.get(to) ?? 0) + 1);
  }
  const prior = normalize(players.map((p) => p.winShare));
  const cells = players.flatMap((p) => {
    const outbound = sum([...(counts.get(p.id)?.values() ?? [])]);
    return players.map((q, i) => ({ from: p.id, to: q.id, count: counts.get(p.id)?.get(q.id) ?? 0,
      probability: ((counts.get(p.id)?.get(q.id) ?? 0) + 3 * prior[i]) / (outbound + 3) }));
  });
  return { players, cells, gaps, transitions: sum(cells.map((c) => c.count)), rounds: wins.length };
}
function randomSource(seed: string) {
  let value = 2166136261;
  for (const c of seed) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return () => { value += 0x6D2B79F5; let x = value; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
function choose(weights: number[], random: () => number) {
  let threshold = random() * sum(weights);
  for (let i = 0; i < weights.length; i++) { threshold -= weights[i]; if (threshold <= 0) return i; }
  return weights.length - 1;
}
export type MultiverseOptions = { seed: number; chaos: number; boostId: string | null; boost: number; exileId: string | null };
export type UniverseRow = { id: string; name: string; throneMs: number; projectedMs: number; rank: number; currentRank: number; titleChance: number; podiumChance: number; histogram: number[]; paths: number[][] };

/** Bootstrap observed event gaps and sample a smoothed crown Markov chain. */
export function simulateMultiverse(data: LabData, seasonId: string, cutoff: number, horizon: number, options: MultiverseOptions) {
  const season = data.seasons.find((s) => s.id === seasonId);
  if (!season) throw new Error('Unknown season');
  const snapshot = labSnapshot(data, seasonId, cutoff);
  const remainingMs = Math.max(0, Math.min(horizon, season.end ?? horizon) - snapshot.at);
  const memory = crownMemory(data, seasonId, cutoff);
  const field = snapshot.rows.filter((r) => r.id !== options.exileId);
  const empty = { rows: [] as UniverseRow[], runs: RUNS, remainingMs, timingObserved: memory.gaps.length > 0, cappedRuns: 0, transitions: memory.transitions };
  if (!field.length || (!snapshot.rounds && !snapshot.rows.some((r) => r.throneMs > 0))) return empty;
  const rows: UniverseRow[] = snapshot.rows.map((r) => ({ id: r.id, name: r.name, throneMs: r.throneMs, projectedMs: 0, rank: 0, currentRank: r.currentRank, titleChance: 0, podiumChance: 0,
    histogram: Array(snapshot.rows.length).fill(0), paths: [] }));
  const index = new Map(rows.map((r, i) => [r.id, i]));
  const chaos = clamp(options.chaos, 0, 1), boost = clamp(options.boost, .25, 4);
  const fieldPrior = normalize(field.map((r) => r.winShare));
  const weightsFor = (from: string | null) => field.map((r, i) => {
    const probability = memory.cells.find((c) => c.from === from && c.to === r.id)?.probability ?? fieldPrior[i];
    return ((1 - chaos) * probability + chaos / field.length) * (r.id === options.boostId ? boost : 1);
  });
  // Removing future players must renormalize each transition row before mixing chaos.
  const transitions = new Map(field.map((p) => {
    const probabilities = normalize(field.map((r) => memory.cells.find((c) => c.from === p.id && c.to === r.id)?.probability ?? 0));
    return [p.id, field.map((r, i) => ((1 - chaos) * probabilities[i] + chaos / field.length) * (r.id === options.boostId ? boost : 1))];
  }));
  const random = randomSource(`${seasonId}/${snapshot.at}/${remainingMs}/${options.seed}`);
  const gaps = memory.gaps.length ? memory.gaps.map((gap) => clamp(gap, 5 * 60_000, 7 * DAY)) : [DAY];
  const ranked = (scores: number[]) => rows.map((r, i) => ({ id: r.id, i, score: scores[i] })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  let cappedRuns = 0;
  for (let run = 0; run < RUNS; run++) {
    const scores = rows.map((r) => r.throneMs);
    const king = snapshot.rows.find((r) => r.features[6] === 1);
    let holder = king && king.id !== options.exileId ? king.id : field[choose(weightsFor(null), random)].id;
    let elapsed = 0, events = 0, checkpoint = 0;
    const path = rows.map(() => [] as number[]);
    // Record 13 evenly spaced ranks in the first 12 universes.
    const capture = (end: number) => {
      if (run >= 12) return;
      while (checkpoint <= 12 && remainingMs * checkpoint / 12 <= end) {
        const moment = remainingMs * checkpoint / 12;
        const atMoment = [...scores]; atMoment[index.get(holder)!] += Math.max(0, moment - elapsed);
        ranked(atMoment).forEach((r, i) => path[r.i].push(i + 1)); checkpoint++;
      }
    };
    while (elapsed < remainingMs && events < EVENT_LIMIT) {
      const next = Math.min(remainingMs, elapsed + gaps[Math.floor(random() * gaps.length)]);
      capture(next);
      scores[index.get(holder)!] += next - elapsed;
      elapsed = next;
      if (elapsed < remainingMs) { holder = field[choose(transitions.get(holder) ?? weightsFor(holder), random)].id; events++; }
    }
    if (elapsed < remainingMs) {
      cappedRuns++; capture(remainingMs); scores[index.get(holder)!] += remainingMs - elapsed;
    } else if (!remainingMs) capture(0);
    ranked(scores).forEach((r, i) => {
      rows[r.i].projectedMs += scores[r.i] / RUNS;
      rows[r.i].histogram[i]++;
      if (i === 0) rows[r.i].titleChance += 1 / RUNS;
      if (i < 3) rows[r.i].podiumChance += 1 / RUNS;
    });
    if (run < 12) rows.forEach((r, i) => r.paths.push(path[i]));
  }
  rows.sort((a, b) => b.projectedMs - a.projectedMs || a.id.localeCompare(b.id));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return { ...empty, rows, cappedRuns };
}

/** An alternate rule, with weekends determined in Stockholm (including DST). */
export function weekendRebellion(data: LabData, seasonId: string, cutoff: number, weekendWeight: number) {
  const season = data.seasons.find((s) => s.id === seasonId);
  if (!season) throw new Error('Unknown season');
  const snapshot = labSnapshot(data, seasonId, cutoff);
  const weight = clamp(weekendWeight, 0, 1);
  const weekendByPlayer = new Map<string, number>();
  for (const reign of data.reigns) {
    let cursor = Math.max(season.start, reign.start);
    const end = Math.min(snapshot.at, reign.end ?? snapshot.at);
    while (cursor < end) {
      const next = Math.min(end, (Math.floor(cursor / HOUR) + 1) * HOUR);
      if (weekdayIndex(new Date(cursor)) >= 5) weekendByPlayer.set(reign.playerId, (weekendByPlayer.get(reign.playerId) ?? 0) + next - cursor);
      cursor = next;
    }
  }
  const rows = snapshot.rows.map((r) => ({ id: r.id, name: r.name, officialRank: r.currentRank, throneMs: r.throneMs,
    weekendMs: weekendByPlayer.get(r.id) ?? 0, weightedMs: r.throneMs - (weekendByPlayer.get(r.id) ?? 0) * (1 - weight), rank: 0 }))
    .sort((a, b) => b.weightedMs - a.weightedMs || a.id.localeCompare(b.id));
  rows.forEach((r, i) => { r.rank = i + 1; });
  return { rows, weight, at: snapshot.at };
}
