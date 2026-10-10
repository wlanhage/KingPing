/** Read-only season forecasts. All features are reconstructed as of the cutoff. */
export type LabSeason = { id: string; slug: string; name: string; start: number; end: number | null };
export type LabData = {
  seasons: LabSeason[];
  players: { id: string; name: string; created: number; afk: { start: number; end: number | null }[] }[];
  wins: { id: string; winnerId: string; at: number; standings: string[] }[];
  reigns: { playerId: string; start: number; end: number | null }[];
};
export const LAB_MODELS = ['current', 'form', 'ridge'] as const;
export type LabModel = typeof LAB_MODELS[number];
export const MODEL_NAMES: Record<LabModel, string> = { current: 'Behåll tabellen', form: 'Formprognos', ridge: 'Inlärd regression' };
const DAY = 86_400_000;
const afkAt = (p: LabData['players'][number], at: number) => p.afk.some((a) => a.start <= at && (a.end === null || a.end > at));
const overlap = (start: number, end: number | null, from: number, to: number) => Math.max(0, Math.min(end ?? to, to) - Math.max(start, from));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export type SnapshotRow = { id: string; name: string; throneMs: number; wins: number; winShare: number; recentShare: number; placement: number | null; appearances: number; observedWinRate: number; currentRank: number; features: number[] };
export function labSnapshot(data: LabData, seasonId: string, cutoff: number) {
  const season = data.seasons.find((s) => s.id === seasonId);
  if (!season) throw new Error('Unknown season');
  const at = Math.max(season.start, Math.min(cutoff, season.end ?? cutoff));
  // Use a strict cutoff for events, matching the season's [start, end) interval.
  const wins = data.wins.filter((w) => w.at >= season.start && w.at < at);
  const recentStart = Math.max(season.start, at - Math.max(DAY, (at - season.start) * .25));
  const recent = wins.filter((w) => w.at >= recentStart);
  const players = data.players.filter((p) => p.created <= at && !afkAt(p, at));
  const throne = (id: string) => sum(data.reigns.filter((r) => r.playerId === id).map((r) => overlap(r.start, r.end, season.start, at)));
  const totalThrone = sum(players.map((p) => throne(p.id)));
  const recentThrone = (id: string) => sum(data.reigns.filter((r) => r.playerId === id).map((r) => overlap(r.start, r.end, recentStart, at)));
  const totalRecentThrone = sum(players.map((p) => recentThrone(p.id)));
  const n = Math.max(1, players.length);
  const rows: SnapshotRow[] = players.map((p) => {
    const own = wins.filter((w) => w.winnerId === p.id).length;
    const ownRecent = recent.filter((w) => w.winnerId === p.id).length;
    const placements = wins.flatMap((w) => {
      const index = w.standings.indexOf(p.id);
      return index >= 0 && w.standings.length > 1 ? [1 - index / (w.standings.length - 1)] : [];
    });
    // Only full recorded standings establish whether a player participated.
    const observed = wins.filter((w) => w.standings.length > 1 && w.standings.includes(p.id));
    const appearances = observed.length;
    const observedWinRate = (observed.filter((w) => w.winnerId === p.id).length + 2 / n) / (appearances + 2);
    const throneMs = throne(p.id);
    const winShare = (own + 1) / (wins.length + n);
    const recentShare = (ownRecent + 1) / (recent.length + n);
    const placement = placements.length ? sum(placements) / placements.length : null;
    const king = data.reigns.some((r) => r.playerId === p.id && r.start < at && (r.end === null || r.end >= at));
    return { id: p.id, name: p.name, throneMs, wins: own, winShare, recentShare, placement, appearances, observedWinRate, currentRank: 0,
      features: [1, totalThrone ? throneMs / totalThrone : 1 / n, winShare, recentShare, placement ?? .5, placements.length / Math.max(1, wins.length), king ? 1 : 0, totalRecentThrone ? recentThrone(p.id) / totalRecentThrone : 1 / n, observedWinRate] };
  }).sort((a, b) => b.throneMs - a.throneMs || a.id.localeCompare(b.id));
  rows.forEach((r, i) => { r.currentRank = i + 1; });
  return { rows, rounds: wins.length, placementRounds: wins.filter((w) => w.standings.length > 1).length, at };
}

