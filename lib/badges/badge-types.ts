export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';
export type BadgeCategory = 'throne' | 'streak' | 'friday' | 'calendar' | 'form' | 'combat' | 'chaos' | 'shame' | 'legacy' | 'meta';
export type BadgeTone = 'prestige' | 'dramatic' | 'roast' | 'meme' | 'neutral';
// `ladder` + `tier` gör en badge till ett steg i en trappa: inom samma ladder visas bara
// den högsta uppnådda nivån. Badges utan ladder visas alltid. Skilj detta från `category`,
// som bara styr sorteringsordning och är för grov för att avgöra exklusivitet (t.ex. ligger
// både längsta-streak-trappan och Tronsförsvararen i kategorin 'streak', men de mäter
// olika saker).
/** `icon` är en bild-URL som ersätter emojin där badgen visas. */
export type BadgeDefinition = { id: string; name: string; emoji: string; icon?: string; description: string; rarity: BadgeRarity; category: BadgeCategory; tone: BadgeTone; ladder?: string; tier?: number };
export type BadgeId = string;
export type PlayerStats = { playerId: string; totalWins: number; totalReignMs: number; longestReignMs: number; currentReignMs: number; currentStreak: number; longestStreak: number; fridayWins: number; winsLast30Days: number; winsLast7Days: number; daysSinceLastWin: number | null; daysSincePreviousWin: number | null; streaksBroken: number; biggestStreakBroken: number; takeoverWins: number; timesDethroned: number; averageReignMs: number; crownEfficiencyMsPerWin: number; isCurrentKing: boolean;
  /** Måndag = 0 … söndag = 6, i svensk tid. */
  winsByWeekday: number[]; earlyWins: number; lunchWins: number; lateWins: number; maxWinsInOneDay: number; firstWinAt: Date | null; reignCount: number;
  /** Antal olika spelare som spelaren tagit kronan ifrån. */
  distinctVictims: number;
  /** Vinster förra säsongen. null = ingen förra säsong, eller spelaren fanns inte då. */
  previousSeasonWins: number | null };
export type GlobalStats = { maxTotalReignMs: number; maxTotalWins: number; maxLongestStreak: number; maxFridayWins: number; maxWinsLast30Days: number; maxStreaksBroken: number; maxBiggestStreakBroken: number; maxCrownEfficiencyMsPerWin: number; currentKingId: string | null; earliestWinAt: Date | null; secondTotalReignMs: number; maxWinGrowth: number };
export type PlayerBadgeContext = { now?: Date; playerStats: Record<string, PlayerStats>; globalStats: GlobalStats };
export type ComputedPlayerBadge = { id: BadgeId; definition: BadgeDefinition; reason: string; value?: number | string };
