'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { ballistic, rng, span } from './anim';
import { PIN_BASE, PIN_R, pinPose } from './pins';
import type { Vec3 } from './types';
export { PIN_BASE, PIN_R, pinPose } from './pins';

/* ── Rekvisita i 90-talets bowlinghall: blank plast med klarlack, glada ansikten, guld ── */

const GOLD = '#f2c94c';

/** Blank plast: klarlacken ger de där hårda 90-talsreflexerna. */
export function Plastic({ color, emissive, emissiveIntensity = 0 }: { color: string; emissive?: string; emissiveIntensity?: number }) {
  return <meshPhysicalMaterial color={color} roughness={0.28} metalness={0.05} clearcoat={1} clearcoatRoughness={0.12} emissive={emissive ?? '#000000'} emissiveIntensity={emissiveIntensity} />;
}

export function Crown({ position = [0, 0, 0] as Vec3, scale = 1, rotation = [0, 0, 0] as Vec3 }: { position?: Vec3; scale?: number; rotation?: Vec3 }) {
  const spikes = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2), []);
  const gold = <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.45} metalness={0.95} roughness={0.2} />;
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.42, 0.46, 0.24, 24]} />{gold}</mesh>
      {spikes.map((a) => <mesh key={a} position={[Math.cos(a) * 0.4, 0.34, Math.sin(a) * 0.4]}><coneGeometry args={[0.09, 0.26, 8]} />{gold}</mesh>)}
      <mesh position={[0, 0.3, 0.42]}><sphereGeometry args={[0.06, 12, 12]} /><meshStandardMaterial color='#e0304a' emissive='#e0304a' emissiveIntensity={1.2} /></mesh>
    </group>
  );
}

export type Mood = 'happy' | 'sad' | 'shock' | 'bored' | 'none';

/** Ett ansikte som kan sättas på vad som helst: två ögon och en mun, i den riktning gruppen pekar. */
export function Face({ mood = 'happy', scale = 1, position = [0, 0, 0] as Vec3 }: { mood?: Mood; scale?: number; position?: Vec3 }) {
  if (mood === 'none') return null;
  const lidY = mood === 'bored' ? 0.06 : 0;
  return (
    <group position={position} scale={scale}>
      {[-0.22, 0.22].map((x) => (
        <group key={x} position={[x, mood === 'shock' ? 0.16 : 0.12, 0]}>
          <mesh><sphereGeometry args={[mood === 'shock' ? 0.15 : 0.12, 14, 14]} /><meshStandardMaterial color='#fff' roughness={0.25} /></mesh>
          <mesh position={[0.02, (mood === 'sad' ? -0.03 : 0.01) - lidY, 0.1]}><sphereGeometry args={[0.055, 10, 10]} /><meshStandardMaterial color='#111' /></mesh>
          {mood === 'bored' && <mesh position={[0, 0.07, 0.08]}><boxGeometry args={[0.26, 0.09, 0.03]} /><meshStandardMaterial color='#111' /></mesh>}
        </group>
      ))}
      <mesh position={[0, mood === 'sad' ? -0.3 : mood === 'bored' ? -0.24 : -0.2, 0]} rotation={[0, 0, mood === 'sad' ? Math.PI : 0]}>
        {mood === 'shock' ? <sphereGeometry args={[0.1, 12, 12]} /> : mood === 'bored' ? <boxGeometry args={[0.26, 0.04, 0.03]} /> : <torusGeometry args={[0.2, 0.035, 8, 20, Math.PI]} />}
        <meshStandardMaterial color='#111' roughness={0.5} />
      </mesh>
    </group>
  );
}

/** En racket som står som en kägla: bladet vertikalt, handtaget neråt, ansikte på framsidan. */
export function Racket({ position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3, scale = 1, color = '#d8232a', mood = 'happy', crown = false, stone = false, turkey = false }:
  { position?: Vec3; rotation?: Vec3; scale?: number; color?: string; mood?: Mood; crown?: boolean; stone?: boolean; turkey?: boolean }) {
  const blade = stone ? <meshStandardMaterial color='#8d8d95' roughness={0.85} metalness={0.05} /> : <Plastic color={color} />;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.72, 0.72, 0.1, 40]} />{blade}</mesh>
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.035, 10, 40]} /><meshStandardMaterial color={stone ? '#6f6f78' : '#2a1a10'} roughness={0.5} /></mesh>
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.22, 0.5, 0.12]} /><meshStandardMaterial color={stone ? '#6f6f78' : '#c9a06a'} roughness={0.6} /></mesh>
      {!stone && <Face mood={mood} position={[0, 1.05, 0.06]} />}
      {turkey && (
        <group position={[0, 1.05, 0.1]}>
          <mesh position={[0, -0.05, 0.1]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.09, 0.3, 8]} /><meshStandardMaterial color='#f5a623' /></mesh>
          <mesh position={[0.08, -0.2, 0.08]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color='#d8232a' /></mesh>
          {[-0.45, -0.25, 0, 0.25, 0.45].map((x, i) => (
            <mesh key={x} position={[x, 0.75 + (2 - Math.abs(i - 2)) * 0.12, -0.12]} rotation={[0, 0, -x * 0.9]}><boxGeometry args={[0.16, 0.5, 0.04]} /><meshStandardMaterial color={['#8b4513', '#c0392b', '#f39c12', '#c0392b', '#8b4513'][i]} /></mesh>
          ))}
        </group>
      )}
      {crown && <Crown position={[0, 1.78, 0]} scale={0.8} />}
    </group>
  );
}

