import { BADGE_BY_ID } from '../badges/badge-definitions';
import type { BadgeDefinition } from '../badges/badge-types';
// Typ-bara import: season.ts drar in Prisma, som inte får hamna i klientbundlen.
import type { SeasonWindow } from '../domain/season';
import { realm } from './themes/realm';
import { starWars } from './themes/star-wars';
import type { Theme, ThemeColors } from './theme-types';

const FALLBACK_THEME = realm.key;

export const THEMES: Record<string, Theme> = {
  [realm.key]: realm,
  [starWars.key]: starWars,
};

/** Okänd nyckel faller tillbaka på riddartemat i stället för att krascha. */
export function getTheme(key?: string | null): Theme {
  return (key && THEMES[key]) || THEMES[FALLBACK_THEME] || realm;
}

export function themeForSeason(season: Pick<SeasonWindow, 'theme'>): Theme {
  return getTheme(season.theme);
}

/** Badgens namn/beskrivning/emoji i det aktuella temat, med basdefinitionen som fallback. */
export function themedBadge(definition: BadgeDefinition, theme: Theme): BadgeDefinition {
  const override = theme.badgeOverrides[definition.id];
  return override ? { ...definition, ...override } : definition;
}

export function themedBadgeById(id: string, theme: Theme): BadgeDefinition | undefined {
  const base = BADGE_BY_ID[id as keyof typeof BADGE_BY_ID];
  return base ? themedBadge(base, theme) : undefined;
}

/**
 * Temats palett som CSS-variabler. Sätts på <html> så att globals.css slipper
 * dupliceras per tema — de befintliga klassnamnen (royal-*, knight-*) blir därmed
 * bara namn, inte utseende.
 */
export function themeCssVars(colors: ThemeColors): Record<string, string> {
  return {
    '--bg': colors.bg,
    '--panel': colors.panel,
    '--panel-soft': colors.panelSoft,
    '--text': colors.text,
    '--muted': colors.muted,
    '--accent': colors.accent,
    '--accent-2': colors.accent2,
    '--border': colors.border,
    '--gold': colors.gold,
  };
}

export type { Theme, ThemeColors, PageKey } from './theme-types';
