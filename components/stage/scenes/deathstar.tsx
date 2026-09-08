'use client';
import { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { Racket, lerp3 } from '../props';
import { decay, ease, kf, rng, span, warpHit } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * DÖDSSTJÄRNAN. Någon bröt fem raka eller mer: den störtades station är en vit pingisboll.
 *   0.0–2.4  Rymden: bara bollen. Så exploderar den — ett eldmoln bryter ut ur ytan.
 *   2.4–6.0  Inne i stationen: bakom en racket som flyger genom industriella schakt av balkar,
 *            rör och ljuspaneler. Laserskott bakifrån; racketen rullar undan.
 *   6.0–8.2  Framifrån: explosionen kommer ikapp bakom racketen och fyller tunneln.
 *   8.2–9.8  Elden tätt inpå, racketen precis före lågorna.
 *   9.8–     Utanför: racketen skjuter ut ur ytan, passerar kameran, och bollen sprängs bakom.
 *
 * Interiören ligger 200 enheter upp så exteriören och tunneln aldrig syns samtidigt.
 */

const CORE: Vec3 = [0, -2, -40];
const R = 14;
const EXIT: Vec3 = [0, -2, CORE[2] + R];
const IN = 200;
const BLOW1 = 1.4, TUNNEL = 2.4, FRONT = 6.0, CHASE = 8.2, OUT = 9.8, BOOM = 11.0;
const tz = (t: number) => kf(t, [[TUNNEL, 0], [OUT, -70, 'linear']]);
const dodgeX = (t: number) => Math.sin(t * 2.2) * 0.9 + Math.sin(t * 5.1) * 0.25;
const dodgeY = (t: number) => Math.cos(t * 1.7) * 0.6;
const roll = (t: number) => Math.sin(t * 3.1) * 1.3 + (t > 4.2 && t < 5.0 ? (t - 4.2) * Math.PI * 2.5 : 0);
const BOLTS = [3.0, 3.45, 3.9, 4.4, 4.9, 5.5, 6.1, 6.9, 7.6];

/** Ett skepp: en racket som flyger med bladet först, ansiktet uppåt. */
function Ship({ position, color, mood = 'grim', roll = 0, scale = 0.55 }: { position: Vec3; color: string; mood?: 'grim' | 'calm' | 'shock' | 'happy'; roll?: number; scale?: number }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, roll]} scale={scale}>
      <Racket position={[0, -1.0, 0]} color={color} mood={mood} />
      <mesh position={[0, -1.3, -0.1]}><sphereGeometry args={[0.16, 10, 10]} /><meshBasicMaterial color='#7fd0ff' toneMapped={false} /></mesh>
    </group>
  );
}

/** Ett eldmoln: ett gäng självlysande sfärer som pulserar, ljust i mitten och mörkare ytterst. */
function Fireball({ position, size, seed = 5, count = 14, t }: { position: Vec3; size: number; seed?: number; count?: number; t: number }) {
  const puffs = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => ({ o: [(r() - 0.5) * 1.6, (r() - 0.5) * 1.6, (r() - 0.5) * 1.6] as Vec3, s: 0.45 + r() * 0.6, ph: r() * 6 })); }, [seed, count]);
  if (size <= 0) return null;
  return (
    <group position={position}>
      {puffs.map((p, i) => {
        const pulse = 1 + Math.sin(t * 9 + p.ph) * 0.12;
        const inner = Math.hypot(...p.o) < 0.6;
        return <mesh key={i} position={[p.o[0] * size, p.o[1] * size, p.o[2] * size]}><sphereGeometry args={[p.s * size * pulse, 14, 14]} /><meshBasicMaterial color={inner ? '#fff2c8' : i % 3 ? '#ff7a1a' : '#ffb347'} toneMapped={false} transparent opacity={0.92} /></mesh>;
      })}
      <pointLight color='#ff8a2a' intensity={220 * size} distance={40 * size} decay={2} />
    </group>
  );
}