/** Bollen: vit klarlackad plast med en skarv som visar rotationen. `squash` klämmer den vid start/nedslag. */
export function Ball({ position, radius = 0.45, glow = false, color = '#fff7e3', rotation = [0, 0, 0] as Vec3, squash = 0, mood = 'none' }: { position: Vec3; radius?: number; glow?: boolean; color?: string; rotation?: Vec3; squash?: number; mood?: Mood }) {
  return (
    <group position={position} scale={[1 + squash * 0.35, 1 - squash * 0.3, 1 + squash * 0.35]}>
      <mesh rotation={rotation}>
        <sphereGeometry args={[radius, 32, 32]} />
        <Plastic color={color} emissive={glow ? color : undefined} emissiveIntensity={glow ? 0.9 : 0} />
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, radius * 0.035, 6, 48]} /><meshStandardMaterial color='#e2d3ad' /></mesh>
      </mesh>
      {mood !== 'none' && <Face mood={mood} scale={radius * 1.6} position={[0, 0, radius * 0.86]} />}
    </group>
  );
}

/** Fartlinjer bakom bollen: tunna ljusstreck som pekar bakåt, proportionella mot farten. */
export function SpeedLines({ position, speed, seed = 4 }: { position: Vec3; speed: number; seed?: number }) {
  const lines = useMemo(() => { const r = rng(seed); return Array.from({ length: 10 }, () => ({ x: (r() - 0.5) * 0.9, y: 0.2 + r() * 0.5, len: 0.6 + r() * 1.2, z: r() * 0.6 })); }, [seed]);
  const k = Math.min(1, speed / 14);
  if (k <= 0.05) return null;
  return (
    <group position={position}>
      {lines.map((l, i) => (
        <mesh key={i} position={[l.x, l.y, l.z + l.len * k * 0.5 + 0.4]}><boxGeometry args={[0.025, 0.025, l.len * k]} /><meshBasicMaterial color='#fff8e0' transparent opacity={0.55 * k} toneMapped={false} /></mesh>
      ))}
    </group>
  );
}

/** Slageffekt: vit blixt, en ring som expanderar och ett dammoln, allt över ~0,6 s efter träffen. */
export function Impact({ at, t, position, size = 1, color = '#fff5d6' }: { at: number; t: number; position: Vec3; size?: number; color?: string }) {
  const d = t - at;
  if (d < 0 || d > 0.7) return null;
  const flash = Math.max(0, 1 - d / 0.14);
  const ring = span(d, 0, 0.55);
  return (
    <group position={position}>
      {flash > 0 && <mesh><sphereGeometry args={[1.1 * size * (0.6 + flash), 12, 12]} /><meshBasicMaterial color={color} transparent opacity={flash * 0.9} toneMapped={false} /></mesh>}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}><torusGeometry args={[0.4 + ring * 3.2 * size, 0.06 * (1 - ring) + 0.01, 8, 40]} /><meshBasicMaterial color={color} transparent opacity={0.8 * (1 - ring)} toneMapped={false} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        const r = 0.3 + ring * 1.6 * size;
        return <mesh key={i} position={[Math.cos(a) * r, 0.25 + ring * 0.8, Math.sin(a) * r]}><sphereGeometry args={[0.18 * size * (0.5 + ring), 8, 8]} /><meshStandardMaterial color='#d9cbb0' transparent opacity={0.5 * (1 - ring)} /></mesh>;
      })}
      {flash > 0 && <pointLight color={color} intensity={120 * flash * size} distance={12} />}
    </group>
  );
}

