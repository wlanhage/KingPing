import type { EventType, NationState } from '@prisma/client';

export type PageKey = 'home' | 'leaderboard' | 'history' | 'players' | 'badges' | 'archive' | 'settings';

/** Delvis omdöpning av en badge. Utelämnade fält faller tillbaka på basdefinitionen. */
export type BadgeOverride = { name?: string; description?: string; emoji?: string };

export type ThemeColors = {
  bg: string;
  panel: string;
  panelSoft: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  border: string;
  gold: string;
};

/**
 * Ett tema äger rikets IDENTITET — vad saker heter och hur de ser ut — men aldrig
 * någon logik. Vem som förtjänar en badge avgörs fortsatt av badge-engine; temat
 * bestämmer bara vad badgen kallas.
 */
export type Theme = {
  key: string;
  appName: string;
  tagline: string;
  nav: Record<PageKey, string>;
  pages: Record<PageKey, { title: string; subtitle: string }>;
  /** Epitet för plats 1–3 på rankinglistan. */
  epithets: { rank1: string; rank2: string; rank3: string };
  roles: { monarch: string; monarchLower: string; challenger: string; player: string; players: string };
  /** Ord för händelsen "att utse en vinnare" — t.ex. kröna/upphöja. */
  verbs: { crown: string; crowning: string };
  badgeOverrides: Record<string, BadgeOverride>;
  announcements: {
    streakTemplates: Record<string, string[]>;
    nationIntros: Record<NationState | string, string[]>;
    fridayIntros: string[];
  };
  colors: ThemeColors;
};

export type { EventType };
