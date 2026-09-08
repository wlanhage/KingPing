'use client';
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Racket, lerp3 } from '../props';
import { decay, ease, kf, span } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * RÅDSSALEN, strax före Order 66.
 *   0.0–3.6  Inifrån salen, lågt över golvemblemet: dörrarna glider isär, han står i valvet
 *            mot korridorljuset och går in. Ynglingarna står i salen.
 *   3.6–5.8  Klipp: hans blick. Ynglingarna ser upp på honom med stora ögon.
 *   5.8–8.2  Klipp: honom, halvnära, lätt underifrån. Ögonen skiftar. Sabeln tänds neråt.
 *   8.2–9.2  Klipp: ynglingarna i rött ljus. Hoppet byts mot chock.
 *   9.2–10.6 Klipp: bakom honom. Han går mot dem. Svart.
 */

// Han startar bakom dörrarna (som sitter vid z = -10,5) och går in i salen när de glidit isär.
const DOOR: Vec3 = [0, 0, -11.3];
const STAND: Vec3 = [0, 0, -8.2];
const ENTER_FROM = 1.7, ENTER_TO = 3.4;
const IGNITE = 6.8;
const KIDS: { p: Vec3; c: string }[] = [
  { p: [2.4, 0, -1.9], c: '#3b7ddb' }, { p: [3.3, 0, -2.7], c: '#e08a2b' }, { p: [1.8, 0, -3.0], c: '#4caf50' },
  { p: [3.0, 0, -1.2], c: '#9b59b6' }, { p: [4.1, 0, -2.0], c: '#e05a8a' }, { p: [2.6, 0, -3.8], c: '#f1c40f' }, { p: [3.9, 0, -3.3], c: '#3b7ddb' },
];
const KID_CENTER: Vec3 = [3.0, 0, -2.5];
const faceTo = (from: Vec3, to: Vec3) => Math.atan2(to[0] - from[0], to[2] - from[2]);

/** Salen: rund, med emblemet i golvet, röda stolar längs väggen och valvet med skjutdörrarna i fonden. */
function Chamber({ doors, red }: { doors: number; red: number }) {
  const chairs = Array.from({ length: 10 }, (_, i) => -Math.PI * 0.62 + (i / 9) * Math.PI * 1.24); // luckan vänd mot dörren
  return (
    <group>
      <fog attach='fog' args={['#0a0d18', 12, 40]} />
      <ambientLight intensity={0.22} color='#8899cc' />
      <spotLight position={[0, 7, -2.5]} angle={0.9} penumbra={0.9} intensity={110} color='#dfe6ff' />
      <pointLight position={[0, 5.5, -9.5]} intensity={160} color='#cfe0ff' distance={22} decay={2} />
      {/* golv: mörk sten med emblemet i ockra och rött */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -6]}>
        <planeGeometry args={[40, 50]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={512} mixBlur={1} mixStrength={1.2} roughness={0.7} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color='#1d2233' metalness={0.15} mirror={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -2.6]}><circleGeometry args={[5.2, 64]} /><meshStandardMaterial color='#b48a3c' roughness={0.6} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -2.6]}><ringGeometry args={[3.0, 3.25, 64]} /><meshStandardMaterial color='#6e2b22' roughness={0.6} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -2.6]}><circleGeometry args={[2.3, 64]} /><meshStandardMaterial color='#7a3128' roughness={0.6} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, -2.6]}><circleGeometry args={[0.9, 48]} /><meshStandardMaterial color='#c79a48' roughness={0.5} /></mesh>
      {/* väggen: en cylinder med en lucka mot dörren */}
      <mesh position={[0, 3, -2.6]}><cylinderGeometry args={[8.2, 8.2, 6, 64, 1, true, Math.PI + 0.19, Math.PI * 2 - 0.38]} /><meshStandardMaterial color='#2a3247' roughness={0.9} side={THREE.BackSide} /></mesh>
      <mesh position={[0, 6.05, -2.6]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[8.3, 64]} /><meshStandardMaterial color='#131826' roughness={1} /></mesh>
      {/* röda stolar runt väggen */}
      {chairs.map((a, i) => {
        const r = 7.0; const x = Math.sin(a) * r; const z = -2.6 + Math.cos(a) * r;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, a + Math.PI, 0]}>
            <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.1, 0.5, 1.0]} /><meshStandardMaterial color='#a8332e' roughness={0.7} /></mesh>
            <mesh position={[0, 0.85, -0.45]} rotation={[-0.15, 0, 0]}><boxGeometry args={[1.1, 0.9, 0.18]} /><meshStandardMaterial color='#a8332e' roughness={0.7} /></mesh>
            <mesh position={[0, 0.05, 0]}><boxGeometry args={[1.3, 0.1, 1.2]} /><meshStandardMaterial color='#8a93a8' roughness={0.5} metalness={0.3} /></mesh>
          </group>
        );
      })}
      {/* valvet med skjutdörrarna; korridoren bakom är ljus */}
      <group position={[0, 0, -10.5]}>
        {[-1.95, 1.95].map((x) => <mesh key={x} position={[x, 1.7, 0.1]}><boxGeometry args={[1.2, 3.4, 0.5]} /><meshStandardMaterial color='#3a4460' roughness={0.8} /></mesh>)}
        <mesh position={[0, 3.55, 0.1]}><boxGeometry args={[5.1, 0.5, 0.5]} /><meshStandardMaterial color='#3a4460' roughness={0.8} /></mesh>
        {[-1.15, 1.15].map((x) => (
          <group key={x}>
            <mesh position={[x, 2.0, 0.4]}><boxGeometry args={[0.16, 0.3, 0.06]} /><meshBasicMaterial color='#fff7e0' toneMapped={false} /></mesh>
            <pointLight position={[x, 2.0, 0.7]} intensity={14} color='#fff1d0' distance={6} decay={2} />
          </group>
        ))}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * (0.7 + doors * 1.35), 1.55, 0]}><boxGeometry args={[1.42, 3.1, 0.14]} /><meshStandardMaterial color='#4a5473' roughness={0.6} metalness={0.4} /></mesh>
        ))}
        <mesh position={[0, 1.6, -3.8]}><boxGeometry args={[4, 3.2, 0.2]} /><meshStandardMaterial color='#9fb2e0' emissive='#c9d8ff' emissiveIntensity={1.4} /></mesh>
        {[-2.2, 2.2].map((x) => <mesh key={x} position={[x, 1.8, -2]}><boxGeometry args={[0.4, 3.6, 4]} /><meshStandardMaterial color='#2c3550' roughness={0.9} /></mesh>)}
      </group>
      {/* sabelns rödsken på pelare och väggar */}
      {red > 0 && <pointLight position={[0.5, 2.5, -7.6]} intensity={30 * red} color='#ff2a2a' distance={14} decay={2} />}
      <Sparkles count={160} scale={[12, 5, 14]} position={[0, 2.5, -3]} size={1.2} speed={0.1} opacity={0.3} color='#aab6ff' />
    </group>
  );
}

