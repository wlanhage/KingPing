'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Face, Plastic, Racket, Saber, lerp3 } from '../props';
import { ballistic, decay, ease, kf, span, warpHit } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * MUSTAFAR. Någon störtade en mästare med tre raka eller mer.
 *   0.0–3.0  Bakom vinnaren på den svarta banken. Lavan glöder, block med den störtade driver in.
 *            "Det är över, {störtad}! Jag har höjdövertaget."
 *   3.0–4.6  Den störtade på blocket, nära. "Du underskattar min makt!"
 *   4.6–6.4  Hoppet: från sidan, volten över lavan. Vinnaren kastar upp en boll och smashar.
 *   6.35     Träffen: hit-stop, ultrarapid, racketen går i två delar. Sabeln i lavan.
 *   ~8–11.5  Halvorna på sluttningen vid lavakanten. "Jag hatar dig, {vinnare}!" Vinnaren vänder sig bort.
 */

const BLUE = '#4aa3ff';
const HIT = 6.35;
const JUMP_FROM = 4.8, JUMP_TO = 6.6;
const WINNER: Vec3 = [0, 0, -2.6];
const blockZ = (t: number) => kf(t, [[0, -9.6], [3.0, -7.2, 'linear'], [12, -6.2, 'linear']]);
const blockY = (t: number) => -0.12 + Math.sin(t * 1.3) * 0.05;
/** Den störtades position i luften under hoppet (0..1 längs bågen). */
const arc = (p: number, from: Vec3): Vec3 => [from[0] - 0.1 * p, from[1] + 3.6 * Math.sin(p * Math.PI), from[2] + (-4.3 - from[2]) * p];
/** Där han lämnar blocket — blockets läge i hoppögonblicket. */
const JUMP_START: Vec3 = [0.4, blockY(JUMP_FROM) + 0.3, blockZ(JUMP_FROM)];
const hitPoint = (): Vec3 => arc(span(HIT, JUMP_FROM, JUMP_TO), JUMP_START);

function lavaTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ff7a12'; g.fillRect(0, 0, 256, 256);
  let seed = 3;
  const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 140; i++) {
    g.fillStyle = i % 4 === 0 ? '#ffd27a' : `rgba(20, 8, 4, ${0.55 + r() * 0.4})`;
    g.beginPath(); g.ellipse(r() * 256, r() * 256, 6 + r() * 26, 4 + r() * 14, r() * Math.PI, 0, Math.PI * 2); g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#0a0202'); grad.addColorStop(0.55, '#3a0c04'); grad.addColorStop(0.72, '#c2400c'); grad.addColorStop(1, '#1a0603');
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Lavahavet, banken och himlen. Lavan flyter sakta genom att texturen glider. */
function Mustafar() {
  const lava = useMemo(lavaTexture, []);
  const sky = useMemo(skyTexture, []);
  useFrame((_, delta) => { lava.offset.x += delta * 0.012; lava.offset.y += delta * 0.006; });
  const rocks = useMemo(() => [[-3.2, 0.2, -1.4, 0.5], [2.8, 0.15, -0.6, 0.4], [-1.9, 0.12, 1.6, 0.3], [3.6, 0.25, 1.2, 0.55], [-4.2, 0.3, -3.6, 0.6]] as [number, number, number, number][], []);
  return (
    <group>
      <fog attach='fog' args={['#3a0c04', 14, 60]} />
      <mesh scale={[-1, 1, 1]}><sphereGeometry args={[80, 32, 16]} /><meshBasicMaterial map={sky} side={THREE.BackSide} toneMapped={false} /></mesh>
      <hemisphereLight args={['#4a1208', '#ff6a1a', 0.9]} />
      <ambientLight intensity={0.2} color='#ff8a40' />
      <pointLight position={[0, 1.2, -9]} intensity={90} color='#ff7a1a' distance={30} decay={2} />
      <pointLight position={[-6, 1.0, -14]} intensity={60} color='#ffb060' distance={30} decay={2} />
      <spotLight position={[3, 8, 2]} angle={0.7} penumbra={0.9} intensity={40} color='#ffd0a0' />
      {/* lavahavet */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, -20]}>
        <planeGeometry args={[120, 90]} />
        <meshStandardMaterial map={lava} emissiveMap={lava} emissive='#ff6a00' emissiveIntensity={1.9} color='#ff9a3a' roughness={0.9} />
      </mesh>
      {/* banken: svart sten, kanten mot lavan vid z ≈ -4,2 */}
      <mesh position={[0, -0.36, 0.2]}><boxGeometry args={[18, 0.72, 8.8]} /><meshStandardMaterial color='#17100e' roughness={1} /></mesh>
      <mesh position={[0, -0.3, -4.3]} rotation={[0.35, 0, 0]}><boxGeometry args={[18, 0.5, 1.4]} /><meshStandardMaterial color='#1c1310' roughness={1} emissive='#ff4a00' emissiveIntensity={0.12} /></mesh>
      {rocks.map(([x, y, z, s], i) => <mesh key={i} position={[x, y, z]} rotation={[i, i * 0.7, 0]}><dodecahedronGeometry args={[s, 0]} /><meshStandardMaterial color='#1a1210' roughness={1} /></mesh>)}
      <Sparkles count={420} scale={[24, 10, 30]} position={[0, 3, -12]} size={3} speed={0.5} opacity={0.8} color='#ffb35c' />
      <Sparkles count={120} scale={[10, 4, 8]} position={[0, 1.5, -1]} size={2} speed={0.35} opacity={0.6} color='#ff9a3a' />
    </group>
  );
}

