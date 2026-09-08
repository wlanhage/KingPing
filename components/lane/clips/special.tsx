'use client';
import { Ball, Confetti, DiscoBall, Impact, Pins, Racket, SpeedLines } from '../props';
import { decay, kf, rng, span, warpHit } from '../anim';
import type { Clip, Vec3 } from '../types';

const wide = (shake = 0) => ({ position: [0, 3.2, 7] as Vec3, lookAt: [0, 1, -12] as Vec3, fov: 48, shake });
const BOUNCES = [1.3, 1.8, 2.3, 2.8, 3.2];

/** BUMPER BOWLING: kantskydden fälls upp, bollen studsar sicksack mellan dem med kameran bakom, och träffar ändå. */
const BH = 3.4;
const bumperZ = (s: number) => kf(s, [[0.9, 1.6], [BH, -15.6, 'linear']]);
const bumperX = (s: number) => kf(s, [[0.9, 0], [1.3, 1.3, 'out'], [1.8, -1.3, 'inOut'], [2.3, 1.3, 'inOut'], [2.8, -1.3, 'inOut'], [3.2, 0.6, 'inOut'], [BH, 0, 'out']]);
export const bumper: Clip = {
  key: 'bumper', duration: 6.2,
  warp: (t) => warpHit(t, BH, 0.1, 0.35, 0.6),
  words: (ctx) => [{ at: 3.55, text: 'NYBÖRJARTUR', style: 'blink', size: 1.7, color: '#9dff2b' }, { at: 4.4, text: 'STRIKE!', size: 2 }, { at: 5.0, text: ctx.winner, style: 'name', size: 1 }],
  cues: [...BOUNCES.map((at) => ({ at, cue: 'slam' as const })), { at: BH, cue: 'hit' }],
  camera: (s) => {
    if (s < BH) { const z = bumperZ(s); const x = bumperX(s); return { position: [x * 0.4, 1.2, z + 3.4], lookAt: [x * 0.6, 0.5, z - 4], fov: 52 }; }
    const kick = decay(s - BH, 1, 0.6);
    return { position: [0, 3.0, 5], lookAt: [0, 0.9, -13], fov: 46 - kick * 8, shake: kick * 0.1 };
  },
  Scene: ({ t: s, ctx }) => {
    const up = kf(s, [[0.2, 0.01], [0.8, 1, 'bounce']]);
    const z = bumperZ(s); const x = bumperX(s);
    const speed = s > 0.9 && s < BH ? 11 : 0;
    const flash = (side: number) => BOUNCES.some((b, i) => Math.abs(s - b) < 0.12 && (i % 2 === 0 ? 1 : -1) === side);
    const dance = s > BH ? Math.sin(s * 12) * 0.25 : 0;
    return (
      <>
        <Racket position={[-1.0, 0, 2.6]} rotation={[0, 0.35, kf(s, [[0.4, 0.2], [0.75, 1.2, 'inOut'], [0.95, -1.6, 'in'], [1.5, 0, 'out']]) + dance]} color='#2ecc71' />
        {[1, -1].map((side) => (
          <mesh key={side} position={[side * 1.55, 0.3 * up, -8]} scale={[1, up, 1]}>
            <boxGeometry args={[0.24, 0.6, 24]} />
            <meshStandardMaterial color={ctx.cosmic ? '#2bf0ff' : '#f2c94c'} emissive={ctx.cosmic ? '#2bf0ff' : '#f2c94c'} emissiveIntensity={flash(side) ? 3 : 0.3} />
          </mesh>
        ))}
        {BOUNCES.map((b, i) => <Impact key={b} at={b} t={s} position={[(i % 2 === 0 ? 1 : -1) * 1.42, 0.45, bumperZ(b)]} size={0.35} color={ctx.cosmic ? '#2bf0ff' : '#ffe066'} />)}
        {s < BH + 0.05 && <group><Ball position={[x, 0.45, z]} rotation={[-z * 2.4, 0, x * 2]} glow={ctx.cosmic} squash={s > 0.85 && s < 1.05 ? Math.sin(span(s, 0.85, 1.05) * Math.PI) * 0.5 : 0} /><SpeedLines position={[x, 0, z]} speed={speed} /></group>}
        <Pins hitAt={BH} t={s} cosmic={ctx.cosmic} crown={s < BH} seed={17} />
        <Impact at={BH} t={s} position={[0, 0.4, -16.2]} size={1.3} />
        <Confetti at={BH} t={s} position={[0, 0.6, -16.3]} count={50} />
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={s} />}
      </>
    );
  },
};

