import type { WeaveTransfer } from '@/lib/domain/weave';

/**
 * Domar och superlativ ur säsongsdatan — ren logik, ingen React. Texterna är
 * deterministiska: första regeln som matchar vinner, så samma säsong ger samma dom.
 */

export type VerdictRow = {
  id: string;
  name: string;
  rank: number;
  totalWins: number;
  longestStreak: number;
  takeoverWins: number;
  timesDethroned: number;
  fridayWins: number;
  longestReignMs: number;
};

export function verdictFor(row: VerdictRow, defences: number, playerCount: number): string {
  if (row.totalWins === 0) return 'Riket tjänade dig inte väl. Nästa säsong är din.';
  if (row.rank === 1) return 'Härskaren. Galaxen kretsar kring dig.';
  if (row.rank === 2) return 'Tronarvingen som aldrig fick ärva.';
  if (defences >= 4) return `Höll kronan som ett galler — ${defences} försvar.`;
  if (row.takeoverWins >= 3) return `Kungamördaren. ${row.takeoverWins} kronor tagna med våld.`;
  if (row.timesDethroned >= 3 && row.totalWins <= 3) return `Kronan var lånad. ${row.timesDethroned} gånger.`;
  if (row.fridayWins >= 2) return `Fredagarnas skräck — ${row.fridayWins} fredagsfinaler.`;
  if (row.longestStreak >= 3) return `Byggde en dynasti på ${row.longestStreak} raka.`;
  if (row.totalWins === 1) {
    // Flera kan ha exakt en vinst — rotera formuleringen på rank så domen inte upprepas.
    const variants = ['En vinst. En kväll att minnas.', 'En krona, en kväll — riket såg dig.', 'Ett tronskifte att bygga vidare på.'];
    return variants[row.rank % variants.length];
  }
  if (row.rank === playerCount) return 'Sist i tabellen, först i hjärtat.';
  return `${row.totalWins} vinster. Ett namn i krönikan.`;
}

/** De som gick genom säsongen utan en enda krona, i rankordning. */
export function winless(rows: VerdictRow[]): VerdictRow[] {
  return rows.filter((r) => r.totalWins === 0).sort((a, b) => a.rank - b.rank);
}

export type Rivalry = { a: string; b: string; aToB: number; bToA: number; total: number } | null;

/** Paret som bytte kronan flest gånger sinsemellan, med riktning. Tronens första kröning räknas inte. */
export function topRivalry(transfers: WeaveTransfer[], names: Record<string, string>): Rivalry {
  const counts = new Map<string, { a: string; b: string; aToB: number; bToA: number }>();
  for (const t of transfers) {
    if (!t.fromId) continue;
    const [a, b] = [t.fromId, t.toId].sort();
    const key = `${a}|${b}`;
    const entry = counts.get(key) ?? { a, b, aToB: 0, bToA: 0 };
    if (t.fromId === a) entry.aToB += 1; else entry.bToA += 1;
    counts.set(key, entry);
  }
  let best: { a: string; b: string; aToB: number; bToA: number } | null = null;
  for (const e of counts.values()) {
    if (!best || e.aToB + e.bToA > best.aToB + best.bToA) best = e;
  }
  if (!best || best.aToB + best.bToA < 2) return null;
  return { a: names[best.a] ?? best.a, b: names[best.b] ?? best.b, aToB: best.aToB, bToA: best.bToA, total: best.aToB + best.bToA };
}

export type Superlative = { label: string; name: string; value: string };

export function superlatives(rows: VerdictRow[], defences: Record<string, number>, formatDuration: (ms: number) => string): Superlative[] {
  const out: Superlative[] = [];
  const top = <T,>(items: T[], score: (x: T) => number) => {
    let best: T | null = null;
    for (const it of items) if (score(it) > 0 && (!best || score(it) > score(best))) best = it;
    return best;
  };
  const guard = top(rows, (r) => defences[r.id] ?? 0);
  if (guard) out.push({ label: 'Kronvakten', name: guard.name, value: `${defences[guard.id]} försvar` });
  const slayer = top(rows, (r) => r.takeoverWins);
  if (slayer) out.push({ label: 'Kungamördaren', name: slayer.name, value: `${slayer.takeoverWins} erövringar` });
  const friday = top(rows, (r) => r.fridayWins);
  if (friday) out.push({ label: 'Fredagarnas skräck', name: friday.name, value: `${friday.fridayWins} fredagsfinaler` });
  const reign = top(rows, (r) => r.longestReignMs);
  if (reign) out.push({ label: 'Längsta enskilda välde', name: reign.name, value: formatDuration(reign.longestReignMs) });
  return out;
}
