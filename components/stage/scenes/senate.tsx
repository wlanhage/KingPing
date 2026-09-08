'use client';
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { Racket, lerp3 } from '../props';
import { decay, ease, kf, rng, span } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * KANSLERNS KONTOR. Fyra raka: den fjärde som kommer för att gripa honom flyger ut genom fönstret.
 *   0.0–3.0  Vidbild: kontoret, Coruscant i fönstret. Jedin kommer in med lila sabel.
 *   3.0–6.9  Klipp fram och tillbaka: "du är gripen" — "Jag ÄR senaten." — "Inte än." — "Förräderi."
 *   6.9–8.4  Blixtarna ur handen. Jedin parerar med sabeln, kanslerns ansikte bleknar.
 *   8.4–10.5 "OBEGRÄNSAD MAKT!" Jedin slungas ut genom glaset och faller ner i stadens ljus.
 *  10.5–13.0 Utifrån: kanslern kliver fram till hålet i fönstret, huvan uppe, gula ögon.
 */

const WIN: Vec3 = [-2.0, 0, -5.4];
const JEDI_START: Vec3 = [3.2, 0, -0.6];
const JEDI: Vec3 = [2.4, 0, -4.0];
const WINDOW_Z = -9.2;
/** Där glaset går sönder, och dit kanslern går efteråt. */
const HOLE: Vec3 = [3.3, 1.8, WINDOW_Z];
const STAND_END: Vec3 = [3.0, 0, -8.0];
const IGNITE = 0.9, ZAP = 6.9, FLING = 8.4;
const FLING_DIR: Vec3 = [0.184, 0, -0.983];
const FLING_SPEED = 6;
const faceTo = (from: Vec3, to: Vec3) => Math.atan2(to[0] - from[0], to[2] - from[2]);
const UP = new THREE.Vector3(0, 1, 0);

/** Jedins bana efter kastet: en flack båge ut genom fönstret, sedan fallet ner mot staden. */
function flight(t: number): Vec3 {
  const dt = Math.max(0, t - FLING);
  const outside = Math.max(0, dt - 0.81);
  return [JEDI[0] + FLING_DIR[0] * FLING_SPEED * dt, 0.9 + 4.0 * dt - 3.6 * dt * dt - 12 * outside * outside, JEDI[2] + FLING_DIR[2] * FLING_SPEED * dt];
}

const CITY = (() => {
  const r = rng(2026);
  return Array.from({ length: 90 }, () => ({ x: (r() - 0.5) * 110, z: -13 - r() * 70, w: 1.5 + r() * 5, d: 1.5 + r() * 5, h: 8 + r() * 44, hue: r() }))
    .filter((b) => Math.abs(b.x) > 10 || b.z < -22);
})();
const SHARDS = (() => {
  const r = rng(77);
  return Array.from({ length: 30 }, () => ({ dir: [(r() - 0.5) * 1.2, (r() - 0.3) * 0.9, -0.6 - r() * 0.8] as Vec3, speed: 3 + r() * 5, w: 0.2 + r() * 0.45, h: 0.2 + r() * 0.45, spin: 2 + r() * 8, ph: r() * 6 }));
})();

