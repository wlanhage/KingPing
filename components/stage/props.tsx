'use client';
import type { Vec3 } from './types';

/* ── Skådespelarna: racketar med ansikten, kåpor och ljussablar ── */

export function Plastic({ color, emissive, emissiveIntensity = 0 }: { color: string; emissive?: string; emissiveIntensity?: number }) {
  return <meshPhysicalMaterial color={color} roughness={0.32} metalness={0.05} clearcoat={0.8} clearcoatRoughness={0.2} emissive={emissive ?? '#000000'} emissiveIntensity={emissiveIntensity} />;
}

export type Mood = 'happy' | 'hope' | 'sad' | 'shock' | 'grim' | 'none';

/** Ett ansikte i den riktning gruppen pekar. `eyes` färgar pupillerna — gult för sithögon. */
export function Face({ mood = 'happy', scale = 1, position = [0, 0, 0] as Vec3, eyes = '#111111', glow = 0 }: { mood?: Mood; scale?: number; position?: Vec3; eyes?: string; glow?: number }) {
  if (mood === 'none') return null;
  const big = mood === 'hope' || mood === 'shock';
  const eyeR = big ? 0.15 : 0.12;
  const pupilY = mood === 'sad' ? -0.03 : mood === 'hope' ? 0.03 : 0.01;
  return (
    <group position={position} scale={scale}>
      {[-0.22, 0.22].map((x) => (
        <group key={x} position={[x, big ? 0.15 : 0.12, 0]}>
          <mesh><sphereGeometry args={[eyeR, 14, 14]} /><meshStandardMaterial color='#fff' roughness={0.25} /></mesh>
          <mesh position={[0.02, pupilY, eyeR * 0.82]}><sphereGeometry args={[big ? 0.07 : 0.055, 10, 10]} /><meshStandardMaterial color={eyes} emissive={eyes} emissiveIntensity={glow} /></mesh>
          {mood === 'grim' && <mesh position={[x < 0 ? 0.03 : -0.03, 0.09, 0.1]} rotation={[0, 0, x < 0 ? -0.5 : 0.5]}><boxGeometry args={[0.3, 0.06, 0.03]} /><meshStandardMaterial color='#111' /></mesh>}
        </group>
      ))}
      <mesh position={[0, mood === 'sad' ? -0.3 : mood === 'grim' ? -0.24 : -0.2, 0]} rotation={[0, 0, mood === 'sad' ? Math.PI : 0]}>
        {mood === 'shock' ? <sphereGeometry args={[0.1, 12, 12]} /> : mood === 'grim' ? <boxGeometry args={[0.22, 0.04, 0.03]} /> : <torusGeometry args={[mood === 'hope' ? 0.12 : 0.2, 0.035, 8, 20, Math.PI]} />}
        <meshStandardMaterial color='#111' roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Ljussabel som hålls med spetsen mot golvet. Fästet sitter i "handen"; bladet växer ner
 * från fästet i takt med `length`. Ljuset flimrar som en riktig sabel.
 */
export function Saber({ length, color = '#ff2a2a', flicker = 0, position = [0, 0, 0] as Vec3 }: { length: number; color?: string; flicker?: number; position?: Vec3 }) {
  const L = Math.max(0, length);
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}><cylinderGeometry args={[0.055, 0.07, 0.36, 16]} /><meshStandardMaterial color='#9aa0ad' metalness={0.9} roughness={0.3} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.08, 0.08, 0.06, 16]} /><meshStandardMaterial color='#222' metalness={0.6} roughness={0.5} /></mesh>
      {L > 0.01 && (
        <group position={[0, -L / 2, 0]}>
          <mesh><cylinderGeometry args={[0.035, 0.03, L, 12]} /><meshBasicMaterial color='#fff2f2' toneMapped={false} /></mesh>
          <mesh><cylinderGeometry args={[0.075, 0.065, L, 12]} /><meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} /></mesh>
          <mesh><cylinderGeometry args={[0.16, 0.14, L, 12]} /><meshBasicMaterial color={color} transparent opacity={0.22} toneMapped={false} /></mesh>
          <pointLight color={color} intensity={(38 + flicker * 14) * Math.min(1, L / 0.8)} distance={9} decay={2} />
        </group>
      )}
    </group>
  );
}

/**
 * En racket som står som en person: bladet vertikalt, handtaget neråt, ansikte på framsidan (+z).
 * `hood` lägger en mörk kåpa bakom och över bladet. `saber` ger en sabel i högerhanden, spetsen neråt.
 */
export function Racket({ position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3, scale = 1, color = '#d8232a', mood = 'happy', eyes = '#111111', eyeGlow = 0, hood = false, saber, saberColor, flicker = 0 }:
  { position?: Vec3; rotation?: Vec3; scale?: number; color?: string; mood?: Mood; eyes?: string; eyeGlow?: number; hood?: boolean; saber?: number; saberColor?: string; flicker?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {hood && (
        <>
          <mesh position={[0, 1.0, -0.45]}><coneGeometry args={[1.05, 2.3, 28]} /><meshStandardMaterial color='#1f1c2b' roughness={0.95} /></mesh>
          <mesh position={[0, 1.42, -0.12]} rotation={[0.35, 0, 0]}><sphereGeometry args={[0.86, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color='#1f1c2b' roughness={0.95} /></mesh>
        </>
      )}
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.72, 0.72, 0.1, 40]} /><Plastic color={color} /></mesh>
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.035, 10, 40]} /><meshStandardMaterial color='#1c1410' roughness={0.5} /></mesh>
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.22, 0.5, 0.12]} /><meshStandardMaterial color='#b08a5a' roughness={0.6} /></mesh>
      <Face mood={mood} position={[0, 1.05, 0.06]} eyes={eyes} glow={eyeGlow} />
      {saber !== undefined && <Saber length={saber} color={saberColor} flicker={flicker} position={[0.95, 1.22, 0.15]} />}
    </group>
  );
}

export const lerp3 = (a: Vec3, b: Vec3, p: number): Vec3 => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