/** Konfetti: små färgglada bitar som sprutar ut från en punkt och faller med snurr. */
export function Confetti({ at, t, position, count = 40, seed = 9, spread = 1 }: { at: number; t: number; position: Vec3; count?: number; seed?: number; spread?: number }) {
  const bits = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => ({ vx: (r() - 0.5) * 9 * spread, vz: (r() - 0.5) * 9 * spread, vy: 4 + r() * 8, spin: 6 + r() * 10, c: ['#ff2bd6', '#2bf0ff', '#ffe066', '#9dff2b', '#ff6b2b', '#ffffff'][Math.floor(r() * 6)], w: 0.12 + r() * 0.12 })); }, [count, seed, spread]);
  const d = t - at;
  if (d < 0 || d > 3.5) return null;
  return (
    <group position={position}>
      {bits.map((b, i) => {
        const { y } = ballistic(d, 0.6, b.vy, 12, 0.03, 0.1, 1);
        return <mesh key={i} position={[b.vx * Math.min(d, 1.6), y, b.vz * Math.min(d, 1.6)]} rotation={[d * b.spin, d * b.spin * 0.7, 0]}><planeGeometry args={[b.w, b.w * 1.6]} /><meshBasicMaterial color={b.c} side={THREE.DoubleSide} toneMapped={false} /></mesh>;
      })}
    </group>
  );
}

const NEON = ['#ff2bd6', '#2bf0ff', '#9dff2b', '#ffd12b', '#ff6b2b'];

/** Käglorna: tio pingisbollar i bowlinguppställning. Flyger vid hitAt; kronan sitter på ettan. */
export function Pins({ hitAt, t, cosmic, crown = false, keep = [] as number[], seed = 7, hidden = [] as number[], faces = false }: { hitAt: number; t: number; cosmic: boolean; crown?: boolean; keep?: number[]; seed?: number; hidden?: number[]; faces?: boolean }) {
  return (
    <group>
      {PIN_BASE.map((_, i) => {
        if (hidden.includes(i)) return null;
        const pose = keep.includes(i) ? { position: PIN_BASE[i], rotation: [0, 0, 0] as Vec3 } : pinPose(i, t - hitAt, seed);
        return (
          <group key={i} position={pose.position} rotation={pose.rotation}>
            <Ball position={[0, 0, 0]} radius={PIN_R} glow={cosmic} color={cosmic ? NEON[i % NEON.length] : '#fff7e3'} mood={faces && [0, 1, 2].includes(i) ? 'bored' : 'none'} />
            {crown && i === 0 && <Crown position={[0, PIN_R + 0.02, 0]} scale={0.55} />}
          </group>
        );
      })}
    </group>
  );
}

export function Pedestal({ position, height = 0.6 }: { position: Vec3; height?: number }) {
  return <mesh position={[position[0], position[1] + height / 2, position[2]]}><boxGeometry args={[1.4, height, 1.4]} /><meshStandardMaterial color='#6b6b74' roughness={0.85} /></mesh>;
}

export function DiscoBall({ position, t }: { position: Vec3; t: number }) {
  return (
    <group position={position} rotation={[0, t * 0.8, 0]}>
      <mesh><sphereGeometry args={[0.7, 14, 10]} /><meshStandardMaterial color='#dfe8ff' metalness={1} roughness={0.05} flatShading /></mesh>
      <pointLight color='#ff2bd6' intensity={30} distance={14} position={[2, -1, 0]} />
      <pointLight color='#2bf0ff' intensity={30} distance={14} position={[-2, -1, 0]} />
    </group>
  );
}

/** Fotoblixtar: vita blixtar på slumpade platser som tänds och slocknar snabbt. */
export function Flashes({ t, from, seed = 3, count = 10, area = [8, 4, 10] as Vec3, center = [0, 3, -8] as Vec3 }: { t: number; from: number; seed?: number; count?: number; area?: Vec3; center?: Vec3 }) {
  const items = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, () => ({ p: [center[0] + (r() - 0.5) * area[0], center[1] + (r() - 0.5) * area[1], center[2] + (r() - 0.5) * area[2]] as Vec3, at: r() * 2.5, period: 0.6 + r() * 1.2 })); }, [seed, count, area, center]);
  if (t < from) return null;
  return (
    <group>
      {items.map((f, i) => {
        const phase = ((t - from - f.at) % f.period + f.period) % f.period;
        return phase < 0.09 && t - from > f.at ? <mesh key={i} position={f.p}><sphereGeometry args={[0.16, 8, 8]} /><meshBasicMaterial color='#fff' toneMapped={false} /></mesh> : null;
      })}
    </group>
  );
}

export const lerp3 = (a: Vec3, b: Vec3, p: number): Vec3 => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
