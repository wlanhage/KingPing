'use client';
import { Ball, DiscoBall, Pedestal, Pins, Racket, PIN_BASE, PIN_R } from '../props';
import { ballistic, decay, kf, rng, span } from '../anim';
import type { Clip, Vec3 } from '../types';

const wide = (shake = 0) => ({ position: [0, 3.2, 7] as Vec3, lookAt: [0, 1, -12] as Vec3, fov: 48, shake });

/** SPARE: två kast, och den sista käglan vinglar i en evighet innan den faller. */
export const spare: Clip = {
  key: 'spare', duration: 5.6,
  words: () => [{ at: 4.9, text: 'SPARE', size: 2.2 }],
  cues: [{ at: 1.6, cue: 'hit' }, { at: 3.6, cue: 'hit' }, { at: 4.75, cue: 'slam' }],
  camera: (t) => (t > 3.7 && t < 4.9 ? { position: [2.2, 1.2, -13.5], lookAt: [1.65, 0.4, -17.65], fov: 34 } : wide(decay(t - 1.6, 0.05, 0.4) + decay(t - 3.6, 0.05, 0.4))),
  Scene: ({ t, ctx }) => {
    const z1 = kf(t, [[0.3, 1], [1.6, -15.6, 'in']]);
    const z2 = kf(t, [[2.3, 1], [3.6, -16.4, 'in']]);
    const wobble = t < 3.6 ? Math.sin((t - 1.6) * 14) * 0.06 * Math.max(0, 1 - (t - 1.6)) : Math.sin((t - 3.6) * 9) * 0.32 * Math.min(1, (t - 3.6) / 0.9);
    const fallen = span(t, 4.5, 4.9);
    const last = PIN_BASE[9];
    return (
      <>
        <Racket position={[-1.1, 0, 2.4]} rotation={[0, 0.4, kf(t, [[0.05, 0.9], [0.3, -1.5, 'in'], [0.9, 0, 'out'], [2.0, 0.9], [2.3, -1.5, 'in'], [2.9, 0, 'out']])]} />
        {t < 1.65 && <Ball position={[0, 0.45, z1]} rotation={[-z1 * 2.2, 0, 0]} glow={ctx.cosmic} />}
        {t > 2.2 && t < 3.65 && <Ball position={[1.2, 0.45, z2]} rotation={[-z2 * 2.2, 0, 0]} glow={ctx.cosmic} />}
        <Pins hitAt={1.6} t={t} cosmic={ctx.cosmic} hidden={[9]} />
        <group position={[last[0], last[1], last[2]]} rotation={[fallen * 1.5, 0, wobble + fallen * 0.6]}>
          <Ball position={[0, 0, 0]} radius={PIN_R} glow={ctx.cosmic} color={ctx.cosmic ? '#ff6b2b' : '#fff7e3'} />
        </group>
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

/** TURKEY: tre kalkonracketar vaggar in, ett kast fäller alla som dominobrickor. */
export const turkey: Clip = {
  key: 'turkey', duration: 5.8,
  words: (ctx) => [{ at: 4.4, text: 'TURKEY!', size: 2.2, color: '#ffb347' }, { at: 5.0, text: `${ctx.streak} RAKA`, size: 0.9, y: 3.8, color: '#ffffff' }],
  cues: [{ at: 3.6, cue: 'hit' }],
  camera: (t) => ({ position: [0, 2.6, kf(t, [[0, 6], [2.2, -5, 'inOut']])], lookAt: [0, 1.1, -14.5], fov: 46, shake: decay(t - 3.6, 0.05, 0.6) }),
  Scene: ({ t, ctx }) => {
    const feathers = rng(5);
    const burst = Array.from({ length: 22 }, () => ({ vx: (feathers() - 0.5) * 6, vz: (feathers() - 0.5) * 4, vy: 3 + feathers() * 5, spin: feathers() * 10 }));
    const zb = kf(t, [[2.5, 1], [3.6, -13.6, 'in']]);
    return (
      <>
        {[1, 0, -1].map((x, i) => {
          const walking = t < 2.0 + i * 0.25;
          const px = kf(t, [[0.2 + i * 0.25, 6], [2.0 + i * 0.25, x, 'linear']]);
          const topple = kf(t, [[3.6 + i * 0.25, 0], [4.05 + i * 0.25, -1.5, 'in']]);
          return <Racket key={x} position={[px, 0, -14.5]} rotation={[topple, 0, walking ? Math.sin(t * 10 + i) * 0.16 : 0]} color='#8b5a2b' turkey mood={t > 3.5 ? 'shock' : 'happy'} />;
        })}
        {t > 2.4 && t < 3.65 && <Ball position={[0, 0.45, zb]} rotation={[-zb * 2.2, 0, 0]} glow={ctx.cosmic} />}
        {t >= 3.6 && burst.map((f, i) => {
          const dt = t - 3.6;
          const { y, moving } = ballistic(dt, 1.4, f.vy, 14, 0.05, 0.2);
          const tr = moving ? dt : 1;
          return <mesh key={i} position={[f.vx * tr, y, -14.5 + f.vz * tr]} rotation={[dt * f.spin, 0, dt * f.spin * 0.5]}><boxGeometry args={[0.16, 0.36, 0.03]} /><meshStandardMaterial color={['#c0392b', '#f39c12', '#8b4513'][i % 3]} /></mesh>;
        })}
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

/** HAMMAREN: en jätteracket kommer ner som en slägga, banan spricker, skärmen skakar. */
export const hammer: Clip = {
  key: 'hammer', duration: 5.2,
  words: (ctx) => [{ at: 1.8, text: 'HAMMAREN', size: 2.2 }, { at: 3.3, text: `${ctx.streak} RAKA`, size: 1, y: 3.8, color: '#ffffff' }],
  cues: [{ at: 1.5, cue: 'crash' }],
  camera: (t) => ({ position: [0, 2.4, 6], lookAt: [0, 1.6, -14], fov: 50, shake: decay(t - 1.5, 0.14, 0.9) }),
  Scene: ({ t, ctx }) => {
    const tilt = kf(t, [[0.3, 1.2], [1.1, 1.4, 'out'], [1.5, -1.35, 'in']]);
    const crack = span(t, 1.5, 1.9);
    return (
      <>
        <group position={[0, 0, -13.5]} rotation={[tilt, 0, 0]}>
          <Racket position={[0, 0, 0]} scale={4} color='#2b2b33' mood='none' />
        </group>
        <Pins hitAt={1.5} t={t} cosmic={ctx.cosmic} seed={13} />
        {crack > 0 && Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2 + 0.3;
          const len = (1.5 + (i % 3)) * crack;
          return <mesh key={i} position={[Math.cos(a) * len * 0.5, 0.07, -16.5 + Math.sin(a) * len * 0.5]} rotation={[0, -a, 0]}><boxGeometry args={[len, 0.02, 0.07]} /><meshBasicMaterial color='#120a14' /></mesh>;
        })}
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

/** STATYHALLEN: en marmorstaty per raka reser sig, kameran backar och avslöjar hela hallen. */
export const statues: Clip = {
  key: 'statues', duration: 6.4,
  words: (ctx) => [{ at: 4.6, text: ctx.tyrannyWord.toUpperCase(), size: 1.8, y: 3.3 }, { at: 5.4, text: `${ctx.streak} RAKA`, size: 0.9, y: 4.4, color: '#ffffff' }],
  cues: [{ at: 0.4, cue: 'slam' }, { at: 1.1, cue: 'slam' }, { at: 1.8, cue: 'slam' }],
  camera: (t) => {
    const p = span(t, 2.5, 5.5);
    const e = p * p * (3 - 2 * p);
    return { position: [3.4 + (0 - 3.4) * e, 1.8 + (5.5 - 1.8) * e, -1 + (9 + 1) * e], lookAt: [2.6 * (1 - e), 1.2, -3 + (-10 + 3) * e], fov: 46 };
  },
  Scene: ({ t, ctx }) => {
    const n = Math.min(Math.max(ctx.streak, 5), 8);
    return (
      <>
        {Array.from({ length: n }, (_, i) => {
          const x = i % 2 === 0 ? 2.6 : -2.6;
          const z = -3 - i * 2.2;
          const y = kf(t, [[0.3 + i * 0.35, -3.2], [1.1 + i * 0.35, 0, 'out']]);
          return (
            <group key={i} position={[x, y, z]}>
              <Pedestal position={[0, 0, 0]} />
              <Racket position={[0, 0.6, 0]} rotation={[0, x > 0 ? -0.5 : 0.5, 0]} stone crown mood='none' scale={1.1} />
            </group>
          );
        })}
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};
