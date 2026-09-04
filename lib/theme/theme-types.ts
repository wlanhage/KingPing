import type { EventType, NationState } from '@prisma/client';

export type PageKey = 'home' | 'leaderboard' | 'history' | 'players' | 'badges' | 'archive' | 'settings';

/** Delvis omdöpning av en badge. Utelämnade fält faller tillbaka på basdefinitionen. */
export type BadgeOverride = { name?: string; description?: string; emoji?: string; icon?: string };

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
  /** Texter för 404-sidan. */
  notFound: { title: string; subtitle: string; back: string };
  /** Epitet för plats 1–3 på rankinglistan. */
  epithets: { rank1: string; rank2: string; rank3: string };
  roles: { monarch: string; monarchLower: string; challenger: string; player: string; players: string };
  /** Ord för händelsen "att utse en vinnare" — t.ex. kröna/upphöja. */
  verbs: { crown: string; crowning: string; crowningNow: string };
  /** Kröningsceremonins texter. {streak} i holdDecree ersätts med antal raka. */
  coronation: {
    /** 'fanfare' = rikets C-durfanfar och sorgtrombon, 'march' = galaxens marsch i moll och droidpip. */
    sound: 'fanfare' | 'march';
    crier: string;
    decree: string;
    holdCrier: string;
    holdDecree: string;
    dismiss: string;
    jester: string;
    streakCreature: string;
    roasts: string[];
  };
  badgeOverrides: Record<string, BadgeOverride>;
  announcements: {
    streakTemplates: Record<string, string[]>;
    nationIntros: Record<NationState | string, string[]>;
    fridayIntros: string[];
    /** Tillbakablickar på förra säsongen: champion, winless, last, runnerUp, dethronedChampion, generic. */
    seasonEchoes: Record<string, string[]>;
  };
  /** Ordet för en säsong i temats värld ("Säsong"/"Episod"), numreras med romerska siffror. */
  seasonWord: string;
  /** Rubriken över sigillet ('Rikets läge' / 'Galaxens läge') och lägena med temats namn. */
  nationLabel: string;
  nationStates: Record<NationState, { name: string; emoji: string; blurb: string }>;
  /** Mall för "närmast att låsa upp": {current}, {target}, {left} och {unit}. */
  progressTemplate: string;
  colors: ThemeColors;
  /** Rörlig bakgrund bakom hela sidan. Utelämnas för teman utan. */
  backdrop?: 'starfield';
  /** Historiksidans form: 'crawl' = skrollstyrd textrulle i perspektiv. Utelämnas = vanlig lista. */
  historyStyle?: 'crawl';
};

export type { EventType };