/** Stationens inre: en lång tunnel av balkar, rör, paneler och ljuslister. */
function Tunnel() {
  const parts = useMemo(() => {
    const r = rng(17);
    const frames = Array.from({ length: 24 }, (_, i) => 4 - i * 4);
    const strips = Array.from({ length: 48 }, () => ({ z: 6 - r() * 90, side: Math.floor(r() * 4), off: (r() - 0.5) * 4, len: 1 + r() * 3 }));
    const panels = Array.from({ length: 44 }, () => ({ z: 6 - r() * 90, side: Math.floor(r() * 4), off: (r() - 0.5) * 3.6, w: 1 + r() * 2, d: 0.3 + r() * 0.9 }));
    return { frames, strips, panels };
  }, []);
  const wallPos = (side: number, off: number, depth: number): { p: Vec3; rot: Vec3 } => {
    const h = 3.2 - depth;
    return side === 0 ? { p: [-h, off, 0], rot: [0, Math.PI / 2, 0] } : side === 1 ? { p: [h, off, 0], rot: [0, -Math.PI / 2, 0] } : side === 2 ? { p: [off, -h, 0], rot: [-Math.PI / 2, 0, 0] } : { p: [off, h, 0], rot: [Math.PI / 2, 0, 0] };
  };
  return (
    <group position={[0, IN, 0]}>
      <fog attach='fog' args={['#0c1220', 10, 70]} />
      <ambientLight intensity={0.5} color='#8fa6ff' />
      <mesh position={[0, 0, -40]}><boxGeometry args={[6.8, 6.8, 100]} /><meshStandardMaterial color='#2a3446' roughness={0.9} side={1} /></mesh>
      {parts.frames.map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[[0, 3.1, 6.4, 0.35], [0, -3.1, 6.4, 0.35], [3.1, 0, 0.35, 6.4], [-3.1, 0, 0.35, 6.4]].map(([x, y, w, h], i) => (
            <mesh key={i} position={[x, y, 0]}><boxGeometry args={[w, h, 0.4]} /><meshStandardMaterial color='#6b7a92' roughness={0.6} metalness={0.5} /></mesh>
          ))}
        </group>
      ))}
      {[[-2.6, 2.4], [2.6, 2.4], [-2.6, -2.4], [2.6, -2.4], [0, 3.0], [-1.4, -3.0]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, -40]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.18, 0.18, 100, 10]} /><meshStandardMaterial color={i % 2 ? '#8a5a3a' : '#5a6478'} roughness={0.5} metalness={0.6} /></mesh>
      ))}
      {parts.strips.map((s, i) => { const w = wallPos(s.side, s.off, 0.02); return <mesh key={i} position={[w.p[0], w.p[1], s.z]} rotation={w.rot}><boxGeometry args={[0.16, s.len, 0.05]} /><meshBasicMaterial color='#dff0ff' toneMapped={false} /></mesh>; })}
      {parts.panels.map((s, i) => { const w = wallPos(s.side, s.off, s.d / 2); return <mesh key={i} position={[w.p[0], w.p[1], s.z]} rotation={w.rot}><boxGeometry args={[s.w, s.w * 0.7, s.d]} /><meshStandardMaterial color={i % 3 ? '#54627a' : '#8a5a3a'} roughness={0.7} metalness={0.4} /></mesh>; })}
      {[-6, -18, -30, -42, -54, -66].map((z) => <pointLight key={z} position={[0, 0, z]} intensity={14} color='#cfe0ff' distance={16} decay={2} />)}
    </group>
  );
}

function Space({ flash }: { flash: number }) {
  return (
    <group>
      <ambientLight intensity={0.25} color='#8fa6ff' />
      <directionalLight position={[20, 14, 10]} intensity={2.4} color='#fff4dc' />
      <Stars radius={90} depth={40} count={3500} factor={3.5} saturation={0} fade speed={0.4} />
      {flash > 0 && <pointLight position={CORE} intensity={5000 * flash} color='#fff0c0' distance={140} decay={2} />}
    </group>
  );
}