/** DAMMIGA BOLLEN: ner från hyllan, bort med dammet, och så ett strike efter alla dagar i exil. */
export const dusty: Clip = {
  key: 'dusty', duration: 6.2,
  words: (ctx) => [...(ctx.days ? [{ at: 0.8, text: `${ctx.days} DAGAR`, size: 0.9, y: 3.8, color: '#cfd8dc' }] : []), { at: 5.0, text: 'COMEBACK', size: 2 }],
  cues: [{ at: 4.8, cue: 'hit' }],
  camera: (t) => (t < 3.4 ? { position: [3.2, 2.2, 0.5], lookAt: [2.4, 1.6, -3], fov: 40 } : wide(decay(t - 4.8, 0.05, 0.5))),
  Scene: ({ t, ctx }) => {
    const dust = rng(23);
    const motes = Array.from({ length: 30 }, () => ({ a: dust() * Math.PI * 2, b: (dust() - 0.5) * Math.PI, r: 0.55 + dust() * 0.3, s: 0.02 + dust() * 0.03 }));
    const hand = kf(t, [[0.4, 7], [1.6, 3.3, 'out']]);
    const by = kf(t, [[1.6, 1.99], [2.2, 2.7, 'out'], [3.4, 0.45, 'in']]);
    const bx = kf(t, [[2.8, 2.6], [3.4, 0, 'inOut']]);
    const bz = kf(t, [[2.8, -3], [3.4, -1, 'inOut'], [3.6, -1], [4.8, -15.6, 'in']]);
    const blow = span(t, 2.2, 2.9);
    const web = 1 - span(t, 2.0, 2.4);
    return (
      <>
        <mesh position={[2.6, 1.5, -3]}><boxGeometry args={[1.5, 0.08, 0.9]} /><meshStandardMaterial color='#6b4a2b' roughness={0.8} /></mesh>
        <mesh position={[2.6, 0.75, -3.4]}><boxGeometry args={[0.12, 1.5, 0.12]} /><meshStandardMaterial color='#6b4a2b' roughness={0.8} /></mesh>
        {web > 0 && [0, 0.5, 1.0, 1.5, 2.0].map((a) => (
          <mesh key={a} position={[2.6 + Math.cos(a) * 0.4 * web, 2.0 + Math.sin(a) * 0.25 * web, -3.2]} rotation={[0, 0, a]}><boxGeometry args={[0.8 * web, 0.008, 0.008]} /><meshBasicMaterial color='#d9d9d9' transparent opacity={0.6 * web} /></mesh>
        ))}
        {blow < 1 && motes.map((m, i) => {
          const r = m.r + blow * 3;
          return <mesh key={i} position={[bx + Math.cos(m.a) * Math.cos(m.b) * r, by + Math.sin(m.b) * r - blow * 1.5, bz + Math.sin(m.a) * Math.cos(m.b) * r]}><sphereGeometry args={[m.s, 6, 6]} /><meshBasicMaterial color='#a8a8a8' transparent opacity={0.8 * (1 - blow)} /></mesh>;
        })}
        {t < 3.6 && <Racket position={[hand, 0.4, -2.4]} rotation={[0, -0.6, 0.5]} mood='happy' scale={0.9} />}
        <Ball position={[bx, by, bz]} rotation={[t > 3.6 ? -bz * 2.2 : 0, 0, 0]} glow={ctx.cosmic} color={blow < 1 ? '#cfc9b8' : '#fff7e3'} />
        <Pins hitAt={4.8} t={t} cosmic={ctx.cosmic} crown={t < 4.8} seed={29} />
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

/** POÄNGPROTOKOLLET: en tom hall bakom — själva protokollet ritas som DOM-lager av LaneShow. */
export const scoreboard: Clip = {
  key: 'scoreboard', duration: 7.6,
  words: () => [],
  cues: [{ at: 5.3, cue: 'slam' }],
  camera: () => ({ position: [0, 2.4, 4], lookAt: [0, 1.2, -14], fov: 50 }),
  Scene: ({ t, ctx }) => (
    <>
      <Pins hitAt={99} t={t} cosmic={ctx.cosmic} />
      {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
    </>
  ),
};

export const DEMO_FRAMES = ['X', '7/', 'X', 'X', '9-', 'X', 'X', '8/', 'X', 'XXX'];
