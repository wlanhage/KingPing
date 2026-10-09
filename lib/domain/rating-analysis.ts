import { START_RATING, type RatingSnapshot } from './crown-rating';

export type RatingModel = 'current' | 'classic';
export type RatingPlayer = { id: string; name: string };
export type RatingAnalysis = RatingPlayer & {
  rating: number; played: number; peak: number; drawdown: number;
  momentum: number; volatility: number | null; modelGap: number;
  changes: (number | null)[]; trajectory: number[];
};

/** Missing observations are never treated as zero-change rounds. */
export function analyzeRatings(players: RatingPlayer[], history: RatingSnapshot[], model: RatingModel): RatingAnalysis[] {
  return players.map((player) => {
    let previous = START_RATING;
    let played = 0;
    let peak = START_RATING;
    let drawdown = 0;
    const trajectory = [START_RATING];
    const changes = history.map((point) => {
      const current = point[model][player.id];
      const rating = current?.rating ?? START_RATING;
      const change = (current?.played ?? 0) > played ? rating - previous : null;
      played = current?.played ?? 0;
      previous = rating;
      peak = Math.max(peak, rating);
      drawdown = Math.max(drawdown, peak - rating);
      trajectory.push(rating);
      return change;
    });
    const observed = changes.filter((v): v is number => v !== null);
    const mean = observed.length ? observed.reduce((a, b) => a + b, 0) / observed.length : 0;
    const volatility = observed.length >= 2 ? Math.sqrt(observed.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (observed.length - 1)) : null;
    const final = history.at(-1);
    return {
      ...player, rating: previous, played, peak, drawdown,
      momentum: observed.slice(-5).reduce((a, b) => a + b, 0), volatility,
      modelGap: (final?.current[player.id]?.rating ?? START_RATING) - (final?.classic[player.id]?.rating ?? START_RATING),
      changes, trajectory,
    };
  });
}

/** Preserve numeric cells while escaping text and neutralizing name formulas. */
export function ratingHistoryCsv(players: RatingPlayer[], history: RatingSnapshot[], model: RatingModel): string {
  const cell = (value: string | number) => {
    const safe = typeof value === 'string' && /^\s*[=+@-]/.test(value) ? `'${value}` : String(value);
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const rows = analyzeRatings(players, history, model);
  const header = ['Runda', 'Tid', 'Spelare', 'Modell', 'Rating', 'Ratingändring', 'Ratingrundor'];
  const lines = history.flatMap((point, i) => rows.map((r) => [i + 1, point.at, r.name, model, point[model][r.id]?.rating ?? START_RATING, r.changes[i] ?? '', point[model][r.id]?.played ?? 0].map(cell).join(',')));
  return '\uFEFF' + [header.map(cell).join(','), ...lines].join('\r\n');
}
