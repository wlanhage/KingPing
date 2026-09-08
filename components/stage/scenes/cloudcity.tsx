'use client';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Crown, Racket, lerp3 } from '../props';
import { ease, kf, span } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * CLOUD CITY. En vanlig kröning: den störtade hänger från antennen över reaktorschaktet,
 * vinnaren i svart hjälm sträcker ut handen.
 *   0.0–2.4  Underifrån ur schaktet: plattformen, antennen, den hängande, vinnaren ovanför.
 *   2.4–4.6  Vinnaren, sabeln släcks, handen sträcks ut. "{störtad}, jag är din far."
 *   4.6–6.6  Den störtade, nära. "Nej… Det är inte sant!"  NEEEEJ!
 *   6.6–8.4  Han släpper och faller ner i schaktet. Kronan flyger av och landar i vinnarens hand.
 *   8.4–10.6 Vinnaren vid kanten ser ner, kronan på. Vinden.
 */

const TIP: Vec3 = [0, 0.35, -4.8];
const HANG: Vec3 = [0, -1.85, 0];
const VADER: Vec3 = [0, 0, -1.6];
const LETGO = 6.6;

function Shaft() {
  return (
    <group>
      <fog attach='fog' args={['#0d1220', 8, 55]} />
      <ambientLight intensity={0.18} color='#8fa6ff' />
      <pointLight position={[0, -22, -4]} intensity={900} color='#cfe0ff' distance={60} decay={2} />
      <spotLight position={[3, 7, 3]} angle={0.7} penumbra={0.9} intensity={70} color='#ffd8b0' />
      <pointLight position={[-4, 2.5, -2]} intensity={25} color='#ff9a3a' distance={14} decay={2} />
      {/* schaktet: en jättecylinder sedd inifrån, med ljusringar neråt */}
      <mesh position={[0, -30, -4]}><cylinderGeometry args={[10, 10, 90, 48, 1, true]} /><meshStandardMaterial color='#1b2230' roughness={0.9} side={THREE.BackSide} /></mesh>
      {[-3, -9, -16, -24, -33, -43].map((y, i) => (
        <mesh key={y} position={[0, y, -4]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[9.8, 0.08, 8, 64]} /><meshBasicMaterial color={i % 2 ? '#ff9a3a' : '#6fa8ff'} toneMapped={false} /></mesh>
      ))}
      {/* plattformen med antennen ut över tomrummet */}
      <mesh position={[0, -0.25, 0]}><cylinderGeometry args={[3.4, 3.6, 0.5, 48, 1, false, Math.PI * 0.35, Math.PI * 1.3]} /><meshStandardMaterial color='#2a3040' roughness={0.7} metalness={0.3} /></mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[3.45, 0.05, 8, 64]} /><meshBasicMaterial color='#ff9a3a' toneMapped={false} /></mesh>
      <mesh position={[0, 0.35, -3.8]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.06, 0.06, 2.6, 12]} /><meshStandardMaterial color='#8a93a8' metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0.35, -4.8]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.04, 0.04, 0.6, 8]} /><meshStandardMaterial color='#8a93a8' metalness={0.8} roughness={0.3} /></mesh>
      <mesh position={[0, 0.45, -3.2]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.02, 0.02, 1.2, 6]} /><meshStandardMaterial color='#c9d0dd' metalness={0.8} roughness={0.3} /></mesh>
      {/* ånga och vind */}
      <Sparkles count={260} scale={[14, 30, 14]} position={[0, -12, -4]} size={2.5} speed={2.2} opacity={0.45} color='#dbe6ff' />
      <Sparkles count={80} scale={[6, 3, 6]} position={[-2.5, 0.5, 1]} size={4} speed={0.6} opacity={0.35} color='#ffffff' />
    </group>
  );
}