/** Stationen: en vit pingisboll med skarv. Spricker och skingras när det smäller. */
function Station({ boom, t }: { boom: number; t: number }) {
  const shards = useMemo(() => { const r = rng(42); return Array.from({ length: 80 }, () => { const a = r() * Math.PI * 2; const b = (r() - 0.5) * Math.PI; return { dir: [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)] as Vec3, size: 1 + r() * 3.4, spin: r() * 4 }; }); }, []);
  if (boom > 0.3) {
    const d = boom - 0.3;
    return (
      <group position={CORE}>
        {shards.map((s, i) => (
          <mesh key={i} position={[s.dir[0] * (R * 0.5 + d * 16), s.dir[1] * (R * 0.5 + d * 16), s.dir[2] * (R * 0.5 + d * 16)]} rotation={[d * s.spin, d * s.spin * 0.6, 0]}>
            <dodecahedronGeometry args={[s.size, 0]} /><meshStandardMaterial color='#efe9dc' roughness={0.5} emissive='#ff8a3a' emissiveIntensity={Math.max(0, 1.4 - d * 0.5)} />
          </mesh>
        ))}
        <Fireball position={[0, 0, 0]} size={4 + d * 6} seed={9} count={22} t={t} />
      </group>
    );
  }
  return (
    <group position={CORE}>
      <mesh><sphereGeometry args={[R, 64, 64]} /><meshStandardMaterial color='#f6f1e6' roughness={0.4} emissive='#ffb060' emissiveIntensity={span(boom, 0, 0.3) * 2.5} /></mesh>
      <mesh rotation={[Math.PI / 2, 0.4, 0]}><torusGeometry args={[R + 0.02, 0.05, 8, 128]} /><meshStandardMaterial color='#d9cfb4' /></mesh>
      <mesh position={[0, 0, R]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.5, 0.5, 0.8, 24]} /><meshStandardMaterial color='#050508' roughness={1} /></mesh>
    </group>
  );
}