/** Coruscant om natten: torn under och bortom kontoret, ett hav av ljus, trafik i strimmor. */
function Coruscant({ t }: { t: number }) {
  return (
    <group>
      <mesh position={[0, 0, -95]}><planeGeometry args={[400, 160]} /><meshBasicMaterial color='#1a1240' /></mesh>
      <Sparkles count={300} scale={[200, 60, 20]} position={[0, 40, -85]} size={1.4} speed={0.05} opacity={0.6} color='#ffffff' />
      {/* tornet kontoret sitter i */}
      <mesh position={[0, -30, -3]}><boxGeometry args={[16, 60, 14]} /><meshStandardMaterial color='#15101f' roughness={0.9} /></mesh>
      {CITY.map((b, i) => (
        <group key={i} position={[b.x, -50, b.z]}>
          <mesh position={[0, b.h / 2, 0]}><boxGeometry args={[b.w, b.h, b.d]} /><meshStandardMaterial color='#100c1c' emissive={b.hue < 0.5 ? '#3a2b66' : '#5a3a4a'} emissiveIntensity={0.35} roughness={0.9} /></mesh>
          {/* tända våningar */}
          {[0.28, 0.52, 0.76].map((f) => <mesh key={f} position={[0, b.h * f, 0]}><boxGeometry args={[b.w + 0.03, 0.16, b.d + 0.03]} /><meshBasicMaterial color={b.hue < 0.5 ? '#ffd9a0' : '#ffb8a0'} toneMapped={false} /></mesh>)}
        </group>
      ))}
      <Sparkles count={2600} scale={[100, 44, 64]} position={[0, -24, -42]} size={2.4} speed={0.04} opacity={0.9} color='#ffd8a8' />
      {/* trafik: lyktor som glider förbi i lager */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const lane = -6 + (i % 4) * 4.5, z = -16 - i * 5, dir = i % 2 ? 1 : -1;
        const x = ((t * (5 + i) * dir + i * 13) % 80 + 80) % 80 - 40;
        return <mesh key={i} position={[x, lane, z]}><boxGeometry args={[0.7, 0.12, 0.25]} /><meshBasicMaterial color={dir > 0 ? '#ffe9b0' : '#ff8a6a'} toneMapped={false} /></mesh>;
      })}
      <pointLight position={[0, 6, -16]} intensity={30} color='#8aa0ff' distance={22} decay={2} />
    </group>
  );
}

/** Kontoret: mörkrött golv, pelare, det breda fönstret med spröjs, och skrivbordet i bågen. */
function Office({ broken, t }: { broken: number; t: number }) {
  const wall = <meshStandardMaterial color='#3b1f25' roughness={0.9} />;
  const trim = <meshStandardMaterial color='#6b3a3a' roughness={0.6} metalness={0.3} />;
  return (
    <group>
      <fog attach='fog' args={['#160d1e', 14, 90]} />
      <ambientLight intensity={0.28} color='#7a5a76' />
      <hemisphereLight args={['#5a3f66', '#2a1015', 0.5]} />
      <pointLight position={[0, 4.6, -3]} intensity={70} color='#ff7a55' distance={16} decay={2} />
      <pointLight position={[-4, 3, -1]} intensity={30} color='#c04a4a' distance={12} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}>
        <planeGeometry args={[14, 14]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={512} mixBlur={1} mixStrength={1.1} roughness={0.7} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color='#2a171c' metalness={0.15} mirror={0} />
      </mesh>
      <mesh position={[0, 5.3, -3]}><boxGeometry args={[14, 0.3, 14]} /><meshStandardMaterial color='#1c1216' roughness={1} /></mesh>
      {[-7, 7].map((x) => <mesh key={x} position={[x, 2.6, -3]}><boxGeometry args={[0.4, 5.2, 14]} />{wall}</mesh>)}
      {/* bakväggen runt fönstret */}
      <mesh position={[0, 0.2, WINDOW_Z - 0.1]}><boxGeometry args={[14, 0.4, 0.4]} />{trim}</mesh>
      <mesh position={[0, 5.0, WINDOW_Z - 0.1]}><boxGeometry args={[14, 0.5, 0.4]} />{trim}</mesh>
      {[-6, 6].map((x) => <mesh key={x} position={[x, 2.6, WINDOW_Z - 0.1]}><boxGeometry args={[2, 5.2, 0.4]} />{wall}</mesh>)}
      {[-5.2, 5.2].map((x) => <mesh key={x} position={[x, 2.6, WINDOW_Z + 0.3]}><boxGeometry args={[0.5, 5.2, 0.5]} />{trim}</mesh>)}
      {[-1.7, 1.7].map((x) => <mesh key={x} position={[x, 2.6, WINDOW_Z]}><boxGeometry args={[0.12, 4.6, 0.12]} />{trim}</mesh>)}
      {/* rutorna: den högra går sönder */}
      {[[-3.35, 3.3], [0, 3.3], [3.35, 3.3]].map(([x, w], i) => (
        (i < 2 || broken <= 0) && <mesh key={i} position={[x, 2.6, WINDOW_Z]}><planeGeometry args={[w, 4.6]} /><meshBasicMaterial color='#9ec5ff' transparent opacity={0.1} side={2} /></mesh>
      ))}
      {broken > 0 && [[2.4, 4.7], [3.6, 4.7], [4.6, 4.7]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, WINDOW_Z]} rotation={[0, 0, (i % 2 ? 1 : -1) * 0.6]}><planeGeometry args={[0.3, 0.45]} /><meshBasicMaterial color='#9ec5ff' transparent opacity={0.1} side={2} /></mesh>
      ))}
      {broken > 0 && broken < 1.8 && SHARDS.map((s, i) => {
        const d = broken;
        return (
          <mesh key={i} position={[HOLE[0] + s.dir[0] * s.speed * d, HOLE[1] + s.dir[1] * s.speed * d - 3 * d * d, HOLE[2] + s.dir[2] * s.speed * d]} rotation={[s.ph + d * s.spin, s.ph * 0.7 + d * s.spin * 0.6, 0]}>
            <boxGeometry args={[s.w, s.h, 0.02]} /><meshBasicMaterial color='#cfe4ff' transparent opacity={Math.max(0, 0.7 - d * 0.35)} side={2} />
          </mesh>
        );
      })}
      {/* skrivbordet i bågen och pelarna */}
      <mesh position={[-3.6, 0.5, -1.4]} rotation={[Math.PI / 2, 0, 0.4]}><torusGeometry args={[1.5, 0.38, 12, 40, Math.PI]} /><meshStandardMaterial color='#4a1c22' roughness={0.5} /></mesh>
      {[-4.6, 4.6].map((x) => <mesh key={x} position={[x, 2.6, -7.2]}><boxGeometry args={[0.6, 5.2, 0.6]} /><meshStandardMaterial color='#5a2a2e' roughness={0.6} /></mesh>)}
      <Coruscant t={t} />
    </group>
  );
}

