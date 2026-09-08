'use client';
import { Ball, Crown, DiscoBall, Pins, Racket, PIN_BASE, PIN_R, pinPose } from '../props';
import { decay, kf, span } from '../anim';
import type { Clip, Vec3 } from '../types';

const wide = (shake = 0) => ({ position: [0, 3.2, 7] as Vec3, lookAt: [0, 1, -12] as Vec3, fov: 48, shake });

/** GUTTER: den störtades boll kryper ner i rännan, käglorna gäspar, en tumbleweed rullar förbi. */
export const gutter: Clip = {
  key: 'gutter', duration: 5.6,
  words: (ctx) => [{ at: 3.9, text: 'gutter…', style: 'sad', size: 2.2 }, ...(ctx.deposed ? [{ at: 4.5, text: ctx.deposed, style: 'name' as const, size: 0.9 }] : [])],
  cues: [{ at: 3.9, cue: 'gutter' }],
  camera: (t) => {
    const z = kf(t, [[0.5, 1.6], [4.0, -14.8, 'linear']]);
    const x = kf(t, [[0.5, 0], [2.2, 1.85, 'inOut']]);
    if (t < 3.8) return { position: [x - 0.9, 0.9, z + 2.6], lookAt: [x + 0.3, 0.3, z - 5], fov: 42 };
    return { position: [0.5, 1.4, 4.9], lookAt: [0, 0.95, 2.6], fov: 30 };
  },
  Scene: ({ t, ctx }) => {
    const z = kf(t, [[0.5, 1.6], [4.0, -14.8, 'linear']]);
    const x = kf(t, [[0.5, 0], [2.2, 1.85, 'inOut']]);
    const y = 0.45 - span(t, 1.8, 2.4) * 0.2;
    const tear = ((t * 0.8) % 1);
    const slump = span(t, 0.8, 4.2) * 0.35;
    const weedX = kf(t, [[2.6, -7], [4.6, 7, 'linear']]);
    return (
      <>
        <Racket position={[0, 0, 2.6]} rotation={[slump, 0.15, 0]} mood='sad' color='#6b7b8c' />
        <mesh position={[-0.22, 1.05 - tear * 0.6, 2.75]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color='#7fd0ff' emissive='#7fd0ff' emissiveIntensity={0.6} /></mesh>
        <Ball position={[x, y, z]} rotation={[-z * 1.4, 0, 0]} glow={ctx.cosmic} mood={t > 1.6 ? 'sad' : 'none'} />
        <Pins hitAt={99} t={t} cosmic={ctx.cosmic} faces />
        {t > 2.6 && t < 4.6 && (
          <group position={[weedX, 0.5, -10]} rotation={[0, 0, -weedX * 1.4]}>
            {[0, 1, 2].map((i) => <mesh key={i} rotation={[i * 1.05, i * 0.7, 0]}><torusGeometry args={[0.42, 0.03, 6, 14]} /><meshStandardMaterial color='#a58a55' roughness={0.9} /></mesh>)}
          </group>
        )}
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

/** KRONAN FLYGER: bollen slår kronan av den störtades huvud, den seglar i ultrarapid till vinnaren. */
export const crownflies: Clip = {
  key: 'crownflies', duration: 4.8,
  words: (ctx) => [{ at: 1.4, text: 'KRONAN BYTER HUVUD', size: 0.6, y: 3.8, color: '#ffffff' }, { at: 3.8, text: ctx.winner.toUpperCase(), size: 1.6 }],
  cues: [{ at: 1.0, cue: 'hit' }],
  camera: (t) => ({ position: [1 - span(t, 1, 3.6) * 0.6, 2.4, -1 - span(t, 1, 3.6) * 2], lookAt: [0.2, 1.6, -8.5], fov: 44, shake: decay(t - 1.0, 0.04, 0.4) }),
  Scene: ({ t, ctx }) => {
    const zb = kf(t, [[0.2, 2], [1.0, -5.3, 'in']]);
    const fly = span(t, 1.0, 3.6);
    const start: Vec3 = [-1.3, 1.9, -6]; const end: Vec3 = [1.6, 1.9, -11];
    const crownPos: Vec3 = [start[0] + (end[0] - start[0]) * fly, 1.9 + Math.sin(fly * Math.PI) * 3, start[2] + (end[2] - start[2]) * fly];
    const rock = decay(t - 1.0, 0.5, 1.2) * Math.sin((t - 1.0) * 14);
    return (
      <>
        {t < 1.05 && <Ball position={[-1.3, 0.45, zb]} rotation={[-zb * 2.2, 0, 0]} glow={ctx.cosmic} />}
        <Racket position={[-1.3, 0, -6]} rotation={[t > 1.0 ? 0.35 : 0, 0.3, rock]} color='#6b7b8c' mood={t > 1.0 ? 'shock' : 'happy'} crown={t < 1.0} />
        {t >= 1.0 && fly < 1 && <Crown position={crownPos} rotation={[0, fly * 10, fly * 7]} scale={0.8} />}
        <Racket position={[1.6, 0, -11]} rotation={[0, -0.3, 0]} color='#2b7de9' crown={fly >= 1} />
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

/** SPLITTEN: 7–10, den störtade mitt emellan, och bollen skruvar sig igenom ändå. */
export const split: Clip = {
  key: 'split', duration: 5.6,
  words: () => [{ at: 3.6, text: 'SPLIT!', size: 2.2 }, { at: 4.5, text: 'LEGENDARISKT', size: 1, y: 3.8, color: '#ffffff' }],
  cues: [{ at: 3.0, cue: 'hit' }, { at: 3.45, cue: 'hit' }],
  camera: (t) => {
    const x = kf(t, [[0.4, -1.0], [1.7, 1.5, 'inOut'], [3.0, -1.65, 'inOut']]);
    return { position: [x * 0.5, 3.0, 6], lookAt: [0, 0.8, -14], fov: 46, shake: decay(t - 3.0, 0.05, 0.4) + decay(t - 3.45, 0.06, 0.5) };
  },
  Scene: ({ t, ctx }) => {
    const zb = kf(t, [[0.4, 1], [3.0, -17.2, 'in']]);
    const xb = kf(t, [[0.4, -1.0], [1.7, 1.5, 'inOut'], [3.0, -1.65, 'inOut']]);
    const cross = span(t, 3.0, 3.45);
    const left = PIN_BASE[6]; const right = PIN_BASE[9];
    const leftPos: Vec3 = t < 3.45 ? [left[0] + 3.3 * cross, PIN_R + Math.sin(cross * Math.PI) * 0.8, left[2]] : pinPose(6, t - 3.45, 3, [right[0], PIN_R, right[2]]).position;
    const rightPose = t < 3.45 ? { position: right, rotation: [0, 0, 0] as Vec3 } : pinPose(9, t - 3.45, 9);
    const spin = t > 3.2 ? Math.min(1, (t - 3.2) / 1.2) * Math.PI * 6 : 0;
    return (
      <>
        <Racket position={[-1.1, 0, 2.4]} rotation={[0, 0.4, kf(t, [[0.1, 0.9], [0.4, -1.5, 'in'], [1.0, 0, 'out']])]} />
        {t < 3.05 && <Ball position={[xb, 0.45, zb]} rotation={[-zb * 2.2, 0, xb]} glow={ctx.cosmic} />}
        <group position={leftPos}><Ball position={[0, 0, 0]} radius={PIN_R} glow={ctx.cosmic} /></group>
        <group position={rightPose.position} rotation={rightPose.rotation}><Ball position={[0, 0, 0]} radius={PIN_R} glow={ctx.cosmic} /></group>
        <Racket position={[0, 0, -17.2]} rotation={[0, spin, 0]} color='#6b7b8c' mood={t > 3.2 ? 'shock' : 'happy'} crown scale={0.9} />
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

/** BANSOPAREN: sopmaskinen skjuter undan kronan och statyerna som skräp, nya käglor reser sig. */
export const sweeper: Clip = {
  key: 'sweeper', duration: 5.4,
  words: () => [{ at: 3.9, text: 'NY BANA', size: 1.6 }, { at: 4.5, text: 'NYTT SPEL', size: 1, y: 3.7, color: '#ffffff' }],
  cues: [{ at: 1.2, cue: 'slam' }, { at: 3.3, cue: 'crash' }],
  camera: () => ({ position: [0, 3.4, -4], lookAt: [0, 0.6, -16], fov: 46 }),
  Scene: ({ t, ctx }) => {
    const sz = kf(t, [[1.3, -12], [3.2, -19.6, 'inOut']]);
    const sy = kf(t, [[0.3, 4], [1.2, 0.35, 'out']]);
    const pushed = (z0: number) => Math.min(z0, sz - 0.6);
    const dropped = (z: number, y: number) => (z < -19.3 ? y - 9 * Math.pow(Math.max(0, (sz - -19.2) / 1), 2) : y);
    const rise = kf(t, [[3.6, -1.2], [4.6, 0, 'out']]);
    return (
      <>
        {PIN_BASE.map((_, i) => {
          const p = pinPose(i, 2.6, 21);
          const z = pushed(p.position[2]);
          return <group key={i} position={[p.position[0], dropped(z, p.position[1]), z]} rotation={p.rotation}><Ball position={[0, 0, 0]} radius={PIN_R} glow={ctx.cosmic} /></group>;
        })}
        <Crown position={[0.6, dropped(pushed(-15), 0.2), pushed(-15)]} rotation={[1.2, 0, 0.6]} scale={0.8} />
        <Racket position={[-1.2, dropped(pushed(-14), 0.12), pushed(-14)]} rotation={[-Math.PI / 2, 0, 0.3]} stone crown mood='none' scale={0.8} />
        <Racket position={[1.3, dropped(pushed(-13), 0.12), pushed(-13)]} rotation={[-Math.PI / 2, 0, -0.5]} stone crown mood='none' scale={0.8} />
        <group position={[0, sy, sz]}>
          <mesh position={[0, 0.3, 0]}><boxGeometry args={[4.2, 0.6, 0.35]} /><meshStandardMaterial color='#3b3b44' roughness={0.6} /></mesh>
          <mesh position={[0, 1.3, -0.3]}><boxGeometry args={[4.4, 1.4, 0.9]} /><meshStandardMaterial color={ctx.cosmic ? '#2a0f5e' : '#c0392b'} roughness={0.4} /></mesh>
          <mesh position={[0, 1.3, 0.16]}><boxGeometry args={[1.2, 0.3, 0.02]} /><meshBasicMaterial color='#ffe066' toneMapped={false} /></mesh>
        </group>
        {t >= 3.6 && (
          <group position={[0, rise, 0]}>
            <Pins hitAt={99} t={t} cosmic={ctx.cosmic} />
          </group>
        )}
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};
