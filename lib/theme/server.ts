import { resolveSeason } from '../domain/season';
import { getTheme } from './index';
import type { Theme } from './theme-types';

/** Aktivt tema för en säsong (default: pågående). Endast för serverkomponenter — rör databasen. */
export async function getActiveTheme(seasonSlug?: string | null): Promise<{ theme: Theme; season: Awaited<ReturnType<typeof resolveSeason>> }> {
  const season = await resolveSeason(seasonSlug);
  return { theme: getTheme(season.theme), season };
}
