'use client';
import { useMemo } from 'react';
import { Stars } from '@react-three/drei';
import { Racket, lerp3 } from '../props';
import { decay, ease, kf, rng, span, warpHit } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * DÖDSSTJÄRNAN. Någon bröt fem raka eller mer: den störtades station är en jättepingisboll
 * med ett hål, skeppen är racketar.
 *   0.0–2.6  Rymden: bollen fyller bilden, små racketar närmar sig. "Använd kraften, {vinnare}."
 *   2.6–6.4  Rännan: bakom vinnaren som flyger längs ytan, jagad av mörka racketar som skjuter.
 *   6.4–7.2  Nära vinnaren: ögonen sluts. Två bollar avfyras.
 *   7.2–9.0  Bollarna in i hålet. Vinnaren drar uppåt, den störtade tumlar bort. "Vad?!"
 *   9.0      BOOM: hit-stop, ultrarapid, bollen spricker i skärvor och en ring rullar ut.
 */

const CORE: Vec3 = [0, -6, -30];
const R = 14;
const HOLE: Vec3 = [0, -6, CORE[2] + R];
const FIRE = 6.6, IMPACT = 7.0, BOOM = 9.0;
const shipZ = (t: number) => kf(t, [[0, 6], [2.6, 0, 'linear'], [7.2, -13.2, 'linear']]);
const shipX = (t: number) => Math.sin(t * 1.9) * 0.35;

/** Ett skepp: en racket som flyger med bladet först, ansiktet uppåt. */
function Ship({ position, color, mood = 'grim', roll = 0, scale = 0.55, crown = false }: { position: Vec3; color: string; mood?: 'grim' | 'calm' | 'shock' | 'none'; roll?: number; scale?: number; crown?: boolean }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, roll]} scale={scale}>
      <Racket position={[0, -1.0, 0]} color={color} mood={mood} crown={crown} />
      <mesh position={[0, -1.3, -0.1]}><sphereGeometry args={[0.14, 10, 10]} /><meshBasicMaterial color='#7fd0ff' toneMapped={false} /></mesh>
    </group>
  );
}

function Space({ boom }: { boom: number }) {
  return (
    <group>
      <ambientLight intensity={0.25} color='#8fa6ff' />
      <directionalLight position={[20, 14, 10]} intensity={2.2} color='#fff4dc' />
      <pointLight position={[0, -2, -8]} intensity={40} color='#9fc0ff' distance={30} decay={2} />
      <Stars radius={90} depth={40} count={3500} factor={3.5} saturation={0} fade speed={0.4} />
      {boom > 0 && <pointLight position={CORE} intensity={4000 * Math.max(0, 1 - boom / 1.6)} color='#fff0c0' distance={120} decay={2} />}
    </group>
  );
}

/** Stationen: en jättepingisboll med skarv, en mörk ränna och hålet. Spricker och skingras när det smäller. */
function Station({ boom }: { boom: number }) {
  const shards = useMemo(() => { const r = rng(42); return Array.from({ length: 70 }, () => { const a = r() * Math.PI * 2; const b = (r() - 0.5) * Math.PI; return { dir: [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)] as Vec3, size: 1 + r() * 3.2, spin: r() * 4 }; }); }, []);
  if (boom > 0.35) {
    const d = boom - 0.35;
    return (
      <group position={CORE}>
        {shards.map((s, i) => (
          <mesh key={i} position={[s.dir[0] * (R * 0.6 + d * 14), s.dir[1] * (R * 0.6 + d * 14), s.dir[2] * (R * 0.6 + d * 14)]} rotation={[d * s.spin, d * s.spin * 0.6, 0]}>
            <dodecahedronGeometry args={[s.size, 0]} /><meshStandardMaterial color='#efe9dc' roughness={0.5} emissive='#ff8a3a' emissiveIntensity={Math.max(0, 1.2 - d * 0.5)} />
          </mesh>
        ))}
      </group>
    );
  }
  const crack = span(boom, 0, 0.35);
  return (
    <group position={CORE}>
      <mesh><sphereGeometry args={[R, 64, 64]} /><meshStandardMaterial color='#f4efe3' roughness={0.45} emissive='#ffb060' emissiveIntensity={crack * 2.5} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[R + 0.02, 0.05, 8, 128]} /><meshStandardMaterial color='#d9cfb4' /></mesh>
      {/* rännan tvärs över ytan och hålet i mitten av den */}
      <mesh position={[0, 0, R - 0.15]}><boxGeometry args={[26, 0.5, 0.5]} /><meshStandardMaterial color='#6a6a70' roughness={0.9} /></mesh>
      <mesh position={[0, 0, R]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.32, 0.32, 0.8, 24]} /><meshStandardMaterial color='#050508' roughness={1} /></mesh>
      <mesh position={[0, 0, R + 0.02]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.36, 0.04, 8, 32]} /><meshBasicMaterial color='#ff6a3a' toneMapped={false} /></mesh>
    </group>
  );
}