/** En taggig stråle mellan två punkter, omritad varje tick. `amp` är hur vilt den slingrar. */
function jagged(r: () => number, from: Vec3, to: Vec3, steps: number, amp: number): Vec3[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const p = i / steps, base = lerp3(from, to, p), a = amp * Math.sin(Math.PI * p);
    return [base[0] + (r() - 0.5) * a * 2, base[1] + (r() - 0.5) * a * 2, base[2] + (r() - 0.5) * a * 2] as Vec3;
  });
}

/** Kraftblixtar: sex tjocka strålar från handen mot målet, några slår förbi, varje med en gren. */
function Lightning({ from, to, t, power }: { from: Vec3; to: Vec3; t: number; power: number }) {
  if (power <= 0) return null;
  const tick = Math.floor(t * 28);
  const flick = 0.6 + 0.4 * Math.abs(Math.sin(tick * 7.3));
  const beyond = lerp3(from, to, 1.35);
  const bolts = [0, 1, 2, 3, 4, 5].flatMap((b) => {
    const r = rng(tick * 131 + b * 977 + 7);
    const end: Vec3 = b < 2 ? beyond : [to[0] + (r() - 0.5) * 1.2, to[1] + (r() - 0.5) * 1.2, to[2] + (r() - 0.5) * 1.2];
    const main = jagged(r, from, end, 14, 0.55 * power);
    const forkAt = main[4 + Math.floor(r() * 6)];
    const fork = jagged(r, forkAt, [forkAt[0] + (r() - 0.5) * 2, forkAt[1] + (r() - 0.5) * 2, forkAt[2] + (r() - 0.5) * 2], 5, 0.25 * power);
    return [main, fork];
  });
  return (
    <group>
      {bolts.flatMap((pts, b) => pts.slice(1).map((q, i) => {
        const p = pts[i], dir = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), len = dir.length();
        const rot = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
        const thick = b % 2 === 0 ? 1 : 0.6;
        return (
          <group key={`${b}:${i}`} position={[(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2]} quaternion={rot}>
            <mesh><cylinderGeometry args={[0.034 * thick, 0.034 * thick, len, 6]} /><meshBasicMaterial color='#eaf4ff' toneMapped={false} /></mesh>
            <mesh><cylinderGeometry args={[0.1 * thick, 0.1 * thick, len, 6]} /><meshBasicMaterial color='#7fb4ff' transparent opacity={0.4} toneMapped={false} /></mesh>
            <mesh><cylinderGeometry args={[0.2 * thick, 0.2 * thick, len, 6]} /><meshBasicMaterial color='#5a8cff' transparent opacity={0.12} toneMapped={false} /></mesh>
          </group>
        );
      }))}
      <pointLight position={from} intensity={(40 + 60 * flick) * power} color='#9ec5ff' distance={12} decay={2} />
      <pointLight position={to} intensity={(60 + 80 * flick) * power} color='#bcd8ff' distance={12} decay={2} />
    </group>
  );
}

