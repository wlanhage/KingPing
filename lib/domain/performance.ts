import { standingsError } from './standings';

export type PerformanceRound = { id: string; winnerId: string; standings: string[]; occurredAt: Date | string };
export type PerformancePlayer = { id: string; name: string };
export type PlayerPerformanceData = ReturnType<typeof playerPerformance>;

/** Only complete, valid placements prove participation. A crown transfer alone does not. */
export function playerPerformance(playerId: string, players: PerformancePlayer[], rounds: PerformanceRound[]) {
  const roster = new Map(players.map((p) => [p.id, p]));
  const valid = rounds.filter((r) => Number.isFinite(new Date(r.occurredAt).getTime()) && !standingsError(r.winnerId, r.standings) && r.standings.every((id) => roster.has(id)))
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  let wins = 0, currentStreak = 0, bestStreak = 0, placeTotal = 0;
  const recent: { roundId: string; at: string; place: number; participants: number; won: boolean }[] = [];
  const opponents = new Map<string, { played: number; ahead: number; behind: number }>();
  for (const r of valid) {
    const index = r.standings.indexOf(playerId);
    if (index < 0) continue;
    const won = index === 0;
    if (won) { wins++; currentStreak++; bestStreak = Math.max(bestStreak, currentStreak); }
    else currentStreak = 0;
    placeTotal += index + 1;
    recent.push({ roundId: r.id, at: new Date(r.occurredAt).toISOString(), place: index + 1, participants: r.standings.length, won });
    r.standings.forEach((id, otherIndex) => {
      if (id === playerId) return;
      const tally = opponents.get(id) ?? { played: 0, ahead: 0, behind: 0 };
      tally.played++;
      if (index < otherIndex) tally.ahead++; else tally.behind++;
      opponents.set(id, tally);
    });
  }
  const played = recent.length;
  const rivals = Array.from(opponents, ([id, stats]) => ({ id, name: roster.get(id)!.name, ...stats, winRate: stats.ahead / stats.played * 100 }))
    .sort((a, b) => b.played - a.played || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    played, wins, losses: played - wins, winRate: played ? wins / played * 100 : null,
    averagePlace: played ? placeTotal / played : null, currentStreak, bestStreak,
    legacyWins: rounds.filter((r) => r.winnerId === playerId && r.standings.length === 0 && Number.isFinite(new Date(r.occurredAt).getTime())).length,
    recent: recent.slice(-10).reverse(), rivals,
  };
}