/** Det flytande blocket: mörk skorpa med glödande kanter, guppar på lavan. */
function Block({ t }: { t: number }) {
  return (
    <group position={[0.4, blockY(t), blockZ(t)]} rotation={[Math.sin(t * 0.9) * 0.02, 0, Math.cos(t * 1.1) * 0.025]}>
      <mesh position={[0, 0, 0]}><boxGeometry args={[2.3, 0.55, 2.3]} /><meshStandardMaterial color='#1a1210' roughness={1} /></mesh>
      <mesh position={[0, -0.2, 0]}><boxGeometry args={[2.4, 0.2, 2.4]} /><meshStandardMaterial color='#3a1408' emissive='#ff5a10' emissiveIntensity={0.9} roughness={1} /></mesh>
    </group>
  );
}

/** Den störtade i två delar: överhalvan med ögonen, underhalvan med munnen och handtaget. */
function SplitRacket({ t, color }: { t: number; color: string }) {
  const d = t - HIT;
  const hp = hitPoint();
  const top = { x: hp[0] + 0.45 * Math.min(d, 1.2), z: hp[2] + 0.7 * Math.min(d, 1.2), ...ballistic(d, hp[1] + 0.3, 2.2, 14, 0.36, 0.25, 2) };
  const bottom = { x: hp[0] - 0.6 * Math.min(d, 1.2), z: hp[2] + 0.35 * Math.min(d, 1.2), ...ballistic(d, hp[1] - 0.3, 1.2, 14, 0.3, 0.25, 2) };
  const settleTop = top.moving ? d * 5 : -Math.PI / 2 + 0.35;
  const settleBottom = bottom.moving ? -d * 4 : -Math.PI / 2 - 0.2;
  return (
    <group>
      <group position={[top.x, top.y, top.z]} rotation={[settleTop, 0.4, d * 2 * (top.moving ? 1 : 0)]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.72, 0.72, 0.1, 40, 1, false, Math.PI / 2, Math.PI]} /><Plastic color={color} /></mesh>
        <group position={[0, 0, 0.06]}><Face mood={top.moving ? 'shock' : 'grim'} /></group>
      </group>
      <group position={[bottom.x, bottom.y, bottom.z]} rotation={[settleBottom, -0.3, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.72, 0.72, 0.1, 40, 1, false, -Math.PI / 2, Math.PI]} /><Plastic color={color} /></mesh>
        <mesh position={[0, -0.83, 0]}><boxGeometry args={[0.22, 0.5, 0.12]} /><meshStandardMaterial color='#b08a5a' roughness={0.6} /></mesh>
        <mesh position={[0, -0.2, 0.06]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.2, 0.035, 8, 20, Math.PI]} /><meshStandardMaterial color='#111' /></mesh>
      </group>
    </group>
  );
}