export const deathstar: Scene = {
  key: 'deathstar', duration: 13.8,
  warp: (t) => warpHit(t, BOOM, 0.1, 0.35, 1.0),
  words: (ctx) => [
    { at: 2.8, until: 4.4, text: 'Håll i er — nu blir det tajt!', style: 'subtitle' },
    { at: 8.4, until: 9.6, text: 'Kom igen, kom igen, kom igen…', style: 'subtitle' },
    { at: 12.5, text: `${ctx.previousStreak} RAKA SPRÄNGDA`, size: 2.0, color: '#ffb347' },
    { at: 13.1, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: 0.3, cue: 'hum' }, { at: BLOW1, cue: 'boom' }, ...BOLTS.map((at) => ({ at, cue: 'blast' as const })), { at: FRONT, cue: 'boom' }, { at: BOOM, cue: 'boom' }, { at: 12.5, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.8), span(t, 12.0, 12.5) * 0.94),
  camera: (t) => {
    if (t < TUNNEL) {
      const p = ease(span(t, 0, TUNNEL), 'out');
      return { position: lerp3([3, 1, -4], [2.2, 0.4, -7], p), lookAt: CORE, fov: 44, snap: true, shake: decay(t - BLOW1, 0.06, 0.8) };
    }
    const z = tz(t); const x = dodgeX(t); const y = dodgeY(t);
    if (t < FRONT) return { position: [x * 0.4, IN + y * 0.4 + 0.5, z + 4.4], lookAt: [x, IN + y, z - 8], fov: 62, snap: true };
    if (t < CHASE) return { position: [x * 0.3, IN + 0.3, z - 5.6], lookAt: [x, IN + y, z + 3], fov: 52, snap: true, shake: decay(t - FRONT, 0.05, 1.5) };
    if (t < OUT) return { position: [2.4, IN + 0.9, z - 2.6], lookAt: [x, IN + y, z + 4], fov: 46, snap: true, shake: 0.02 };
    return { position: [1.6, -1.2, EXIT[2] + 9.5], lookAt: [0.2, -1.8, EXIT[2] - 2], fov: 50, snap: true, shake: decay(t - BOOM, 0.3, 1.4) };
  },
  Scene: ({ t }) => {
    const inside = t >= TUNNEL && t < OUT;
    const z = tz(t); const x = dodgeX(t); const y = dodgeY(t);
    // första explosionen: ett eldmoln bryter ut ur ytan
    const blow1 = Math.max(0, t - BLOW1);
    const plume = blow1 > 0 && t < TUNNEL ? Math.min(1, blow1 / 0.9) : 0;
    // explosionen som kommer ikapp inne i tunneln
    const gap = kf(t, [[FRONT, 16], [CHASE, 4.5, 'in'], [OUT, 2.4, 'linear']]);
    const fireSize = t >= FRONT ? kf(t, [[FRONT, 0.4], [FRONT + 0.8, 2.6, 'out'], [OUT, 3.2]]) : 0;
    // utfarten: från ytan förbi kameran
    const out = span(t, OUT, OUT + 1.6);
    const outPos: Vec3 = lerp3(EXIT, [1.9, -0.6, EXIT[2] + 13], ease(out, 'in'));
    const boom = Math.max(0, t - BOOM);
    const ring = span(boom, 0, 2.4);
    return (
      <>
        {!inside && <Space flash={plume > 0 ? Math.max(0, 1 - blow1 / 1.2) * 0.6 : boom > 0 ? Math.max(0, 1 - boom / 1.6) : 0} />}
        {!inside && <Station boom={boom} t={t} />}
        {!inside && plume > 0 && <Fireball position={[EXIT[0] + 2.5, EXIT[1] + 5, EXIT[2] - 4]} size={0.6 + plume * 4.2} seed={3} count={18} t={t} />}
        {inside && <Tunnel />}
        {inside && (
          <>
            <Ship position={[x, IN + y, z]} color='#e0552b' mood={t > 7.6 ? 'shock' : 'grim'} roll={roll(t)} />
            {BOLTS.filter((b) => t >= b && t < b + 0.9).map((b) => {
              const r = rng(Math.round(b * 100));
              const bx = (r() - 0.5) * 2.4, by = (r() - 0.5) * 2.4;
              return <mesh key={b} position={[bx, IN + by, tz(b) + 12 - (t - b) * 34]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.05, 0.05, 2.4, 6]} /><meshBasicMaterial color='#ff3a3a' toneMapped={false} /></mesh>;
            })}
            {fireSize > 0 && <Fireball position={[0, IN, z + gap]} size={fireSize} seed={11} count={18} t={t} />}
            {fireSize > 0 && <Fireball position={[0.8, IN - 0.4, z + gap + 4]} size={fireSize * 1.3} seed={13} count={12} t={t} />}
          </>
        )}
        {t >= OUT && out < 1 && <Ship position={outPos} color='#e0552b' mood='happy' roll={out * 1.4} scale={0.55 + out * 0.6} />}
        {boom > 0 && (
          <group position={CORE}>
            <mesh><sphereGeometry args={[R * (1 + Math.min(boom, 0.3) * 0.5), 32, 32]} /><meshBasicMaterial color='#fff4d6' transparent opacity={Math.max(0, 0.95 - boom * 1.3)} toneMapped={false} /></mesh>
            <mesh rotation={[0.2, 0.3, 0]}><torusGeometry args={[R * 0.4 + ring * 80, 0.4 + ring * 1.0, 8, 96]} /><meshBasicMaterial color='#bfe6ff' transparent opacity={Math.max(0, 0.9 - ring)} toneMapped={false} /></mesh>
          </group>
        )}
      </>
    );
  },
};
