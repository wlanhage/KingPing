import { describe, expect, it } from 'vitest';
import { CLIPS, CLIP_KEYS } from '../components/lane/clips';
import type { ClipCtx } from '../components/lane/types';

const ctx: ClipCtx = { winner: 'Axel', deposed: 'Lanhage', streak: 6, previousStreak: 5, days: 42, cosmic: false, crowningWord: 'kröning', tyrannyWord: 'Tyranni' };
const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);

describe('banans klipp', () => {
  it.each(CLIP_KEYS)('%s: kamera och scen håller genom hela tidslinjen', (key) => {
    const clip = CLIPS[key];
    expect(clip.duration).toBeGreaterThan(3);
    for (let t = 0; t <= clip.duration + 0.5; t += 0.1) {
      const cam = clip.camera(t, ctx);
      expect(cam.position.every(finite) && cam.lookAt.every(finite), `${key} kamera vid ${t.toFixed(1)}`).toBe(true);
      // Scen-funktionerna använder inga hooks, så de kan anropas rakt av; kastar de blir testet rött.
      expect(() => clip.Scene({ t, ctx: { ...ctx, cosmic: t > clip.duration / 2 } })).not.toThrow();
    }
    for (const w of clip.words(ctx)) { expect(w.at).toBeLessThan(clip.duration); expect(w.text.length).toBeGreaterThan(0); }
    for (const c of clip.cues ?? []) expect(c.at).toBeLessThanOrEqual(clip.duration);
  });
});
