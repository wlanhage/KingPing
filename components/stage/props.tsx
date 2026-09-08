'use client';
import type { Vec3 } from './types';

/* ── Skådespelarna: racketar med ansikten, kåpor och ljussablar ── */

export function Plastic({ color, emissive, emissiveIntensity = 0 }: { color: string; emissive?: string; emissiveIntensity?: number }) {
  return <meshPhysicalMaterial color={color} roughness={0.32} metalness={0.05} clearcoat={0.8} clearcoatRoughness={0.2} emissive={emissive ?? '#000000'} emissiveIntensity={emissiveIntensity} />;
}

export type Mood = 'happy' | 'hope' | 'sad' | 'shock' | 'grim' | 'calm' | 'none';

/** Ett ansikte i den riktning gruppen pekar. `eyes` färgar pupillerna — gult för sithögon. */
export function Face({ mood = 'happy', scale = 1, position = [0, 0, 0] as Vec3, eyes = '#111111', glow = 0 }: { mood?: Mood; scale?: number; position?: Vec3; eyes?: string; glow?: number }) {
  if (mood === 'none') return null;
  if (mood === 'calm') {
    // slutna ögon: två tunna streck och en lugn mun
    return (
      <group position={position} scale={scale}>
        {[-0.22, 0.22].map((x) => <mesh key={x} position={[x, 0.12, 0.02]}><boxGeometry args={[0.22, 0.035, 0.03]} /><meshStandardMaterial color='#111' /></mesh>)}
        <mesh position={[0, -0.2, 0]}><torusGeometry args={[0.14, 0.03, 8, 20, Math.PI]} /><meshStandardMaterial color='#111' roughness={0.5} /></mesh>
      </group>
    );
  }
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
 * Ljussabel med spetsen ner mot golvet. Fästet sitter i handen; bladet växer ner från fästet
 * i takt med `length`. Smalt blad, ljuset flimrar som en riktig sabel.
 */
export function Saber({ length, color = '#ff2a2a', flicker = 0, position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3 }: { length: number; color?: string; flicker?: number; position?: Vec3; rotation?: Vec3 }) {
  const L = Math.max(0, length);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.16, 0]}><cylinderGeometry args={[0.045, 0.058, 0.32, 16]} /><meshStandardMaterial color='#9aa0ad' metalness={0.9} roughness={0.3} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.065, 0.065, 0.05, 16]} /><meshStandardMaterial color='#222' metalness={0.6} roughness={0.5} /></mesh>
      {L > 0.01 && (
        <group position={[0, -L / 2, 0]}>
          <mesh><cylinderGeometry args={[0.02, 0.016, L, 12]} /><meshBasicMaterial color='#fff2f2' toneMapped={false} /></mesh>
          <mesh><cylinderGeometry args={[0.042, 0.036, L, 12]} /><meshBasicMaterial color={color} transparent opacity={0.85} toneMapped={false} /></mesh>
          <mesh><cylinderGeometry args={[0.1, 0.085, L, 12]} /><meshBasicMaterial color={color} transparent opacity={0.18} toneMapped={false} /></mesh>
          <pointLight color={color} intensity={(34 + flicker * 12) * Math.min(1, L / 0.7)} distance={9} decay={2} />
        </group>
      )}
    </group>
  );
}

/** Kronan: guld med sex spetsar och en röd sten. */
export function Crown({ position = [0, 0, 0] as Vec3, scale = 1, rotation = [0, 0, 0] as Vec3 }: { position?: Vec3; scale?: number; rotation?: Vec3 }) {
  const gold = <meshStandardMaterial color='#f2c94c' emissive='#f2c94c' emissiveIntensity={0.45} metalness={0.95} roughness={0.2} />;
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.42, 0.46, 0.24, 24]} />{gold}</mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.4, 0.34, Math.sin(a) * 0.4]}><coneGeometry args={[0.09, 0.26, 8]} />{gold}</mesh>; })}
      <mesh position={[0, 0.3, 0.42]}><sphereGeometry args={[0.06, 12, 12]} /><meshStandardMaterial color='#e0304a' emissive='#e0304a' emissiveIntensity={1.2} /></mesh>
    </group>
  );
}

const ROBE = '#241b15';

/**
 * Jedimantel: en vid kåpa runt handtaget och en djup huva som omsluter bladet från sidorna,
 * bakifrån och ovanifrån, öppen framåt så ansiktet syns i skugga.
 */
function Cloak() {
  const front = Math.PI / 2;
  return (
    <group>
      <mesh position={[0, 0.55, -0.05]}><coneGeometry args={[1.05, 1.2, 32, 1, true]} /><meshStandardMaterial color={ROBE} roughness={1} side={2} /></mesh>
      <mesh position={[0, 1.08, -0.18]}><sphereGeometry args={[0.98, 32, 20, front + 1.0, Math.PI * 2 - 2.0]} /><meshStandardMaterial color={ROBE} roughness={1} side={2} /></mesh>
      <mesh position={[0, 1.22, 0.02]} rotation={[0.12, 0, 0]}><sphereGeometry args={[1.02, 32, 12, front + 0.75, Math.PI * 2 - 1.5, 0, Math.PI * 0.42]} /><meshStandardMaterial color={ROBE} roughness={1} side={2} /></mesh>
    </group>
  );
}