type Sample = { x: number[]; y: number; seasonId: string; seasonStart: number; seasonEnd: number; snapshotKey: string };
type RidgeFit = { weights: number[]; means: number[]; scales: number[] };
export type RidgeTuning = { penalty: number; validationSeasons: number; validationMse: number | null };
function horizonFeatures(row: SnapshotRow, start: number, at: number, horizon: number): number[] {
  const elapsed = Math.max(0, at - start);
  const remaining = Math.max(0, horizon - at);
  return [...row.features, elapsed / Math.max(1, elapsed + remaining), Math.log1p(remaining / DAY), row.features[6] / (1 + remaining / DAY)];
}
const normalizeShares = (raw: number[]) => { const total = sum(raw); return raw.map((v) => total ? v / total : 1 / Math.max(1, raw.length)); };
const ridgeValue = (fit: RidgeFit, x: number[]) => Math.max(.001, sum(x.map((v, i) => fit.weights[i] * (i ? (v - fit.means[i]) / fit.scales[i] : 1))));
/** Small ridge normal-equation solve, with pivoting and an unpenalized intercept. */
function fitRidge(samples: Sample[], penalty: number): RidgeFit {
  const size = samples[0].x.length;
  // Each fold fits its own scaler; held-out observations never affect it.
  const means = Array.from({ length: size }, (_, i) => i ? sum(samples.map((s) => s.x[i])) / samples.length : 0);
  const scales = means.map((mean, i) => i ? Math.sqrt(sum(samples.map((s) => (s.x[i] - mean) ** 2)) / samples.length) || 1 : 1);
  const scaled = samples.map((s) => ({ ...s, x: s.x.map((v, i) => i ? (v - means[i]) / scales[i] : 1) }));
  const matrix = Array.from({ length: size }, (_, i) => Array.from({ length: size + 1 }, (_, j) => j === size
    ? sum(scaled.map((s) => s.x[i] * s.y))
    : sum(scaled.map((s) => s.x[i] * s.x[j])) + (i === j && i > 0 ? penalty : 0)));
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let row = col + 1; row < size; row++) if (Math.abs(matrix[row][col]) > Math.abs(matrix[pivot][col])) pivot = row;
    [matrix[col], matrix[pivot]] = [matrix[pivot], matrix[col]];
    const divisor = matrix[col][col];
    if (Math.abs(divisor) < 1e-10) return { weights: Array.from({ length: size }, (_, i) => i === 0 ? sum(samples.map((s) => s.y)) / samples.length : 0), means, scales };
    for (let j = col; j <= size; j++) matrix[col][j] /= divisor;
    for (let row = 0; row < size; row++) if (row !== col) {
      const scale = matrix[row][col];
      for (let j = col; j <= size; j++) matrix[row][j] -= scale * matrix[col][j];
    }
  }
  return { weights: matrix.map((r) => r[size]), means, scales };
}
function trainingData(data: LabData, season: LabSeason, cutoff: number) {
  const samples: Sample[] = [];
  let seasons = 0;
  for (const earlier of data.seasons.filter((s) => s.id !== season.id && s.start < season.start && s.end !== null && s.end <= season.start && s.end <= cutoff)) {
    if (earlier.end! <= earlier.start) continue;
    const before = samples.length;
    for (const progress of [.25, .5, .75]) {
      const at = earlier.start + (earlier.end! - earlier.start) * progress;
      const snap = labSnapshot(data, earlier.id, at);
      if (!snap.rounds || snap.rows.length < 2) continue;
      const remaining = snap.rows.map((p) => sum(data.reigns.filter((r) => r.playerId === p.id).map((r) => overlap(r.start, r.end, at, earlier.end!))));
      const total = sum(remaining);
      if (!total) continue;
      snap.rows.forEach((p, i) => samples.push({ x: horizonFeatures(p, earlier.start, at, earlier.end!), y: remaining[i] / total,
        seasonId: earlier.id, seasonStart: earlier.start, seasonEnd: earlier.end!, snapshotKey: `${earlier.id}/${progress}` }));
    }
    if (samples.length > before) seasons++;
  }
  return { samples, seasons };
}

/** Nested walk-forward validation: keep each season together and tune on past data only. */
function tuneRidge(samples: Sample[]): RidgeTuning {
  const seasonIds = [...new Set(samples.map((s) => s.seasonId))];
  const folds = seasonIds.flatMap((id) => {
    const heldOut = samples.filter((s) => s.seasonId === id);
    const train = samples.filter((s) => s.seasonId !== id && s.seasonEnd <= heldOut[0].seasonStart);
    return new Set(train.map((s) => s.seasonId)).size >= 2 ? [{ train, heldOut }] : [];
  });
  if (!folds.length) return { penalty: 1, validationSeasons: 0, validationMse: null };
  let selected = { penalty: 1, validationSeasons: folds.length, validationMse: Infinity };
  for (const penalty of [.1, 1, 10, 100]) {
    const losses = folds.map(({ train, heldOut }) => {
      const fit = fitRidge(train, penalty);
      const snapshots = [...new Set(heldOut.map((s) => s.snapshotKey))];
      return sum(snapshots.map((key) => {
        const group = heldOut.filter((s) => s.snapshotKey === key);
        const predictions = normalizeShares(group.map((s) => ridgeValue(fit, s.x)));
        return sum(group.map((s, i) => (predictions[i] - s.y) ** 2)) / group.length;
      })) / snapshots.length;
    });
    const loss = sum(losses) / losses.length;
    // Prefer stronger regularization if validation losses are effectively tied.
    if (loss <= selected.validationMse + 1e-12) selected = { penalty, validationSeasons: folds.length, validationMse: loss };
  }
  return selected;
}

