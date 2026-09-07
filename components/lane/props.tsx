'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { rng } from './anim';
import { PIN_BASE, PIN_R, pinPose } from './pins';
export { PIN_BASE, PIN_R, pinPose } from './pins';
import type { Vec3 } from './types';

/* ── Rekvisita i 90-talets bowlinghall: blank plast, glada ansikten, guld ── */

export const PLASTIC = { roughness: 0.22, metalness: 0.08 };
const GOLD = '#f2c94c';

export function Crown({ position = [0, 0, 0] as Vec3, scale = 1, rotation = [0, 0, 0] as Vec3 }: { position?: Vec3; scale?: number; rotation?: Vec3 }) {
  const spikes = useMemo(() => Array.from({ length: 6 }, (_, i) => (i / 6) * Math.PI * 2), []);
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.42, 0.46, 0.24, 24]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.35} metalness={0.9} roughness={0.25} />
      </mesh>
      {spikes.map((a) => (
        <mesh key={a} position={[Math.cos(a) * 0.4, 0.34, Math.sin(a) * 0.4]}>
          <coneGeometry args={[0.09, 0.26, 8]} />
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.35} metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0.42]}>
        <sphereGeometry args={[0.06, 12, 12]} />
        <meshStandardMaterial color='#e0304a' emissive='#e0304a' emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

export type Mood = 'happy' | 'sad' | 'shock' | 'none';

/**
 * En racket som står som en kägla: bladet vertikalt, handtaget neråt, ansikte på framsidan.
 * Kronan sitter ovanpå bladet. Stenvariant för statyer.
 */
export function Racket({ position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3, scale = 1, color = '#d8232a', mood = 'happy', crown = false, stone = false, turkey = false }:
  { position?: Vec3; rotation?: Vec3; scale?: number; color?: string; mood?: Mood; crown?: boolean; stone?: boolean; turkey?: boolean }) {
  const face = stone ? '#8d8d95' : color;
  const mat = stone ? { color: '#8d8d95', roughness: 0.8, metalness: 0.05 } : { color: face, ...PLASTIC };
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* blad: platt cylinder som står upp, vänd mot kameran (+z) */}
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.1, 40]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.035, 10, 40]} />
        <meshStandardMaterial color={stone ? '#6f6f78' : '#2a1a10'} roughness={0.5} />
      </mesh>
      {/* handtag */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.22, 0.5, 0.12]} />
        <meshStandardMaterial color={stone ? '#6f6f78' : '#c9a06a'} roughness={0.6} />
      </mesh>
      {mood !== 'none' && (
        <group position={[0, 1.05, 0.06]}>
          {[-0.22, 0.22].map((x) => (
            <group key={x} position={[x, mood === 'shock' ? 0.16 : 0.12, 0]}>
              <mesh><sphereGeometry args={[mood === 'shock' ? 0.15 : 0.12, 14, 14]} /><meshStandardMaterial color='#fff' roughness={0.3} /></mesh>
              <mesh position={[0.02, mood === 'sad' ? -0.03 : 0.01, 0.1]}><sphereGeometry args={[0.055, 10, 10]} /><meshStandardMaterial color='#111' /></mesh>
            </group>
          ))}
          <mesh position={[0, mood === 'sad' ? -0.3 : -0.2, 0]} rotation={[0, 0, mood === 'sad' ? Math.PI : 0]}>
            {mood === 'shock' ? <sphereGeometry args={[0.1, 12, 12]} /> : <torusGeometry args={[0.2, 0.035, 8, 20, Math.PI]} />}
            <meshStandardMaterial color='#111' roughness={0.5} />
          </mesh>
        </group>
      )}
      {turkey && (
        <group position={[0, 1.05, 0.1]}>
          <mesh position={[0, -0.05, 0.1]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.09, 0.3, 8]} /><meshStandardMaterial color='#f5a623' /></mesh>
          <mesh position={[0.08, -0.2, 0.08]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color='#d8232a' /></mesh>
          {[-0.45, -0.25, 0, 0.25, 0.45].map((x, i) => (
            <mesh key={x} position={[x, 0.75 + (2 - Math.abs(i - 2)) * 0.12, -0.12]} rotation={[0, 0, -x * 0.9]}>
              <boxGeometry args={[0.16, 0.5, 0.04]} />
              <meshStandardMaterial color={['#8b4513', '#c0392b', '#f39c12', '#c0392b', '#8b4513'][i]} />
            </mesh>
          ))}
        </group>
      )}
      {crown && <Crown position={[0, 1.78, 0]} scale={0.8} />}
    </group>
  );
}

export function Ball({ position, radius = 0.45, glow = false, color = '#fff7e3', rotation = [0, 0, 0] as Vec3 }: { position: Vec3; radius?: number; glow?: boolean; color?: string; rotation?: Vec3 }) {
  return (
    <mesh position={position} rotation={rotation}>
      <sphereGeometry args={[radius, 28, 28]} />
      <meshStandardMaterial color={color} emissive={glow ? color : '#000'} emissiveIntensity={glow ? 0.9 : 0} {...PLASTIC} />
      {/* skarven som gör att man ser bollen snurra */}
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[radius, radius * 0.03, 6, 40]} /><meshStandardMaterial color='#e8dcc0' /></mesh>
    </mesh>
  );
}

export function Pins({ hitAt, t, cosmic, crown = false, keep = [] as number[], seed = 7, hidden = [] as number[] }: { hitAt: number; t: number; cosmic: boolean; crown?: boolean; keep?: number[]; seed?: number; hidden?: number[] }) {
  const neon = ['#ff2bd6', '#2bf0ff', '#9dff2b', '#ffd12b', '#ff6b2b'];
  return (
    <group>
      {PIN_BASE.map((_, i) => {
        if (hidden.includes(i)) return null;
        const pose = keep.includes(i) ? { position: PIN_BASE[i], rotation: [0, 0, 0] as Vec3 } : pinPose(i, t - hitAt, seed);
        return (
          <group key={i} position={pose.position} rotation={pose.rotation}>
            <Ball position={[0, 0, 0]} radius={PIN_R} glow={cosmic} color={cosmic ? neon[i % neon.length] : '#fff7e3'} />
            {crown && i === 0 && <Crown position={[0, PIN_R + 0.02, 0]} scale={0.55} />}
          </group>
        );
      })}
    </group>
  );
}

export function Pedestal({ position, height = 0.6 }: { position: Vec3; height?: number }) {
  return (
    <mesh position={[position[0], position[1] + height / 2, position[2]]}>
      <boxGeometry args={[1.4, height, 1.4]} />
      <meshStandardMaterial color='#6b6b74' roughness={0.85} />
    </mesh>
  );
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
        const on = phase < 0.09 && t - from > f.at;
        return on ? <mesh key={i} position={f.p}><sphereGeometry args={[0.16, 8, 8]} /><meshBasicMaterial color='#fff' toneMapped={false} /></mesh> : null;
      })}
    </group>
  );
}

export const vec = (x: number, y: number, z: number): Vec3 => [x, y, z];
export const lerp3 = (a: Vec3, b: Vec3, p: number): Vec3 => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
export const V = THREE.Vector3;