export const mustafar: Scene = {
  key: 'mustafar', duration: 13.4,
  warp: (t) => warpHit(t, HIT, 0.1, 0.3, 0.9),
  words: (ctx) => [
    { at: 1.4, until: 3.8, text: `Det är över, ${ctx.deposed ?? 'du'}! Jag har höjdövertaget.`, style: 'subtitle' },
    { at: 3.9, until: 5.0, text: 'Du underskattar min makt!', style: 'subtitle' },
    { at: 9.0, until: 11.6, text: `Jag hatar dig, ${ctx.winner}!`, style: 'subtitle' },
    { at: 12.3, text: 'HÖJDÖVERTAGET', size: 2.2, color: '#ff8a2a' },
    { at: 12.9, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: 0.3, cue: 'hum' }, { at: 5.9, cue: 'slam' }, { at: HIT, cue: 'smash' }, { at: 8.3, cue: 'sizzle' }, { at: 12.3, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.8), span(t, 11.8, 12.3) * 0.94),
  camera: (t) => {
    if (t < 3.0) {
      const p = ease(span(t, 0, 3.0), 'out');
      return { position: lerp3([1.0, 1.15, 1.9], [0.7, 1.0, 0.7], p), lookAt: [0.3, 0.9, -8.5], fov: 40, snap: true };
    }
    if (t < 4.6) {
      const z = blockZ(t);
      return { position: [2.9, 1.0, z + 1.8], lookAt: [0.4, 1.0, z], fov: 36, snap: true };
    }
    if (t < HIT) {
      const a = arc(span(t, JUMP_FROM, JUMP_TO), JUMP_START);
      return { position: [6.0, 2.2, a[2] + 0.8], lookAt: [a[0], Math.max(1.0, a[1] - 0.4), a[2]], fov: 42, snap: true };
    }
    if (t < 7.9) {
      const hp = hitPoint();
      return { position: [2.6, 2.3, hp[2] + 1.6], lookAt: [hp[0], hp[1] - 0.2, hp[2]], fov: 38, snap: true, shake: decay(t - HIT, 0.03, 0.4) };
    }
    const p = ease(span(t, 9.8, 11.6), 'inOut');
    return { position: lerp3([1.9, 0.55, -1.7], [1.6, 0.9, -1.2], p), lookAt: lerp3([0.2, 0.4, -3.7], [0.1, 1.1, -2.8], p), fov: 34, snap: true };
  },
  Scene: ({ t, ctx }) => {
    const jump = span(t, JUMP_FROM, JUMP_TO);
    const inAir = t >= JUMP_FROM && t < HIT;
    const air = arc(jump, JUMP_START);
    const split = t >= HIT;
    // vinnaren: kastar upp bollen och smashar
    const toss = span(t, 5.2, 5.8);
    const swing = kf(t, [[5.7, 0.25], [5.95, 0.95, 'inOut'], [6.15, -1.25, 'in'], [6.9, -0.1, 'out']]);
    const ballFly = span(t, 6.15, HIT);
    const ballPos: Vec3 = t < 6.15 ? [0.95, 1.35 + toss * 0.95 - (t > 5.8 ? (t - 5.8) * 1.2 : 0), -2.55] : split ? [0.3 - (t - HIT) * 2.6, Math.max(-0.2, 1.9 + (t - HIT) * 1.5 - 4 * (t - HIT) * (t - HIT)), -4.4 - (t - HIT) * 2.2] : lerp3([0.95, 1.9, -2.55], hitPoint(), ballFly);
    const turn = ease(span(t, 10.0, 11.8), 'inOut');
    // den störtades sabel tumlar ner i lavan efter träffen
    const saberDrop = split ? Math.min(1, (t - HIT) / 1.2) : 0;
    const saberPos: Vec3 = lerp3([hitPoint()[0] + 0.5, hitPoint()[1], hitPoint()[2]], [1.9, -0.45, -5.6], ease(saberDrop, 'in'));
    return (
      <>
        <Mustafar />
        <Block t={t} />
        {/* vinnaren på banken, vänd mot lavan, sabeln neråt */}
        <Racket position={WINNER} rotation={[0, Math.PI + turn * 1.3, swing * 0.15]} color='#c9b48a' mood={t > 9.5 ? 'sad' : 'grim'} saber={0.95} saberColor={BLUE} flicker={0.5 + 0.5 * Math.sin(t * 57)} />
        {(t > 5.2 && t < HIT + 2.4) && (
          <mesh position={ballPos} rotation={[t * 12, 0, 0]}><sphereGeometry args={[0.16, 20, 20]} /><Plastic color='#fff7e3' /></mesh>
        )}
        {/* den störtade: på blocket, i luften med volt, eller i två delar */}
        {!split && !inAir && <Racket position={[0.4, blockY(t) + 0.28, blockZ(t)]} rotation={[0, 0, Math.sin(t * 1.3) * 0.02]} color='#2f2c3a' mood='grim' eyes='#ffb020' eyeGlow={1.2} saber={0.95} saberColor={BLUE} flicker={0.5 + 0.5 * Math.sin(t * 53)} />}
        {inAir && (
          <group position={[air[0], air[1] + 1.0, air[2]]} rotation={[-jump * Math.PI * 4, 0, 0]}>
            <Racket position={[0, -1.0, 0]} color='#2f2c3a' mood='grim' eyes='#ffb020' eyeGlow={1.2} saber={0.95} saberColor={BLUE} flicker={0.5} />
          </group>
        )}
        {split && <SplitRacket t={t} color='#2f2c3a' />}
        {split && saberDrop < 1 && <group position={saberPos} rotation={[(t - HIT) * 9, 0, (t - HIT) * 5]}><Saber length={0.95 * (1 - saberDrop * 0.6)} color={BLUE} /></group>}
        {split && saberDrop >= 1 && t < HIT + 2.6 && [0, 1, 2].map((i) => (
          <mesh key={i} position={[1.9 + Math.sin(t * 3 + i) * 0.2, -0.1 + (t - HIT - 1.2) * 0.6 + i * 0.2, -5.6]}><sphereGeometry args={[0.18 + i * 0.05, 8, 8]} /><meshBasicMaterial color='#ffd9b0' transparent opacity={Math.max(0, 0.5 - (t - HIT - 1.2) * 0.35)} /></mesh>
        ))}
      </>
    );
  },
};
