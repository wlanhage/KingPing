import { describe, expect, it } from 'vitest';
import { generateAnnouncement } from '../lib/domain/riket';
import { realm } from '../lib/theme/themes/realm';
import { starWars } from '../lib/theme/themes/star-wars';

// Minst dubbelt så många som i den gamla uppsättningen, per händelsetyp.
const MIN: Record<string, number> = {
  NEW_KING: 14, FIRST_WIN: 12, COMEBACK: 10, SAME_KING_STREAK_2: 10, SAME_KING_STREAK_3: 10, SAME_KING_STREAK_4: 6, SAME_KING_STREAK_5_PLUS: 6,
  STREAK_BREAK_SMALL: 4, STREAK_BREAK_MEDIUM: 4, STREAK_BREAK_MAJOR: 4, STREAK_BREAK_LEGENDARY: 4,
};
const PLACEHOLDER = /@\{(\w+)\}|\{(\w+)\}/g;
const ALLOWED = new Set(['winner', 'previousKing', 'previousStreakCount', 'days']);
const ECHO_ALLOWED = new Set(['winner', 'previousKing', 'lastSeason', 'lastRank', 'lastWins', 'lastChampion']);

describe.each([['riket', realm], ['galaxen', starWars]])('krönikans texter i %s', (_, theme) => {
  const { streakTemplates, nationIntros, fridayIntros } = theme.announcements;

  it('har minst dubbelt så många texter som förr, utan dubbletter', () => {
    for (const [type, min] of Object.entries(MIN)) {
      expect(streakTemplates[type].length, type).toBeGreaterThanOrEqual(min);
      expect(new Set(streakTemplates[type]).size, type).toBe(streakTemplates[type].length);
    }
    for (const intros of Object.values(nationIntros)) expect(intros.length).toBeGreaterThanOrEqual(4);
    expect(fridayIntros.length).toBeGreaterThanOrEqual(4);
  });

  it('tillbakablickarna finns i alla grupper med kända platshållare', () => {
    const echoes = theme.announcements.seasonEchoes;
    for (const group of ['champion', 'winless', 'last', 'runnerUp', 'dethronedChampion', 'generic']) {
      expect(echoes[group]?.length ?? 0, group).toBeGreaterThanOrEqual(3);
      for (const t of echoes[group]) for (const m of t.matchAll(PLACEHOLDER)) expect(ECHO_ALLOWED.has(m[1] ?? m[2]), t).toBe(true);
    }
    for (const t of echoes.generic) expect(t).toContain('{lastSeason}');
  });

  it('använder bara kända platshållare', () => {
    for (const list of Object.values(streakTemplates)) for (const t of list) {
      for (const m of t.matchAll(PLACEHOLDER)) expect(ALLOWED.has(m[1] ?? m[2]), t).toBe(true);
    }
  });

  it('nämner vinnaren i varje text och dagarna i varje comeback', () => {
    for (const list of Object.values(streakTemplates)) for (const t of list) expect(t, t).toContain('@{winner}');
    for (const t of streakTemplates.COMEBACK) expect(t).toContain('{days}');
  });
});

describe('generateAnnouncement utan förra kung', () => {
  it('nämner aldrig "den förra regenten" när tronen var tom', () => {
    for (let i = 0; i < 40; i++) {
      const a = generateAnnouncement({ eventType: 'NEW_KING', winnerName: 'Erik', previousKingName: undefined, nationState: 'STABLE_ERA' });
      expect(a.text).not.toContain('den förra regenten');
      expect(a.text).toContain('Erik');
    }
  });
});

describe('generateAnnouncement med förra kung', () => {
  it('använder aldrig raderna om den tomma tronen när någon satt på den', () => {
    const empty = [...realm.announcements.streakTemplates.NEW_KING_EMPTY].map((t) => t.replaceAll('@{winner}', 'Erik'));
    for (let i = 0; i < 60; i++) {
      const a = generateAnnouncement({ eventType: 'NEW_KING', winnerName: 'Erik', previousKingName: 'Axel', nationState: 'STABLE_ERA' });
      expect(empty.some((e) => a.text.includes(e))).toBe(false);
    }
  });
});

describe('generateAnnouncement undviker nyss använda texter', () => {
  it('väljer den enda text som inte stått i krönikan nyligen', () => {
    const variants = realm.announcements.streakTemplates.SAME_KING_STREAK_4.map((t) => t.replaceAll('@{winner}', 'Erik'));
    const recent = variants.slice(1);
    for (let i = 0; i < 20; i++) {
      const a = generateAnnouncement({ eventType: 'SAME_KING_STREAK_4', winnerName: 'Erik', nationState: 'STABLE_ERA', recentTexts: recent });
      expect(a.text.endsWith(variants[0])).toBe(true);
    }
  });
  it('faller tillbaka på hela listan när allt är nyss använt', () => {
    const variants = realm.announcements.streakTemplates.SAME_KING_STREAK_4.map((t) => t.replaceAll('@{winner}', 'Erik'));
    const a = generateAnnouncement({ eventType: 'SAME_KING_STREAK_4', winnerName: 'Erik', nationState: 'STABLE_ERA', recentTexts: variants });
    expect(variants.some((v) => a.text.endsWith(v))).toBe(true);
  });
});