export const temple: Scene = {
  key: 'temple', duration: 10.4,
  words: (ctx) => [
    { at: 4.2, until: 6.2, text: `Mäster ${ctx.winner}… det är för många av dem. Vad ska vi göra?`, style: 'subtitle' },
    { at: 9.4, text: 'ORDER 66', size: 2.4, color: '#ff3b3b' },
    { at: 10.0, text: ctx.streak >= 2 ? `${ctx.winner} · ${ctx.streak} raka` : `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: 0.7, cue: 'door' }, { at: IGNITE, cue: 'ignite' }, { at: 9.4, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.8), span(t, 9.2, 9.7) * 0.92),
  camera: (t) => {
    if (t < 3.6) {
      // inifrån salen, lågt över emblemet, valvet i mitten; sakta in mot honom
      const p = ease(span(t, 0, 3.6), 'inOut');
      return { position: lerp3([0, 0.55, 3.4], [0, 0.7, 1.6], p), lookAt: [0, 1.35, -8.5], fov: 34, snap: true };
    }
    if (t < 5.8) {
      // hans blick: ynglingarna underifrån
      const p = ease(span(t, 3.6, 5.8), 'inOut');
      return { position: lerp3([0.2, 1.35, -8.3], [0.7, 1.2, -7.6], p), lookAt: [KID_CENTER[0], 0.7, KID_CENTER[2]], fov: 34, snap: true };
    }
    if (t < 8.2) {
      // honom: halvnära från ynglingarnas sida, lätt underifrån
      const p = ease(span(t, 5.8, 8.2), 'inOut');
      return { position: lerp3([2.9, 0.8, -4.6], [2.4, 0.85, -5.2], p), lookAt: [0.15, 1.0, -8.1], fov: 36, snap: true, shake: decay(t - IGNITE, 0.012, 0.5) };
    }
    // ynglingarna i rött ljus, sakta in, tills svart
    const p = ease(span(t, 8.2, 9.7), 'inOut');
    return { position: lerp3([0.5, 1.3, -7.9], [1.2, 1.1, -6.6], p), lookAt: [KID_CENTER[0], 0.75, KID_CENTER[2]], fov: 34, snap: true };
  },
  Scene: ({ t }) => {
    const doors = kf(t, [[0.7, 0], [1.9, 1, 'inOut']]);
    const enter = ease(span(t, ENTER_FROM, ENTER_TO), 'inOut');
    const himPos: Vec3 = lerp3(DOOR, STAND, enter);
    const moving = t > ENTER_FROM && t < ENTER_TO;
    const step = moving ? Math.abs(Math.sin(t * 11)) * 0.04 : 0;
    const sith = span(t, 6.1, 6.7);
    // bladet växer från fästet ner mot golvet; 0,95 lämnar spetsen strax ovanför stenen
    const blade = kf(t, [[IGNITE, 0], [IGNITE + 0.38, 0.95, 'out']]);
    const flicker = blade > 0 ? 0.5 + 0.5 * Math.sin(t * 61) * Math.sin(t * 23) : 0;
    const red = span(t, IGNITE, IGNITE + 0.5);
    const scared = t >= 8.2;
    // in genom dörren vänd mot salen (+z), sedan vänd mot ynglingarna
    const heading = t < ENTER_TO + 0.3 ? 0 : faceTo(himPos, KID_CENTER);
    return (
      <>
        <Chamber doors={doors} red={red} />
        <Racket position={[himPos[0], step, himPos[2]]} rotation={[0, heading, Math.sin(t * 11) * (moving ? 0.03 : 0)]} color='#3a3745' hood mood='grim' eyes={sith > 0 ? '#ffb020' : '#111111'} eyeGlow={sith * 1.6} saber={blade} flicker={flicker} />
        {KIDS.map((k, i) => (
          <Racket key={i} position={k.p} rotation={[scared ? 0.05 : -0.22, faceTo(k.p, himPos) + (scared ? Math.sin(t * 9 + i) * 0.08 : Math.sin(t * 1.3 + i) * 0.04), 0]} scale={0.42} color={k.c} mood={scared ? 'shock' : 'hope'} />
        ))}
      </>
    );
  },
};
