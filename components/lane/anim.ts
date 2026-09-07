/** Rena hjälpare för keyframad animation i banan. Allt är funktioner av tiden — ingen intern state. */

export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'back' | 'bounce' | 'elastic';

export function ease(x: number, kind: Ease = 'inOut'): number {
  const p = Math.min(1, Math.max(0, x));
  switch (kind) {
    case 'linear': return p;
    case 'in': return p * p * p;
    case 'out': return 1 - Math.pow(1 - p, 3);
    case 'back': { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
    case 'bounce': {
      const n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) { const q = p - 1.5 / d; return n * q * q + 0.75; }
      if (p < 2.5 / d) { const q = p - 2.25 / d; return n * q * q + 0.9375; }
      const q = p - 2.625 / d; return n * q * q + 0.984375;
    }
    case 'elastic': return p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
    default: return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  }
}

export type Frame = [time: number, value: number, ease?: Ease];

/** Styckvis interpolation mellan keyframes: värdet vid tiden t, hållet före första och efter sista. */
export function kf(t: number, frames: Frame[]): number {
  if (!frames.length) return 0;
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, e] = frames[i];
    if (t <= t1) {
      const [t0, v0] = frames[i - 1];
      const p = (t - t0) / (t1 - t0 || 1);
      return v0 + (v1 - v0) * ease(p, e ?? 'inOut');
    }
  }
  return frames[frames.length - 1][1];
}

/** 0 före a, 1 efter b, linjärt däremellan. */
export const span = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a || 1)));

/** Deterministisk slump så att ett klipp ser likadant ut varje bildruta. */
export function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/**
 * Kastparabel med studsar mot golvet: höjden dt sekunder efter kastet. `moving` blir false
 * när bollen studsat färdigt — då kan sidorörelsen frysas så den inte glider i evighet.
 */
export function ballistic(dt: number, y0: number, vy: number, g = 20, radius = 0.35, restitution = 0.4, maxBounces = 3): { y: number; moving: boolean } {
  if (dt <= 0) return { y: y0, moving: true };
  let y = y0, v = vy, t = dt, bounces = 0;
  while (t > 0) {
    if (y <= radius + 1e-6 && v <= 0) return { y: radius, moving: false };
    const a = -g / 2, b = v, c = y - radius;
    const disc = b * b - 4 * a * c;
    const tau = disc < 0 ? Infinity : (-b - Math.sqrt(disc)) / (2 * a);
    if (!isFinite(tau) || tau > t) return { y: y + v * t - 0.5 * g * t * t, moving: true };
    t -= tau; y = radius; v = -(v - g * tau) * restitution; bounces++;
    if (bounces >= maxBounces || Math.abs(v) < 0.6) return { y: radius, moving: false };
  }
  return { y, moving: true };
}

/** Skakning som klingar av: amplitud vid tiden t efter start. */
export const decay = (t: number, from: number, life: number) => (t < 0 || t > life ? 0 : from * (1 - t / life) * (1 - t / life));