/**
 * En racket som står som en person: bladet vertikalt (huvudet), handtaget neråt, ansikte på
 * framsidan (+z). `hood` ger jedimanteln. `saber` ger en sabel i högerhanden, i handhöjd och
 * lätt framåtlutad så spetsen svävar strax över golvet.
 */
/**
 * Vaders utstyrsel på en racket: en svart kupolmössa som bara täcker bladets överdel så det
 * röda gummit syns, linser och andningsmask på gummit, bröstpanel med lampor, och en cape som
 * hänger bakom i stället för att gömma handtaget.
 */
function Helmet() {
  const black = <meshPhysicalMaterial color='#0b0b10' roughness={0.25} clearcoat={1} clearcoatRoughness={0.1} />;
  return (
    <group>
      {/* kupolen: sitter som en mössa på bladets överkant */}
      <mesh position={[0, 1.36, -0.02]}><sphereGeometry args={[0.8, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.36]} />{black}</mesh>
      <mesh position={[0, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.78, 0.05, 8, 40]} />{black}</mesh>
      {/* linser och mask på gummit */}
      {[-0.22, 0.22].map((x) => <mesh key={x} position={[x, 1.2, 0.09]} rotation={[0, 0, x < 0 ? 0.35 : -0.35]}><boxGeometry args={[0.26, 0.15, 0.06]} /><meshPhysicalMaterial color='#05050a' roughness={0.08} clearcoat={1} /></mesh>)}
      <mesh position={[0, 0.86, 0.09]}><coneGeometry args={[0.3, 0.42, 3]} /><meshStandardMaterial color='#1a1a22' roughness={0.5} metalness={0.4} /></mesh>
      <mesh position={[0, 0.78, 0.17]}><boxGeometry args={[0.2, 0.14, 0.04]} /><meshStandardMaterial color='#444' metalness={0.6} roughness={0.4} /></mesh>
      {/* bröstpanelen: på handtagets överdel, med lampor */}
      <mesh position={[0, 0.42, 0.1]}><boxGeometry args={[0.36, 0.22, 0.08]} /><meshStandardMaterial color='#2a2a33' metalness={0.6} roughness={0.4} /></mesh>
      <mesh position={[-0.1, 0.45, 0.15]}><boxGeometry args={[0.06, 0.06, 0.02]} /><meshBasicMaterial color='#ff3030' toneMapped={false} /></mesh>
      <mesh position={[0.06, 0.45, 0.15]}><boxGeometry args={[0.06, 0.06, 0.02]} /><meshBasicMaterial color='#40ff60' toneMapped={false} /></mesh>
      {/* capen: bara den bakre halvan, så handtaget och bladet syns framifrån */}
      <mesh position={[0, 0.95, -0.15]}><coneGeometry args={[1.05, 1.95, 28, 1, true, Math.PI / 2, Math.PI]} /><meshStandardMaterial color='#0d0d12' roughness={0.95} side={2} /></mesh>
    </group>
  );
}

export function Racket({ position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3, scale = 1, color = '#d8232a', mood = 'happy', eyes = '#111111', eyeGlow = 0, hood = false, helmet = false, arm = 0, crown = false, saber, saberColor, flicker = 0 }:
  { position?: Vec3; rotation?: Vec3; scale?: number; color?: string; mood?: Mood; eyes?: string; eyeGlow?: number; hood?: boolean; helmet?: boolean; arm?: number; crown?: boolean; saber?: number; saberColor?: string; flicker?: number }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {hood && <Cloak />}
      {helmet && <Helmet />}
      {/* kronan sitter ovanpå hjälmkupolen när det finns en, annars direkt på bladet */}
      {crown && <Crown position={helmet ? [0, 2.12, -0.05] : [0, 1.78, 0]} scale={0.8} />}
      {/* utsträckt hand: en mörk arm som växer framåt ur högersidan */}
      {arm > 0.01 && <mesh position={[0.6, 0.95, 0.15 + arm / 2]}><boxGeometry args={[0.16, 0.16, arm]} /><meshStandardMaterial color='#15151a' roughness={0.8} /></mesh>}
      {arm > 0.01 && <mesh position={[0.6, 0.95, 0.15 + arm + 0.08]}><sphereGeometry args={[0.13, 12, 12]} /><meshStandardMaterial color='#15151a' roughness={0.8} /></mesh>}
      <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.72, 0.72, 0.1, 40]} /><Plastic color={color} /></mesh>
      {/* kantbandet: torusen ligger redan i bladets plan, så den ska inte vridas som skivan */}
      <mesh position={[0, 1.05, 0]}><torusGeometry args={[0.72, 0.035, 10, 40]} /><meshStandardMaterial color='#1c1410' roughness={0.5} /></mesh>
      <mesh position={[0, 0.22, 0]}><boxGeometry args={[0.22, 0.5, 0.12]} /><meshStandardMaterial color='#b08a5a' roughness={0.6} /></mesh>
      {!helmet && <Face mood={mood} position={[0, 1.05, 0.06]} eyes={eyes} glow={eyeGlow} />}
      {saber !== undefined && <Saber length={saber} color={saberColor} flicker={flicker} position={[0.9, 0.95, 0.3]} rotation={[-0.95, 0, 0.1]} />}
    </group>
  );
}

export const lerp3 = (a: Vec3, b: Vec3, p: number): Vec3 => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