export const senate: Scene = {
  key: 'senate', duration: 13.0,
  words: (ctx) => [
    { at: 1.3, until: 3.1, text: `I senatens namn, ${ctx.winner}: du är gripen.`, style: 'subtitle' },
    { at: 3.4, until: 4.6, text: 'Jag ÄR senaten.', style: 'subtitle' },
    { at: 4.9, until: 5.7, text: 'Inte än.', style: 'subtitle' },
    { at: 5.9, until: 6.8, text: 'Då är det… förräderi.', style: 'subtitle' },
    { at: 7.4, until: 8.4, text: 'MAKT!', size: 1.4, color: '#bfe0ff' },
    { at: 8.5, until: 10.4, text: 'OBEGRÄNSAD MAKT!', size: 2.2, color: '#cfe8ff' },
    { at: 12.4, text: 'OBEGRÄNSAD MAKT', size: 2.0, color: '#cfe8ff' },
    { at: 12.9, text: `${ctx.winner} · ${ctx.streak} raka`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: IGNITE, cue: 'ignite' }, { at: ZAP, cue: 'lightning' }, { at: 7.5, cue: 'lightning' }, { at: 8.1, cue: 'lightning' }, { at: FLING, cue: 'blast' }, { at: FLING + 0.05, cue: 'smash' }, { at: 8.5, cue: 'slam' }, { at: 12.4, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.6), span(t, 12.1, 12.6) * 0.94),
  camera: (t) => {
    if (t < 3.0) {
      const p = ease(span(t, 0, 3.0), 'inOut');
      return { position: lerp3([-2.0, 1.9, 3.2], [-1.6, 1.8, 2.2], p), lookAt: [0.4, 1.0, -6.0], fov: 40, snap: true };
    }
    if (t < 4.7) {
      const p = ease(span(t, 3.0, 4.7), 'inOut');
      return { position: lerp3([2.6, 1.3, -1.6], [2.4, 1.25, -1.9], p), lookAt: [WIN[0], 1.05, WIN[2]], fov: 40, snap: true };
    }
    if (t < 5.8) return { position: [-1.4, 1.2, -1.6], lookAt: [JEDI[0], 1.05, JEDI[2]], fov: 38, snap: true };
    if (t < ZAP) {
      const p = ease(span(t, 5.8, ZAP), 'inOut');
      return { position: lerp3([2.3, 1.25, -1.9], [2.1, 1.2, -2.1], p), lookAt: [WIN[0], 1.05, WIN[2]], fov: 36, snap: true };
    }
    // blixtarna från sidan: båda i bild, staden bakom
    if (t < FLING) return { position: [0.2, 1.7, 0.2], lookAt: [0.2, 1.15, -5.0], fov: 50, snap: true, shake: 0.012 + 0.01 * Math.sin(t * 40) };
    if (t < 9.3) {
      const m = flight(t);
      return { position: [0.6, 2.0, -1.6], lookAt: [m[0], Math.max(0.8, m[1]), m[2]], fov: 52, snap: true, shake: decay(t - FLING, 0.06, 0.6) };
    }
    // utanför fönstret: han faller ner i stadens ljus
    if (t < 10.5) return { position: [4.8, 0.4, -12.6], lookAt: flight(t), fov: 58, snap: true };
    const p = ease(span(t, 10.5, 13.0), 'inOut');
    return { position: lerp3([3.4, 1.6, -12.4], [2.9, 1.4, -11.4], p), lookAt: [STAND_END[0], 1.1, STAND_END[2]], fov: 36, snap: true };
  },
  Scene: ({ t }) => {
    const walkIn = ease(span(t, 0.5, 2.4), 'inOut');
    const flung = t >= FLING;
    const jediPos: Vec3 = flung ? flight(t) : lerp3(JEDI_START, lerp3(JEDI, [JEDI[0] + 0.1, 0, JEDI[2] - 0.35], span(t, ZAP, FLING)), walkIn);
    const walking = t > 0.5 && t < 2.4;
    const jediStep = walking ? Math.abs(Math.sin(t * 11)) * 0.04 : 0;
    const jediHeading = walking ? faceTo(JEDI_START, JEDI) : faceTo(JEDI, WIN);
    const blade = kf(t, [[IGNITE, 0], [IGNITE + 0.35, 0.95, 'out']]) * (t < FLING - 0.1 ? 1 : 0);
    const power = flung ? 1 - span(t, FLING, FLING + 0.7) : kf(t, [[ZAP, 0], [ZAP + 0.25, 0.7, 'out'], [FLING - 0.2, 1.0, 'in']]);
    const flicker = blade > 0 ? 0.5 + 0.5 * Math.sin(t * 61) * Math.sin(t * 23) + power * Math.sin(t * 90) : 0;
    // kanslern: gula ögon, armen ut, ansiktet som bleknar av kraften
    const sith = span(t, 5.6, 6.6);
    const arm = kf(t, [[6.5, 0], [ZAP, 0.9, 'out'], [9.4, 0.9], [9.8, 0]]);
    const pale = new THREE.Color('#7a1f2a').lerp(new THREE.Color('#c7b4ad'), span(t, 7.0, 8.6)).getStyle();
    const walkOut = ease(span(t, 9.6, 11.2), 'inOut');
    const winPos: Vec3 = lerp3(WIN, STAND_END, walkOut);
    const winStep = t > 9.6 && t < 11.2 ? Math.abs(Math.sin(t * 10)) * 0.04 : 0;
    const winHeading = kf(t, [[9.4, faceTo(WIN, JEDI)], [9.8, faceTo(WIN, STAND_END)], [11.2, faceTo(WIN, STAND_END)], [11.8, Math.PI]]);
    const hand: Vec3 = [winPos[0] + 0.6 * Math.cos(winHeading) + (0.23 + arm) * Math.sin(winHeading), 0.95, winPos[2] - 0.6 * Math.sin(winHeading) + (0.23 + arm) * Math.cos(winHeading)];
    const target: Vec3 = [jediPos[0], jediPos[1] + 0.95, jediPos[2]];
    return (
      <>
        <Office broken={Math.max(0, t - FLING)} t={t} />
        <Racket position={[winPos[0], winStep, winPos[2]]} rotation={[0, winHeading, 0]} color={pale} hood mood='grim' eyes={sith > 0 ? '#ffb020' : '#111111'} eyeGlow={sith * 1.8 + power * 1.2} arm={arm} />
        <Racket position={[jediPos[0], jediPos[1] + jediStep, jediPos[2]]} rotation={flung ? [(t - FLING) * 7, jediHeading, (t - FLING) * 3] : [-0.2 * power, jediHeading, 0]} color='#3b5bdb' mood={flung || power > 0.9 ? 'shock' : 'grim'} saber={blade} saberColor='#b24dff' flicker={flicker} />
        <Lightning from={hand} to={target} t={t} power={power} />
        {flung && <pointLight position={[jediPos[0] + 1, jediPos[1] + 1.5, jediPos[2] + 1]} intensity={40} color='#ffd0a0' distance={8} decay={2} />}
      </>
    );
  },
};
