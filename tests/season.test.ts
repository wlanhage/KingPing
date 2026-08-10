import { describe, expect, it } from 'vitest';
import { clampReignToSeason, clampedReignMs, isWinInSeason, scopePlayerToSeason, type SeasonWindow } from '../lib/domain/season';

const d = (iso: string) => new Date(iso);
const HOUR = 60 * 60 * 1000;

// Säsong 1: 1 mars – 1 juni. Säsong 2: 1 juni och framåt (pågår).
const s1: SeasonWindow = { id: '1', slug: 's1', name: 'Ett', theme: 'realm', startedAt: d('2026-03-01T00:00:00Z'), endedAt: d('2026-06-01T00:00:00Z') };
const s2: SeasonWindow = { id: '2', slug: 's2', name: 'Två', theme: 'realm', startedAt: d('2026-06-01T00:00:00Z'), endedAt: null };

describe('klampning av regeringstid', () => {
  it('regering helt inom säsongen räknas i sin helhet', () => {
    const r = { startedAt: d('2026-04-01T10:00:00Z'), endedAt: d('2026-04-01T14:00:00Z') };
    expect(clampedReignMs(r, s1)).toBe(4 * HOUR);
  });

  it('regering som börjar före säsongsstart klipps vid säsongsstart', () => {
    const r = { startedAt: d('2026-02-25T00:00:00Z'), endedAt: d('2026-03-01T06:00:00Z') };
    expect(clampedReignMs(r, s1)).toBe(6 * HOUR);
  });

  it('regering som slutar efter säsongsslut klipps vid säsongsslut', () => {
    const r = { startedAt: d('2026-05-31T18:00:00Z'), endedAt: d('2026-06-02T00:00:00Z') };
    expect(clampedReignMs(r, s1)).toBe(6 * HOUR);
  });

  it('regering helt utanför säsongen ger noll', () => {
    const before = { startedAt: d('2026-01-01T00:00:00Z'), endedAt: d('2026-01-02T00:00:00Z') };
    const after = { startedAt: d('2026-07-01T00:00:00Z'), endedAt: d('2026-07-02T00:00:00Z') };
    expect(clampedReignMs(before, s1)).toBe(0);
    expect(clampedReignMs(after, s1)).toBe(0);
    expect(clampReignToSeason(before, s1)).toBeNull();
  });

  it('en regering över säsongsgränsen räknas i BÅDA säsongerna utan att summan överstiger den verkliga längden', () => {
    // Pågår 30 maj 12:00 → 2 juni 12:00, alltså tvärs över gränsen 1 juni 00:00.
    const r = { startedAt: d('2026-05-30T12:00:00Z'), endedAt: d('2026-06-02T12:00:00Z') };
    const now = d('2026-06-10T00:00:00Z');
    const inS1 = clampedReignMs(r, s1, now);
    const inS2 = clampedReignMs(r, s2, now);
    const faktisk = r.endedAt.getTime() - r.startedAt.getTime();

    expect(inS1).toBe(36 * HOUR); // 30 maj 12:00 → 1 juni 00:00
    expect(inS2).toBe(36 * HOUR); // 1 juni 00:00 → 2 juni 12:00
    expect(inS1 + inS2).toBe(faktisk);
  });

  it('pågående regering i pågående säsong förblir öppen och räknas till nu', () => {
    const now = d('2026-06-10T12:00:00Z');
    const r = { startedAt: d('2026-06-10T06:00:00Z'), endedAt: null };
    const clamped = clampReignToSeason(r, s2, now);
    expect(clamped?.endedAt).toBeNull();
    expect(clampedReignMs(r, s2, now)).toBe(6 * HOUR);
  });

  it('pågående regering räknas INTE vidare in i en redan avslutad säsong', () => {
    // Regeringen startade i säsong 1 och är fortfarande öppen långt in i säsong 2.
    const now = d('2026-08-01T00:00:00Z');
    const r = { startedAt: d('2026-05-31T00:00:00Z'), endedAt: null };
    const clamped = clampReignToSeason(r, s1, now);
    expect(clamped?.endedAt).toEqual(s1.endedAt); // stängd vid säsongsslutet
    expect(clampedReignMs(r, s1, now)).toBe(24 * HOUR); // 31 maj → 1 juni, inte till augusti
  });
});

describe('vinster inom säsong', () => {
  it('säsongsstart är inklusive, säsongsslut exklusive', () => {
    expect(isWinInSeason(d('2026-03-01T00:00:00Z'), s1)).toBe(true);
    expect(isWinInSeason(d('2026-05-31T23:59:59Z'), s1)).toBe(true);
    expect(isWinInSeason(d('2026-06-01T00:00:00Z'), s1)).toBe(false); // tillhör säsong 2
    expect(isWinInSeason(d('2026-06-01T00:00:00Z'), s2)).toBe(true);
    expect(isWinInSeason(d('2026-02-28T23:59:59Z'), s1)).toBe(false);
  });

  it('pågående säsong har inget slut', () => {
    expect(isWinInSeason(d('2027-01-01T00:00:00Z'), s2)).toBe(true);
  });
});

describe('scopePlayerToSeason', () => {
  it('behåller bara säsongens vinster och klampade regeringar', () => {
    const now = d('2026-06-10T00:00:00Z');
    const player = {
      id: 'p1',
      wins: [
        { occurredAt: d('2026-04-01T00:00:00Z') }, // säsong 1
        { occurredAt: d('2026-06-05T00:00:00Z') }, // säsong 2
      ],
      reigns: [
        { startedAt: d('2026-04-01T00:00:00Z'), endedAt: d('2026-04-01T02:00:00Z') }, // säsong 1
        { startedAt: d('2026-06-05T00:00:00Z'), endedAt: d('2026-06-05T03:00:00Z') }, // säsong 2
      ],
    };
    const scoped = scopePlayerToSeason(player, s1, now);
    expect(scoped.wins).toHaveLength(1);
    expect(scoped.reigns).toHaveLength(1);
    expect(scoped.reigns[0].endedAt).toEqual(d('2026-04-01T02:00:00Z'));
  });
});
