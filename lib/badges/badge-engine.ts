import { BADGES, BADGE_BY_ID } from './badge-definitions';
import type { ComputedPlayerBadge, PlayerBadgeContext, PlayerStats } from './badge-types';

const rarityRank = { mythical: 5, legendary: 4, epic: 3, rare: 2, common: 1 } as const;
const categoryOrder = ['throne', 'streak', 'combat', 'friday', 'form', 'legacy', 'meta', 'chaos', 'shame'] as const;
const categoryRank = Object.fromEntries(categoryOrder.map((c, i) => [c, i]));
const hasTop = (value: number, max: number) => value > 0 && value === max;

export function getPlayerBadges(playerId: string, context: PlayerBadgeContext): ComputedPlayerBadge[] {
  const s = context.playerStats[playerId];
  if (!s) return [];
  const all = Object.values(context.playerStats);
  const push = (items: ComputedPlayerBadge[], id: string, reason: string, value?: number | string) => {
    const d = BADGE_BY_ID[id as keyof typeof BADGE_BY_ID];
    if (d) items.push({ id, definition: d, reason, value });
  };
  const res: ComputedPlayerBadge[] = [];
  if (s.isCurrentKing) push(res, 'current_king', 'Sitter på tronen just nu.');
  if (hasTop(s.totalReignMs, context.globalStats.maxTotalReignMs)) push(res, 'emperor', 'Har mest total tid på tronen.', s.totalReignMs);
  if (hasTop(s.totalWins, context.globalStats.maxTotalWins)) push(res, 'crown_collector', 'Har flest vinster.', s.totalWins);
  if (hasTop(s.crownEfficiencyMsPerWin, context.globalStats.maxCrownEfficiencyMsPerWin)) push(res, 'efficient_monarch', 'Har högst tron-tid per vinst.');
  if (hasTop(s.longestReignMs, Math.max(0, ...all.map((p) => p.longestReignMs)))) push(res, 'longest_reign', 'Har längsta enskilda regeringstid.');
  if (s.longestStreak >= 3) push(res, 'dynasty_founder', 'Har nått minst 3 streak.');
  if (s.longestStreak >= 4) push(res, 'hr_case', 'Har nått minst 4 streak.');
  if (s.longestStreak >= 5) push(res, 'tyrant', 'Har nått minst 5 streak.');
  if (s.longestStreak >= 7) push(res, 'state_owned', 'Har nått brutal streaknivå.');
  if (s.currentStreak >= 2) push(res, 'defender_of_the_throne', 'Försvarar kronan med streak.');
  if (hasTop(s.fridayWins, context.globalStats.maxFridayWins)) push(res, 'friday_champion', 'Flest fredagsvinster.', s.fridayWins);
  if (s.fridayWins >= 3) push(res, 'prime_time_player', 'Vunnit flera fredagar.', s.fridayWins);
  if (s.fridayWins >= 2 && s.fridayWins / Math.max(1, s.totalWins) >= 0.5) push(res, 'after_work_assassin', 'Extra farlig på fredagar.');
  if (hasTop(s.winsLast30Days, context.globalStats.maxWinsLast30Days)) push(res, 'recent_champion', 'Hetast senaste 30 dagarna.', s.winsLast30Days);
  if (s.winsLast7Days >= 2) push(res, 'hot_right_now', 'Stark form senaste veckan.', s.winsLast7Days);
  if (s.winsLast7Days >= 3) push(res, 'momentum', 'Hög fart den senaste veckan.', s.winsLast7Days);
  if ((s.daysSinceLastWin ?? 0) >= 14) push(res, 'cold', '14+ dagar sedan senaste vinst.', s.daysSinceLastWin ?? undefined);
  if ((s.daysSinceLastWin ?? 0) >= 30) push(res, 'frozen', '30+ dagar sedan senaste vinst.', s.daysSinceLastWin ?? undefined);
  if (s.totalWins >= 5 && (s.daysSinceLastWin ?? 0) >= 30) push(res, 'lost_heir', 'Historisk profil med kall form.');
  if (s.totalReignMs >= context.globalStats.maxTotalReignMs * 0.6 && s.winsLast30Days === 0) push(res, 'historically_relevant', 'Stor historik, svag nutid.');
  if (s.biggestStreakBroken >= 5) push(res, 'tyrant_slayer', 'Har brutit streak 5+.');
  if (hasTop(s.streaksBroken, context.globalStats.maxStreaksBroken)) push(res, 'regime_changer', 'Har brutit flest streaks.', s.streaksBroken);
  if (hasTop(s.takeoverWins, Math.max(0, ...all.map((p) => p.takeoverWins)))) push(res, 'king_slayer', 'Flest takeover-vinster.', s.takeoverWins);
  if (s.biggestStreakBroken >= 3) push(res, 'revolutionary', 'Har störtat dynasti.');
  if (s.takeoverWins + s.timesDethroned >= 4) push(res, 'chaos_agent', 'Ofta med i tronskiften.');
  if (s.timesDethroned >= 3 && s.averageReignMs > 0 && s.averageReignMs < 2 * 60 * 60 * 1000) push(res, 'borrowed_crown', 'Flera korta regeringar.');
  if (s.averageReignMs > 0 && s.averageReignMs < 3 * 60 * 60 * 1000) push(res, 'short_reign_specialist', 'Kort snitt på regeringstid.');
  if (s.totalWins >= 6 && s.longestStreak <= 2) push(res, 'people_favorite', 'Många vinster utan dynasti.');
  if (s.totalWins >= 2 && s.totalReignMs < 2 * 60 * 60 * 1000) push(res, 'statistically_unlikely', 'Vinner trots svag historik.');
  if ((s.daysSinceLastWin ?? 0) >= 60 && s.winsLast30Days > 0) push(res, 'time_traveler', 'Vunnit igen efter långt uppehåll.');
  if (s.isCurrentKing && (s.daysSinceLastWin ?? 999) <= 1 && s.winsLast30Days > 0 && s.totalWins >= 8) push(res, 'prophecy', 'Episk återkomst till tronen.');
  // TODO: eagle_has_landed kräver särskilt event/trigger i datamodell eller manuell/persisted tilldelning.
  // TODO: merge persisted earned badges here when historical badge table exists.

  const unique = Array.from(new Map(res.map((b) => [b.id, b])).values());
  return unique.sort((a, b) => (rarityRank[b.definition.rarity] - rarityRank[a.definition.rarity]) || ((categoryRank[a.definition.category] ?? 99) - (categoryRank[b.definition.category] ?? 99)) || a.definition.name.localeCompare(b.definition.name));
}
