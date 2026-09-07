import { describe, expect, it } from 'vitest';
import { ballistic, ease, kf } from '../components/lane/anim';
import { PIN_BASE, pinPose } from '../components/lane/pins';
import { locate, sequenceFor } from '../components/lane/sequence';

describe('anim', () => {
  it('kf håller före första och efter sista keyframen och interpolerar däremellan', () => {
    const f: [number, number, 'linear'][] = [[1, 0, 'linear'], [3, 10, 'linear']];
    expect(kf(0, f)).toBe(0); expect(kf(2, f)).toBe(5); expect(kf(9, f)).toBe(10);
  });
  it('easing börjar i 0 och slutar i 1', () => {
    for (const k of ['linear', 'in', 'out', 'inOut', 'back', 'bounce', 'elastic'] as const) { expect(ease(0, k)).toBeCloseTo(0); expect(ease(1, k)).toBeCloseTo(1); }
  });
  it('ballistic landar och stannar', () => {
    const late = ballistic(5, 0.35, 5, 20, 0.35);
    expect(late.moving).toBe(false); expect(late.y).toBeCloseTo(0.35);
    expect(ballistic(0.1, 0.35, 5).y).toBeGreaterThan(0.35);
  });
});

describe('käglor', () => {
  it('står stilla före träffen och är deterministiska efter', () => {
    expect(pinPose(3, -1).position).toEqual(PIN_BASE[3]);
    expect(pinPose(3, 0.8)).toEqual(pinPose(3, 0.8));
    expect(pinPose(3, 0.8).position[2]).toBeLessThan(PIN_BASE[3][2]); // flyger bort från kastaren
  });
});

describe('sequenceFor', () => {
  const base = { eventType: 'NEW_KING', winnerName: 'Axel', deposedName: 'Lanhage', streakCount: 1, previousStreakCount: 1, isNewRuler: true, isFriday: false, daysSinceLastWin: null };
  it('försvar väljs efter streaken', () => {
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 2 })).toEqual(['spare']);
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 3 })).toEqual(['turkey']);
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 4 })).toEqual(['hammer']);
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 7 })).toEqual(['statues']);
  });
  it('ny regent får kröning + den störtade, grövre efter bruten svit', () => {
    expect(sequenceFor({ ...base, previousStreakCount: 5 }, () => 0)).toEqual(['strike', 'split']);
    expect(sequenceFor({ ...base, previousStreakCount: 3 }, () => 0)).toEqual(['strike', 'sweeper']);
    expect(sequenceFor({ ...base, previousStreakCount: 1 }, () => 0.99)).toEqual(['redcarpet', 'crownflies']);
    expect(sequenceFor({ ...base, deposedName: null }, () => 0)).toEqual(['strike']);
  });
  it('första vinsten och comeback har egna kröningsklipp', () => {
    expect(sequenceFor({ ...base, eventType: 'FIRST_WIN' }, () => 0)[0]).toBe('bumper');
    expect(sequenceFor({ ...base, eventType: 'COMEBACK' }, () => 0)[0]).toBe('dusty');
  });
  it('locate hittar rätt klipp och lokal tid', () => {
    const clips = [{ duration: 2 }, { duration: 3 }];
    expect(locate(clips, 2.5)).toMatchObject({ index: 1, local: 0.5, total: 5 });
    expect(locate(clips, 9).clip).toBeNull();
  });
});
