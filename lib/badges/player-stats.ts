import { differenceInDays, subDays } from 'date-fns';
import type { GlobalStats, PlayerStats } from './badge-types';

const durationMs = (start: Date, end?: Date | null) => (end ?? new Date()).getTime() - new Date(start).getTime();

export function calculatePlayerStats(player: any, currentKingId?: string | null, now = new Date()): PlayerStats {
  const wins = player.wins ?? [];
  const reigns = player.reigns ?? [];
  const totalWins = wins.length;
  const totalReignMs = reigns.reduce((s: number, r: any) => s + durationMs(r.startedAt, r.endedAt), 0);
  const longestReignMs = Math.max(0, ...reigns.map((r: any) => durationMs(r.startedAt, r.endedAt)));
  const isCurrentKing = currentKingId === player.id;
  const currentReign = isCurrentKing ? reigns.find((r: any) => !r.endedAt) : null;
  const currentReignMs = currentReign ? durationMs(currentReign.startedAt) : 0;
  const currentStreak = isCurrentKing ? (wins[0]?.streakCount ?? 0) : 0;
  const longestStreak = Math.max(0, ...wins.map((w: any) => w.streakCount ?? 0));
  const fridayWins = wins.filter((w: any) => w.isFridayFinal).length;
  const d30 = subDays(now, 30);
  const d7 = subDays(now, 7);
  const winsLast30Days = wins.filter((w: any) => new Date(w.occurredAt) >= d30).length;
  const winsLast7Days = wins.filter((w: any) => new Date(w.occurredAt) >= d7).length;
  const lastWinAt = wins[0]?.occurredAt ?? null;
  const daysSinceLastWin = lastWinAt ? differenceInDays(now, new Date(lastWinAt)) : null;
  const streaksBroken = wins.filter((w: any) => (w.previousStreakCount ?? 0) >= 2).length;
  const biggestStreakBroken = Math.max(0, ...wins.map((w: any) => w.previousStreakCount ?? 0));
  const takeoverWins = wins.filter((w: any) => w.previousKingId && w.previousKingId !== w.winnerId).length;
  const timesDethroned = reigns.filter((r: any) => !!r.endedAt).length;
  const averageReignMs = reigns.length ? totalReignMs / reigns.length : 0;
  const crownEfficiencyMsPerWin = totalWins ? totalReignMs / totalWins : 0;
  return { playerId: player.id, totalWins, totalReignMs, longestReignMs, currentReignMs, currentStreak, longestStreak, fridayWins, winsLast30Days, winsLast7Days, daysSinceLastWin, streaksBroken, biggestStreakBroken, takeoverWins, timesDethroned, averageReignMs, crownEfficiencyMsPerWin, isCurrentKing };
}

export function calculateGlobalStats(stats: PlayerStats[], currentKingId: string | null): GlobalStats {
  return {
    maxTotalReignMs: Math.max(0, ...stats.map((s) => s.totalReignMs)),
    maxTotalWins: Math.max(0, ...stats.map((s) => s.totalWins)),
    maxLongestStreak: Math.max(0, ...stats.map((s) => s.longestStreak)),
    maxFridayWins: Math.max(0, ...stats.map((s) => s.fridayWins)),
    maxWinsLast30Days: Math.max(0, ...stats.map((s) => s.winsLast30Days)),
    maxStreaksBroken: Math.max(0, ...stats.map((s) => s.streaksBroken)),
    maxBiggestStreakBroken: Math.max(0, ...stats.map((s) => s.biggestStreakBroken)),
    maxCrownEfficiencyMsPerWin: Math.max(0, ...stats.map((s) => s.crownEfficiencyMsPerWin)),
    currentKingId,
  };
}
