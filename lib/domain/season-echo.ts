import type { SeasonWindow } from './season';

/** Så många händelser in i en ny säsong som krönikan får blicka tillbaka på den förra. */
export const ECHO_WINDOW = 20;

/** Vad vinnaren (och den störtade) var förra säsongen. Nycklarna matchar textgrupperna i temat. */
export type SeasonEcho = {
  lastSeason: string;
  lastRank: number;
  lastWins: number;
  lastChampion: string;
  champion: boolean;
  winless: boolean;
  last: boolean;
  runnerUp: boolean;
  dethronedChampion: boolean;
};

type BoardRow = { id: string; name: string; rank: number; totalWins: number; totalReignMs: number };

export function describeSeasonEcho(previous: SeasonWindow, board: BoardRow[], winnerId: string, previousKingId: string | null): SeasonEcho | null {
  const row = board.find((r) => r.id === winnerId);
  if (!row) return null;
  const champion = board[0] && board[0].totalReignMs > 0 ? board[0] : null;
  return {
    lastSeason: previous.name,
    lastRank: row.rank,
    lastWins: row.totalWins,
    lastChampion: champion?.name ?? '',
    champion: champion?.id === winnerId,
    winless: row.totalWins === 0,
    last: row.totalWins > 0 && row.rank === board.length,
    runnerUp: row.rank === 2,
    dethronedChampion: !!previousKingId && previousKingId !== winnerId && champion?.id === previousKingId,
  };
}

const SPECIAL_GROUPS = ['champion', 'winless', 'last', 'runnerUp', 'dethronedChampion'] as const;
const SPECIAL_CHANCE = 0.7;
const GENERIC_CHANCE = 0.35;

/**
 * Väljer en tillbakablick, eller ingen alls — det ska inte hända varje gång. Finns
 * speciell data (förra härskaren, noll vinster, sist, tvåa) används de grupperna,
 * annars de generella raderna. Nyss använda texter väljs bort.
 */
export function pickSeasonEcho(copy: Record<string, string[]>, echo: SeasonEcho | null | undefined, recent: string[], render: (t: string) => string, rand: () => number = Math.random): string | null {
  if (!echo) return null;
  const special = SPECIAL_GROUPS.filter((k) => echo[k]).flatMap((k) => copy[k] ?? []);
  const pool = special.length ? special : copy.generic ?? [];
  if (!pool.length || rand() >= (special.length ? SPECIAL_CHANCE : GENERIC_CHANCE)) return null;
  const rendered = pool.map(render);
  const fresh = rendered.filter((t) => !recent.some((r) => r.includes(t)));
  const candidates = fresh.length ? fresh : rendered;
  return candidates[Math.floor(rand() * candidates.length)];
}