// Seeded stochastic scenarios: gamma draws give coherent future shares summing to one.
function randomSource(seed: string) {
  let value = 2166136261;
  for (const c of seed) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
  return () => { value += 0x6D2B79F5; let x = value; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
function gamma(shape: number, random: () => number): number {
  if (shape < 1) return gamma(shape + 1, random) * Math.max(1e-10, random()) ** (1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const normal = Math.sqrt(-2 * Math.log(Math.max(1e-10, random()))) * Math.cos(2 * Math.PI * random());
    const v = (1 + c * normal) ** 3;
    if (v <= 0) continue;
    const u = Math.max(1e-10, random());
    if (u < 1 - .0331 * normal ** 4 || Math.log(u) < .5 * normal ** 2 + d * (1 - v + Math.log(v))) return d * v;
  }
}
export type ForecastRow = SnapshotRow & { rank: number; projectedMs: number; futureShare: number; lowRank: number; highRank: number; titleChance: number; podiumChance: number };
export function forecastSeason(data: LabData, seasonId: string, cutoff: number, horizon: number, model: LabModel) {
  const season = data.seasons.find((s) => s.id === seasonId);
  if (!season) throw new Error('Unknown season');
  const snapshot = labSnapshot(data, seasonId, cutoff);
  const training = trainingData(data, season, snapshot.at);
  const available = model !== 'ridge' || training.seasons >= 2;
  const tuning = model === 'ridge' && available ? tuneRidge(training.samples) : { penalty: 1, validationSeasons: 0, validationMse: null };
  const end = Math.max(snapshot.at, Math.min(horizon, season.end ?? horizon));
  const empty = { model, available, tuning, context: { remainingDays: (end - snapshot.at) / DAY }, trainingSeasons: training.seasons, trainingSamples: training.samples.length, rounds: snapshot.rounds, placementRounds: snapshot.placementRounds, at: snapshot.at, horizon: end, rows: [] as ForecastRow[] };
  if (!available || !snapshot.rows.length || (!snapshot.rounds && !snapshot.rows.some((r) => r.throneMs > 0))) return empty;
  const fit = model === 'ridge' ? fitRidge(training.samples, tuning.penalty) : null;
  const raw = snapshot.rows.map((r) => model === 'current' ? r.throneMs : model === 'form'
    ? .65 * r.recentShare + .35 * r.winShare
    : ridgeValue(fit!, horizonFeatures(r, season.start, snapshot.at, end)));
  const shares = normalizeShares(raw);
  const remaining = empty.horizon - snapshot.at;
  const rows: ForecastRow[] = snapshot.rows.map((r, i) => ({ ...r, rank: 0, projectedMs: r.throneMs + remaining * shares[i], futureShare: shares[i], lowRank: 1, highRank: raw.length, titleChance: 0, podiumChance: 0 }));
  rows.sort((a, b) => b.projectedMs - a.projectedMs || a.id.localeCompare(b.id));
  rows.forEach((r, i) => { r.rank = i + 1; });
  const random = randomSource(`${seasonId}/${snapshot.at}/${empty.horizon}/${model}`);
  const ranks = new Map(rows.map((r) => [r.id, [] as number[]]));
  for (let draw = 0; draw < 400; draw++) {
    // Current-table baseline is a deterministic persistence forecast.
    const draws = rows.map((r) => model === 'current' ? r.futureShare : gamma(.2 + r.futureShare * Math.min(30, Math.max(3, snapshot.rounds / 2)), random));
    const norm = sum(draws);
    const simulated = rows.map((r, i) => ({ id: r.id, value: r.throneMs + remaining * (norm ? draws[i] / norm : 1 / rows.length) }))
      .sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
    simulated.forEach((r, i) => ranks.get(r.id)!.push(i + 1));
  }
  for (const row of rows) {
    const draws = ranks.get(row.id)!.sort((a, b) => a - b);
    row.lowRank = draws[Math.floor(draws.length * .1)];
    row.highRank = draws[Math.min(draws.length - 1, Math.floor(draws.length * .9))];
    row.titleChance = draws.filter((r) => r === 1).length / draws.length;
    row.podiumChance = draws.filter((r) => r <= 3).length / draws.length;
  }
  return { ...empty, rows };
}
export type RankMetrics = { count: number; mae: number; exact: number; winner: number | null; pairAccuracy: number | null; pairs: number; entered: number; departed: number };
export function evaluateRanks(predicted: { id: string; rank: number }[], actual: { id: string; rank: number }[]): RankMetrics | null {
  const final = new Map(actual.map((r) => [r.id, r.rank]));
  const common = predicted.filter((r) => final.has(r.id));
  if (!common.length) return null;
  let pairs = 0, correct = 0;
  for (let i = 0; i < common.length; i++) for (let j = i + 1; j < common.length; j++) {
    pairs++; if (Math.sign(common[i].rank - common[j].rank) === Math.sign(final.get(common[i].id)! - final.get(common[j].id)!)) correct++;
  }
  const winner = actual.find((r) => r.rank === 1);
  return { count: common.length, mae: sum(common.map((r) => Math.abs(r.rank - final.get(r.id)!))) / common.length,
    exact: common.filter((r) => r.rank === final.get(r.id)).length / common.length,
    winner: winner ? Number(predicted.find((r) => r.rank === 1)?.id === winner.id) : null,
    pairAccuracy: pairs ? correct / pairs : null, pairs,
    entered: actual.filter((r) => !predicted.some((p) => p.id === r.id)).length, departed: predicted.length - common.length };
}
export type ScenarioMetrics = { rankCount: number; covered: number; coverage: number | null; titleBrier: number | null };
/** Empirical scenario checks; these diagnostics do not calibrate probabilities. */
export function evaluateScenarios(predicted: Pick<ForecastRow, 'id' | 'lowRank' | 'highRank' | 'titleChance'>[], actual: { id: string; rank: number }[]): ScenarioMetrics | null {
  if (!predicted.length || !actual.length) return null;
  const ranks = new Map(actual.map((r) => [r.id, r.rank]));
  const common = predicted.filter((r) => ranks.has(r.id));
  const covered = common.filter((r) => ranks.get(r.id)! >= r.lowRank && ranks.get(r.id)! <= r.highRank).length;
  const winner = actual.find((r) => r.rank === 1);
  const titleBrier = winner ? sum(predicted.map((r) => (r.titleChance - Number(r.id === winner.id)) ** 2)) + (predicted.some((r) => r.id === winner.id) ? 0 : 1) : null;
  return { rankCount: common.length, covered, coverage: common.length ? covered / common.length : null, titleBrier };
}
export function backtestSeasons(data: LabData, progress: number, now: number) {
  const fraction = Math.max(.1, Math.min(.9, progress));
  return data.seasons.filter((s) => s.end !== null && s.end <= now && s.end > s.start).sort((a, b) => a.start - b.start).map((s) => {
    const at = s.start + (s.end! - s.start) * fraction;
    const actual = labSnapshot(data, s.id, s.end!).rows.map((r) => ({ id: r.id, rank: r.currentRank }));
    return { seasonId: s.id, seasonName: s.name, at, models: LAB_MODELS.map((model) => {
      const forecast = forecastSeason(data, s.id, at, s.end!, model);
      return { model, available: forecast.available, metrics: evaluateRanks(forecast.rows, actual), scenarios: evaluateScenarios(forecast.rows, actual) };
    }) };
  });
}
/** Rank overlap is required for rank error, but never for scoring an unforeseen winner. */
export function comparableBacktests(reports: ReturnType<typeof backtestSeasons>) {
  return {
    ranks: reports.filter((b) => b.models.every((m) => m.available && m.metrics !== null)),
    scenarios: reports.filter((b) => b.models.every((m) => m.available && m.scenarios?.titleBrier != null)),
  };
}
/** Text cells are quoted and formula-like names are neutralized for spreadsheet export. */
export function labCsv(rows: ForecastRow[], actual: { id: string; rank: number }[], model: LabModel): string {
  const cell = (v: string | number) => `"${String(typeof v === 'string' && /^\s*[=+@-]/.test(v) ? `'${v}` : v).replaceAll('"', '""')}"`;
  const ranks = new Map(actual.map((r) => [r.id, r.rank]));
  return '\uFEFF' + [['Spelare', 'Modell', 'Prognos', 'Utfall', 'Fel', 'Scenario P10', 'Scenario P90', 'Titelscenarier', 'Podiumscenarier', 'Kända deltaganden', 'Utjämnad vinstfrekvens', 'Facit inom scenariospann'], ...rows.map((r) => [r.name, model, r.rank, ranks.get(r.id) ?? '', ranks.has(r.id) ? Math.abs(r.rank - ranks.get(r.id)!) : '', r.lowRank, r.highRank, r.titleChance, r.podiumChance, r.appearances, r.observedWinRate, ranks.has(r.id) ? Number(ranks.get(r.id)! >= r.lowRank && ranks.get(r.id)! <= r.highRank) : ''])].map((r) => r.map(cell).join(',')).join('\r\n');
}
