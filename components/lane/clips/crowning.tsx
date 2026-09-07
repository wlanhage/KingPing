'use client';
import { Ball, Crown, DiscoBall, Flashes, Racket, Pins, lerp3 } from '../props';
import { decay, ease, kf, rng, span } from '../anim';
import type { CameraPose, Clip, Vec3 } from '../types';

export const wide = (shake = 0): CameraPose => ({ position: [0, 3.2, 7], lookAt: [0, 1, -12], fov: 48, shake });
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** STRIKE: racketen svingar, bollen träffar pyramiden, kronan seglar till vinnaren. */
export const strike: Clip = {
  key: 'strike', duration: 5.2,
  words: (ctx) => [{ at: 2.1, text: 'STRIKE!', size: 2.4 }, { at: 3.5, text: ctx.winner.toUpperCase(), size: 1.1, y: 3.7, color: '#ffffff' }],
  cues: [{ at: 2.0, cue: 'hit' }],
  camera: (t) => {
    const p = ease(span(t, 2.2, 4.2), 'inOut');
    return { position: lerp3([0, 3.2, 7], [1.8, 2.4, -3], p), lookAt: lerp3([0, 1, -12], [0.8, 1.4, -12], p), fov: 48, shake: decay(t - 2.0, 0.06, 0.5) };
  },
  Scene: ({ t, ctx }) => {
    const z = kf(t, [[0.6, 1], [2.0, -15.6, 'in']]);
    const swing = kf(t, [[0.15, 0.9], [0.55, -1.5, 'in'], [1.1, 0, 'out']]);
    const fly = span(t, 2.0, 3.3);
    const crownPos: Vec3 = [lerp(0, 2.3, fly), 2.5 + Math.sin(fly * Math.PI) * 3, lerp(-16, -8, fly)];
    return (
      <>
        <Racket position={[-1.1, 0, 2.4]} rotation={[0, 0.4, swing]} />
        {t < 2.05 && <Ball position={[0, 0.45, z]} rotation={[-z * 2.2, 0, 0]} glow={ctx.cosmic} />}
        <Pins hitAt={2.0} t={t} cosmic={ctx.cosmic} crown={t < 2.0} />
        <Racket position={[2.3, 0, -8]} rotation={[0, -0.3, 0]} color='#2b7de9' crown={fly >= 1} />
        {t >= 2.0 && fly < 1 && <Crown position={crownPos} rotation={[0, fly * 8, fly * 6]} scale={0.8} />}
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

const slowZ = (t: number) => kf(t, [[0.3, 1], [1.2, -8, 'out'], [4.5, -14.6, 'linear'], [4.8, -15.6, 'in']]);

/** ULTRARAPID: kameran klistrad på bollen i tre sekunder, sen exploderar allt i normal hastighet. */
export const slowmo: Clip = {
  key: 'slowmo', duration: 6.2,
  words: (ctx) => [{ at: 1.3, text: 'ULTRARAPID', size: 0.55, y: 1.6, color: '#ffd7f8' }, { at: 5.0, text: 'STRIKE!', size: 2.4 }, { at: 5.6, text: ctx.winner.toUpperCase(), size: 1, y: 3.8, color: '#ffffff' }],
  cues: [{ at: 4.8, cue: 'hit' }],
  camera: (t) => {
    const z = slowZ(t);
    if (t < 4.75) return { position: [0.9, 0.9, z + 1.8], lookAt: [0, 0.45, z - 2], fov: 40 };
    return wide(decay(t - 4.8, 0.05, 0.5));
  },
  Scene: ({ t, ctx }) => {
    const z = slowZ(t);
    const flare = span(t, 1.2, 1.8) * (1 - span(t, 4.3, 4.7));
    return (
      <>
        <Racket position={[-1.1, 0, 2.4]} rotation={[0, 0.4, kf(t, [[0.05, 0.9], [0.3, -1.5, 'in'], [0.9, 0, 'out']])]} />
        {t < 4.85 && <Ball position={[0, 0.45, z]} rotation={[-z * 2.2, 0, 0]} glow={ctx.cosmic} />}
        {flare > 0 && (
          <group position={[0, 0.9, z - 1.2]} rotation={[0, 0, t * 0.6]}>
            {[0, Math.PI / 2, Math.PI / 4, -Math.PI / 4].map((a) => (
              <mesh key={a} rotation={[0, 0, a]}><planeGeometry args={[4 * flare, 0.05]} /><meshBasicMaterial color='#fff7d6' transparent opacity={0.7 * flare} toneMapped={false} /></mesh>
            ))}
            <mesh><sphereGeometry args={[0.18 * flare, 10, 10]} /><meshBasicMaterial color='#fff' toneMapped={false} /></mesh>
          </group>
        )}
        <Pins hitAt={4.8} t={t} cosmic={ctx.cosmic} crown={t < 4.8} />
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};

const STOPS = [1.6, 2.6, 3.6];
const reelAngle = (t: number, i: number) => {
  const stop = STOPS[i];
  const turns = Math.round((14 * stop) / (Math.PI * 2)) * Math.PI * 2;
  return kf(t, [[0.2, 0], [stop, turns, 'out']]);
};

function Reel({ angle, x }: { angle: number; x: number }) {
  const r = 0.85;
  const symbols = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  return (
    <group position={[x, 1.7, -10]} rotation={[angle, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[r, r, 0.9, 32]} /><meshStandardMaterial color='#f4f1ea' roughness={0.35} /></mesh>
      {symbols.map((a, i) => (
        <group key={i} position={[0, Math.sin(a) * r, Math.cos(a) * r]} rotation={[-a, 0, 0]}>
          {i === 0 ? <Crown position={[0, -0.2, 0.05]} scale={0.45} /> : i === 1 ? <Ball position={[0, 0, 0.05]} radius={0.22} /> : <Racket position={[0, -0.5, 0]} scale={0.32} mood='none' />}
        </group>
      ))}
    </group>
  );
}

/** JACKPOT: tre hjul, tre kronor, sen regnar bollarna. */
export const jackpot: Clip = {
  key: 'jackpot', duration: 5.8,
  words: (ctx) => [{ at: 3.9, text: 'JACKPOT!', size: 2.2, y: 3.9, color: '#ffe066' }, { at: 4.8, text: ctx.winner.toUpperCase(), size: 1, y: 5.0, color: '#ffffff' }],
  cues: [{ at: 3.7, cue: 'siren' }],
  camera: (t) => ({ position: [0, 2.6, -3.8 + span(t, 3.7, 4.2) * -0.6], lookAt: [0, 2.0, -10], fov: 46, shake: decay(t - 3.7, 0.04, 0.6) }),
  Scene: ({ t, ctx }) => {
    const coins = rng(11);
    const rain = Array.from({ length: 34 }, () => ({ x: (coins() - 0.5) * 7, y0: 7 + coins() * 5, z: -8 - coins() * 4, v: 4 + coins() * 5 }));
    const won = t >= 3.7;
    return (
      <>
        <mesh position={[0, 1.6, -10.6]}><boxGeometry args={[4.6, 3.6, 1.4]} /><meshStandardMaterial color={ctx.cosmic ? '#2a0f5e' : '#c0392b'} roughness={0.3} /></mesh>
        <mesh position={[0, 3.6, -10.6]}><boxGeometry args={[4.9, 0.5, 1.6]} /><meshStandardMaterial color='#f2c94c' metalness={0.8} roughness={0.3} emissive='#f2c94c' emissiveIntensity={won ? 0.7 + Math.sin(t * 20) * 0.5 : 0.2} /></mesh>
        {[-1.1, 0, 1.1].map((x, i) => <Reel key={x} x={x} angle={reelAngle(t, i)} />)}
        <mesh position={[2.9, 1.6, -10]} rotation={[0, 0, kf(t, [[0.1, 0.6], [0.4, -0.6, 'in'], [0.9, 0.6, 'out']])]}><boxGeometry args={[0.16, 1.4, 0.16]} /><meshStandardMaterial color='#222' /></mesh>
        <mesh position={[2.9, 2.35, -10]}><sphereGeometry args={[0.24, 12, 12]} /><meshStandardMaterial color='#e0304a' /></mesh>
        {won && <pointLight position={[0, 4.5, -8]} color='#ff2020' intensity={40 + Math.sin(t * 22) * 40} distance={12} />}
        {won && rain.map((c, i) => {
          const y = c.y0 - c.v * (t - 3.7) - 4 * (t - 3.7) * (t - 3.7);
          return y > 0.2 ? <Ball key={i} position={[c.x, y, c.z]} radius={0.2} glow={ctx.cosmic} /> : null;
        })}
        {ctx.cosmic && <DiscoBall position={[0, 6, -6]} t={t} />}
      </>
    );
  },
};

/** RÖDA MATTAN: mattan rullas ut, racketen hoppar fram till tronen, blixtarna smattrar. */
export const redcarpet: Clip = {
  key: 'redcarpet', duration: 5.8,
  words: (ctx) => [{ at: 0.9, text: ctx.winner.toUpperCase(), size: 0.9, y: 3.6, color: '#ffffff' }, { at: 4.8, text: `${ctx.crowningWord.toUpperCase()}!`, size: 1.9 }],
  cues: [{ at: 4.6, cue: 'slam' }],
  camera: (t) => {
    const z = kf(t, [[0.8, 2.2], [4.0, -11.2, 'linear']]);
    if (t < 4.2) return { position: [2.6, 2.2, z + 4.2], lookAt: [0, 1.2, z - 3], fov: 44 };
    return { position: [0, 2.8, -6], lookAt: [0, 1.4, -12.6], fov: 46 };
  },
  Scene: ({ t, ctx }) => {
    const roll = kf(t, [[0.2, 0.01], [1.5, 1, 'out']]);
    const z = kf(t, [[0.8, 2.2], [4.0, -11.2, 'linear']]);
    const hop = t < 4.0 ? Math.abs(Math.sin(t * 7)) * 0.4 : 0;
    const sit = span(t, 4.0, 4.6);
    return (
      <>
        <mesh position={[0, 0.07, 2 - 7 * roll]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.7, 14 * roll]} /><meshStandardMaterial color='#b3121b' roughness={0.9} /></mesh>
        <mesh position={[0, 0.5, -12.6]}><boxGeometry args={[1.8, 1, 1.4]} /><meshStandardMaterial color='#f2c94c' metalness={0.8} roughness={0.35} /></mesh>
        <mesh position={[0, 1.9, -13.2]}><boxGeometry args={[1.8, 2.4, 0.3]} /><meshStandardMaterial color='#f2c94c' metalness={0.8} roughness={0.35} /></mesh>
        <mesh position={[0, 1.4, -13.0]}><boxGeometry args={[1.3, 1.1, 0.12]} /><meshStandardMaterial color='#7b0f2b' roughness={0.7} /></mesh>
        <Racket position={[0, hop + sit * 0.5, z + sit * -1.2]} rotation={[sit * -0.15, 0, Math.sin(t * 7) * 0.08 * (t < 4 ? 1 : 0)]} crown={t >= 4.6} scale={1 + sit * 0.05} />
        {t >= 4.6 && t < 4.9 && <Crown position={[0, 1.78 + (1 - span(t, 4.6, 4.9)) * 2, -12.4]} scale={0.8} />}
        <Flashes t={t} from={3.4} count={14} />
        {ctx.cosmic && <DiscoBall position={[0, 6, -8]} t={t} />}
      </>
    );
  },
};
