import { describe, expect, it } from 'vitest';
import { ballistic, ease, kf, warpHit } from '../components/stage/anim';
import { SCENES, SCENE_KEYS } from '../components/stage/scenes';
import { locate, sequenceFor } from '../components/stage/sequence';
import { isStreakReturn } from '../lib/domain/stage-triggers';
import type { SceneCtx } from '../components/stage/types';

const ctx: SceneCtx = { winner: 'Axel', deposed: 'Lanhage', streak: 6, previousStreak: 5, days: 42, cosmic: false, crowningWord: 'kröning', tyrannyWord: 'Tyranni' };
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

describe('anim', () => {
  it('kf håller före första och efter sista keyframen och interpolerar däremellan', () => {
    const f: [number, number, 'linear'][] = [[1, 0, 'linear'], [3, 10, 'linear']];
    expect(kf(0, f)).toBe(0); expect(kf(2, f)).toBe(5); expect(kf(9, f)).toBe(10);
  });
  it('easing börjar i 0 och slutar i 1', () => {
    for (const k of ['linear', 'in', 'out', 'inOut', 'back', 'bounce', 'elastic'] as const) { expect(ease(0, k)).toBeCloseTo(0); expect(ease(1, k)).toBeCloseTo(1); }
  });
  it('warpHit fryser vid träffen och går sedan i ultrarapid', () => {
    expect(warpHit(1, 2)).toBe(1); expect(warpHit(2.05, 2, 0.1, 0.3, 1)).toBe(2); expect(warpHit(2.6, 2, 0.1, 0.3, 1)).toBeCloseTo(2.15); expect(warpHit(4, 2, 0.1, 0.3, 1)).toBeCloseTo(3.2);
  });
  it('ballistic landar och stannar', () => {
    expect(ballistic(5, 0.35, 5, 20, 0.35)).toMatchObject({ moving: false });
  });
});

describe('sequenceFor', () => {
  const base = { eventType: 'NEW_KING', winnerName: 'Axel', deposedName: 'Lanhage', streakCount: 1, previousStreakCount: 1, isNewRuler: true, isFriday: false, daysSinceLastWin: null, returningStreak: false, beatRival: false };
  it('försvar: exakt tre raka ger rådssalen, exakt fyra kanslerns kontor, allt annat ingen scen', () => {
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 3 })).toEqual(['temple']);
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 4 })).toEqual(['senate']);
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 5 })).toEqual([]);
    expect(sequenceFor({ ...base, isNewRuler: false, streakCount: 2 })).toEqual([]);
    expect(sequenceFor({ ...base, deposedName: null })).toEqual([]);
  });
  it('störtanden: 2–3 raka ger Mustafar, 4+ Dödsstjärnan', () => {
    expect(sequenceFor({ ...base, previousStreakCount: 2 })).toEqual(['mustafar']);
    expect(sequenceFor({ ...base, previousStreakCount: 3 })).toEqual(['mustafar']);
    expect(sequenceFor({ ...base, previousStreakCount: 4 })).toEqual(['deathstar']);
    expect(sequenceFor({ ...base, previousStreakCount: 7 })).toEqual(['deathstar']);
  });
  it('Vaders entré vid återkomst, Cloud City mot ärkefienden, slantsingling när båda gäller', () => {
    expect(sequenceFor({ ...base, previousStreakCount: 1 })).toEqual([]);
    expect(sequenceFor({ ...base, returningStreak: true })).toEqual(['tantive']);
    expect(sequenceFor({ ...base, beatRival: true })).toEqual(['cloudcity']);
    expect(sequenceFor({ ...base, returningStreak: true, beatRival: true }, () => 0.2)).toEqual(['tantive']);
    expect(sequenceFor({ ...base, returningStreak: true, beatRival: true }, () => 0.8)).toEqual(['cloudcity']);
  });
  it('locate hittar rätt scen och lokal tid', () => {
    expect(locate([{ duration: 2 }, { duration: 3 }], 2.5)).toMatchObject({ index: 1, local: 0.5, total: 5 });
    expect(locate([{ duration: 2 }], 9).item).toBeNull();
  });
});

describe('scenerna', () => {
  it.each(SCENE_KEYS)('%s: kamera, scen, ord och svärta håller genom hela tidslinjen', (key) => {
    const scene = SCENES[key];
    for (let t = 0; t <= scene.duration + 0.5; t += 0.1) {
      const cam = scene.camera(t, ctx);
      expect(cam.position.every(finite) && cam.lookAt.every(finite), `${key} kamera vid ${t.toFixed(1)}`).toBe(true);
      expect(() => scene.Scene({ t, ctx })).not.toThrow();
      const f = scene.fade?.(t) ?? 0;
      expect(f >= 0 && f <= 1, `${key} svärta vid ${t.toFixed(1)}`).toBe(true);
    }
    for (const w of scene.words(ctx)) expect(w.at).toBeLessThan(scene.duration);
    for (const c of scene.cues ?? []) expect(c.at).toBeLessThanOrEqual(scene.duration);
  });
});

describe('isStreakReturn', () => {
  // Vinsterna i tidsordning skrivs här som de hände; funktionen får dem senaste först.
  const history = (...names: string[]) => {
    const out: { winnerId: string; streakCount: number }[] = [];
    for (const n of names) { const prev = out[out.length - 1]; out.push({ winnerId: n, streakCount: prev?.winnerId === n ? prev.streakCount + 1 : 1 }); }
    return out.reverse();
  };
  it('Axel, Axel, Calle, Lanhage → Axel: ja', () => expect(isStreakReturn(history('Axel', 'Axel', 'Calle', 'Lanhage'), 'Axel')).toBe(true));
  it('Axel ×4, Lanhage → Axel: ja', () => expect(isStreakReturn(history('Axel', 'Axel', 'Axel', 'Axel', 'Lanhage'), 'Axel')).toBe(true));
  it('Axel ×3, Lanhage, Calle, Aymen → Axel: nej, tre emellan', () => expect(isStreakReturn(history('Axel', 'Axel', 'Axel', 'Lanhage', 'Calle', 'Aymen'), 'Axel')).toBe(false));
  it('Axel, Calle → Axel: nej, sviten var bara en', () => expect(isStreakReturn(history('Axel', 'Calle'), 'Axel')).toBe(false));
  it('ingen tidigare vinst: nej', () => expect(isStreakReturn(history('Calle', 'Lanhage'), 'Axel')).toBe(false));
});