export const cloudcity: Scene = {
  key: 'cloudcity', duration: 12.4,
  words: (ctx) => [
    { at: 2.7, until: 4.6, text: `${ctx.deposed ?? 'Nej'}… jag är din far.`, style: 'subtitle' },
    { at: 4.8, until: 6.4, text: 'Nej… Det är inte sant! Det är omöjligt!', style: 'subtitle' },
    { at: 6.6, until: 8.2, text: 'NEEEEJ!', size: 2.4, color: '#c9d8ff' },
    { at: 10.9, text: 'JAG ÄR DIN FAR', size: 2.0, color: '#c9d8ff' },
    { at: 11.5, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: 0.4, cue: 'breath' }, { at: 2.6, cue: 'breath' }, { at: 6.6, cue: 'slam' }, { at: 8.8, cue: 'breath' }, { at: 10.9, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.8), span(t, 10.4, 10.9) * 0.94),
  camera: (t) => {
    if (t < 2.4) {
      const p = ease(span(t, 0, 2.4), 'out');
      return { position: lerp3([3.4, -2.6, -5.6], [2.8, -2.0, -5.0], p), lookAt: [0.2, 0.1, -3.4], fov: 42, snap: true };
    }
    if (t < 4.6) {
      const p = ease(span(t, 2.4, 4.6), 'inOut');
      return { position: lerp3([1.5, 0.8, -4.4], [1.2, 0.9, -3.9], p), lookAt: [0, 1.15, -1.6], fov: 34, snap: true };
    }
    if (t < LETGO) {
      const p = ease(span(t, 4.6, LETGO), 'inOut');
      return { position: lerp3([1.7, -0.8, -6.4], [1.3, -0.6, -6.0], p), lookAt: [0, -0.55, -4.8], fov: 34, snap: true };
    }
    if (t < 8.4) return { position: [1.7, 1.9, -2.4], lookAt: [0, -3.5, -4.9], fov: 48, snap: true };
    const p = ease(span(t, 8.4, 10.6), 'inOut');
    return { position: lerp3([2.4, 0.7, -5.6], [2.0, 0.9, -5.0], p), lookAt: [0, 1.0, -1.8], fov: 36, snap: true };
  },
  Scene: ({ t }) => {
    const sway = Math.sin(t * 1.7) * 0.12 + Math.sin(t * 0.7) * 0.05;
    const blade = kf(t, [[2.5, 0.95], [3.1, 0, 'in']]);
    const arm = kf(t, [[3.0, 0], [4.2, 0.9, 'out'], [8.6, 0.9], [9.4, 0, 'in']]);
    const fall = Math.max(0, t - LETGO);
    const fallY = -fall * fall * 6;
    const fallScale = Math.max(0.05, 1 - fall * 0.35);
    // kronan flyger av vid släppet, i en båge upp till handen, och sitter sedan på vinnaren
    const crownFly = span(t, LETGO, 8.3);
    const crownStart: Vec3 = [TIP[0], TIP[1] + HANG[1] + 1.78, TIP[2]];
    const crownEnd: Vec3 = [0.6, 1.2, -2.6];
    const crownPos: Vec3 = [crownStart[0] + (crownEnd[0] - crownStart[0]) * crownFly, crownStart[1] + (crownEnd[1] - crownStart[1]) * crownFly + Math.sin(crownFly * Math.PI) * 2.2, crownStart[2] + (crownEnd[2] - crownStart[2]) * crownFly];
    return (
      <>
        <Shaft />
        {/* vinnaren i svart hjälm på plattformen, vänd mot antennen */}
        <Racket position={VADER} rotation={[0, Math.PI, 0]} color='#111116' helmet arm={arm} saber={blade} saberColor='#ff2a2a' flicker={0.5 + 0.5 * Math.sin(t * 57)} crown={t >= 8.3} />
        {/* den störtade hänger från antennens spets och svajar */}
        <group position={TIP} rotation={[0, 0, sway]}>
          <group position={[0, fallY, 0]} scale={fallScale}>
            <Racket position={HANG} rotation={[0, 0, fall * 5]} color='#c9b48a' mood={t < 2.4 ? 'grim' : 'shock'} crown={t < LETGO} />
          </group>
        </group>
        {t >= LETGO && crownFly < 1 && <Crown position={crownPos} rotation={[crownFly * 7, crownFly * 9, 0]} scale={0.8} />}
      </>
    );
  },
};