export const deathstar: Scene = {
  key: 'deathstar', duration: 13.6,
  warp: (t) => warpHit(t, BOOM, 0.12, 0.35, 1.2),
  words: (ctx) => [
    { at: 1.0, until: 2.8, text: `Använd kraften, ${ctx.winner}.`, style: 'subtitle' },
    { at: 4.2, until: 5.6, text: 'Kraften är stark i den här.', style: 'subtitle' },
    { at: 8.0, until: 8.9, text: 'Vad?!', style: 'subtitle' },
    { at: 12.3, text: 'ANVÄND KRAFTEN', size: 2.2, color: '#9fe0ff' },
    { at: 12.9, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: 0.3, cue: 'hum' }, { at: 3.4, cue: 'blast' }, { at: 4.6, cue: 'blast' }, { at: 5.7, cue: 'blast' }, { at: FIRE, cue: 'slam' }, { at: IMPACT, cue: 'smash' }, { at: BOOM, cue: 'boom' }, { at: 12.3, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.8), span(t, 11.7, 12.2) * 0.94),
  camera: (t) => {
    if (t < 2.6) {
      const p = ease(span(t, 0, 2.6), 'out');
      return { position: lerp3([1.5, -1.5, 13], [0.8, -2.2, 10.5], p), lookAt: [0, -6, -22], fov: 46, snap: true };
    }
    if (t < 6.4) { const z = shipZ(t); return { position: [shipX(t) * 0.5, -4.5, z + 3.8], lookAt: [0, -5.8, z - 7], fov: 56, snap: true }; }
    if (t < 7.2) { const z = shipZ(t); return { position: [1.5, -4.6, z + 1.7], lookAt: [shipX(t), -5.3, z], fov: 34, snap: true }; }
    if (t < BOOM) return { position: [2.2, -4.6, -11.4], lookAt: [0, -6, HOLE[2]], fov: 40, snap: true };
    const p = ease(span(t, BOOM, 12), 'out');
    return { position: lerp3([9, 1, 8], [12, 3, 12], p), lookAt: CORE, fov: 52, snap: true, shake: decay(t - BOOM, 0.25, 1.2) };
  },
  Scene: ({ t }) => {
    const z = shipZ(t); const x = shipX(t);
    const pullUp = span(t, 7.2, 9.0);
    const winner: Vec3 = t < 7.2 ? [x, -5.3, z] : [x + pullUp * 2, -5.3 + pullUp * 9, z - pullUp * 6];
    const tumble = span(t, 7.6, 9.6);
    const chaser: Vec3 = t < 7.6 ? [x * 0.5 + 0.9, -5.1, z + 3.2] : [0.9 + tumble * 7, -5.1 + tumble * 4, z + 3.2 + tumble * 5];
    const chaser2: Vec3 = [x * 0.5 - 1.0, -5.4, Math.min(z + 5.2, -8)];
    const bolts = [3.4, 4.6, 5.7].filter((b) => t >= b && t < b + 0.5).map((b) => ({ p: [chaser[0] - 0.3, chaser[1] - 0.1, chaser[2] - (t - b) * 40] as Vec3, key: b }));
    const fire = span(t, FIRE, IMPACT);
    const boom = Math.max(0, t - BOOM);
    const ring = span(boom, 0, 2.4);
    return (
      <>
        <Space boom={boom} />
        <Station boom={boom} />
        {/* vinnaren flyger rännan, jagad; ögonen sluts inför skottet */}
        <Ship position={winner} color='#e0552b' mood={t > 6.3 && t < 7.4 ? 'calm' : 'grim'} roll={x * 0.8 + pullUp * 0.6} />
        <Ship position={chaser} color='#2f2f38' mood={tumble > 0 ? 'shock' : 'grim'} roll={tumble * 9} crown scale={0.6} />
        {t < 8.5 && <Ship position={chaser2} color='#3a3a44' mood='none' scale={0.5} roll={-0.3} />}
        {bolts.map((b) => <mesh key={b.key} position={b.p} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 1.6, 6]} /><meshBasicMaterial color='#ff3a3a' toneMapped={false} /></mesh>)}
        {/* två bollar mot hålet */}
        {t >= FIRE && t < IMPACT && [-0.18, 0.18].map((dx) => (
          <mesh key={dx} position={lerp3([x + dx, -5.3, z], HOLE, fire)}><sphereGeometry args={[0.14, 14, 14]} /><meshStandardMaterial color='#fff7e3' emissive='#ffffff' emissiveIntensity={0.5} /></mesh>
        ))}
        {boom > 0 && (
          <group position={CORE}>
            <mesh><sphereGeometry args={[R * (1 + Math.min(boom, 0.35) * 0.4), 32, 32]} /><meshBasicMaterial color='#fff4d6' transparent opacity={Math.max(0, 0.9 - boom * 1.2)} toneMapped={false} /></mesh>
            <mesh rotation={[0.3, 0.2, 0]}><torusGeometry args={[R * 0.3 + ring * 70, 0.35 + ring * 0.8, 8, 96]} /><meshBasicMaterial color='#bfe6ff' transparent opacity={Math.max(0, 0.9 - ring)} toneMapped={false} /></mesh>
          </group>
        )}
      </>
    );
  },
};
