'use client';
import { useEffect, useMemo } from 'react';
import { Billboard, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import { lerp3 } from '../props';
import { glow, LightSaber, Lit, RacketHalf, RealRacket, RobeHeap, Sparks, stoneGrain } from '../real';
import { ballistic, decay, ease, kf, rng, span, warpHit } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * MUSTAFAR. Någon störtade en mästare med två eller tre raka.
 *   0.0–1.6  Snett ovanifrån: vinnaren på klipphyllan, lavan, blocket med den störtade driver in.
 *   1.6–3.0  Vinnarens ansikte underifrån, blå sabel. "Det är över, {störtad}! Jag har höjdövertaget."
 *   3.0–4.6  Den störtade på blocket, nära, med sithögon. "Du underskattar min makt!"
 *   4.6–6.4  Hoppet: från sidan, volten över lavan. Vinnaren kastar upp en boll och smashar.
 *   6.35     Träffen: hit-stop, ultrarapid, batet klyvs. Snittet glöder, sabeln faller i lavan.
 *   ~8–11.5  Överhalvan på hyllan, underhalvan står kvar. "Jag hatar dig, {vinnare}!" Vinnaren vänder sig bort.
 * Renderas i fotoläget: lavan är en shader (skorpa som spricker, flyter och glöder), klipporna är
 * knölig basalt som glöder där den möter lavan, och luften är full av glöd och rök.
 */

const BLUE = '#4aa3ff';
const RED = '#ff2a2a';
const WINNER_COLOR = '#c9b48a';
const DEPOSED_COLOR = '#2f2c3a';
/** Lavans yta. */
const LAVA_Y = -0.35;
/** Klipphyllan vinnaren står på: så hög att höjdövertaget syns. */
const LEDGE_H = 1.25;
const HIT = 6.35;
const JUMP_FROM = 4.8, JUMP_TO = 6.6;
const WINNER: Vec3 = [0, LEDGE_H, -0.9];
/** Där hoppet slutar: uppe på hyllan, en bit in från kanten. */
const JUMP_END: Vec3 = [0.3, LEDGE_H, -2.6];
const blockZ = (t: number) => kf(t, [[0, -9.6], [3.0, -7.2, 'linear'], [12, -6.2, 'linear']]);
const blockY = (t: number) => -0.12 + Math.sin(t * 1.3) * 0.05;
/** Den störtades position i luften under hoppet (0..1 längs bågen): från blocket upp på hyllan. */
const arc = (p: number, from: Vec3): Vec3 => [from[0] + (JUMP_END[0] - from[0]) * p, from[1] + (JUMP_END[1] - from[1]) * p + 3.4 * Math.sin(p * Math.PI), from[2] + (JUMP_END[2] - from[2]) * p];
/** Där han lämnar blocket — blockets läge i hoppögonblicket. */
const JUMP_START: Vec3 = [0.4, blockY(JUMP_FROM) + 0.3, blockZ(JUMP_FROM)];
const hitPoint = (): Vec3 => arc(span(HIT, JUMP_FROM, JUMP_TO), JUMP_START);
/** Voltens vinkel i luften; vid träffen är batet nästan på sidan. */
const flip = (t: number) => -span(t, JUMP_FROM, JUMP_TO) * Math.PI * 4;
const FLIP_AT_HIT = Math.atan2(Math.sin(flip(HIT)), Math.cos(flip(HIT)));
/** Där sabeln landar i lavan, och när. */
const SABER_SINK: Vec3 = [1.9, LAVA_Y, -5.6];
const SABER_FALL = 1.2;

/* ── Brus: samma i shader och på CPU ── */

const NOISE = /* glsl */ `
float h21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
vec2 h22(vec2 p) { float n = h21(p); return vec2(n, h21(p + n)); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), u.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
/* avståndet till närmaste cellgräns (F2 - F1): små värden är sprickorna mellan skorpans flak */
float cracks(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), r = g + h22(i + g) - f;
    float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
  }
  return sqrt(d2) - sqrt(d1);
}
/* glödens färg efter värme: mörkröd, orange, gul, nästan vit */
vec3 heatRamp(float h) {
  vec3 c = mix(vec3(0.5, 0.02, 0.0), vec3(1.0, 0.22, 0.02), smoothstep(0.05, 0.45, h));
  c = mix(c, vec3(1.0, 0.62, 0.18), smoothstep(0.5, 0.85, h));
  return mix(c, vec3(1.0, 0.92, 0.72), smoothstep(0.9, 1.0, h));
}`;

type Uniforms = Record<string, { value: unknown }>;
/** Ett standardmaterial med världspositionen och uv som varyings och brusfunktionerna i fragmentet. */
function shaded(mat: THREE.MeshStandardMaterial, uniforms: Uniforms, inject: { color?: string; emissive?: string; roughness?: string }) {
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    const decl = Object.keys(uniforms).map((k) => `uniform ${typeof uniforms[k].value === 'number' ? 'float' : 'vec2'} ${k};`).join('\n');
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;\nvarying vec2 vUv0;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvUv0 = uv;');
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWorld;\nvarying vec2 vUv0;\n${decl}\n${NOISE}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${inject.color ?? ''}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${inject.roughness ?? ''}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${inject.emissive ?? ''}`);
  };
  return mat;
}

/**
 * Lava: flak av svart skorpa som driver med strömmen, glödande sprickor mellan dem (bredare och
 * ljusare där skorpan är tunn) och öppna fält av smält sten med mörkare, svalare slingor i.
 * Som fall (`uVertical` 1, brus i världens xy) är den nästan bara smält sten, utdragen i strimmor,
 * med trasiga kanter som stelnat. På håll jämnas sprickorna ut till ett sken, annars blir de glitter.
 * `uCrust` hur mycket som är skorpa (0 = allt smält). Tiden sätts av scenen: ultrarapiden når lavan.
 */
function lavaMaterial({ scale, flow, crust, vertical = 0, glowK = 4 }: { scale: number; flow: [number, number]; crust: number; vertical?: number; glowK?: number }) {
  const u = { uTime: { value: 0 }, uScale: { value: scale }, uFlow: { value: new THREE.Vector2(...flow) }, uCrust: { value: crust }, uVertical: { value: vertical }, uGlow: { value: glowK } };
  const mat = shaded(new THREE.MeshStandardMaterial({ color: '#2e2622', roughness: 0.85 }), u, {
    color: `
      float lavaHeat;
      if (uVertical > 0.5) {
        vec2 lp = vWorld.xy * vec2(1.6, 0.3) * uScale - uFlow * uTime;
        float streak = fbm(lp * vec2(1.0, 1.0) + vec2(fbm(lp * 0.5) * 2.0, 0.0));
        lavaHeat = 0.45 + 0.55 * smoothstep(0.25, 0.75, streak);
        lavaHeat *= 1.0 - 0.5 * smoothstep(0.55, 0.8, fbm(lp * 2.5 + 7.0));
        float side = min(vUv0.x, 1.0 - vUv0.x) + (fbm(vec2(vUv0.x * 6.0, vWorld.y * 0.8 - uTime * 0.3)) - 0.5) * 0.35;
        if (side < 0.02) discard;
        lavaHeat *= smoothstep(0.02, 0.2, side);
      } else {
        vec2 lp = vWorld.xz * uScale - uFlow * uTime;
        vec2 warp = vec2(fbm(lp * 0.4), fbm(lp * 0.4 + vec2(5.2, 1.3)));
        vec2 lq = lp + (warp - 0.5) * 2.4;
        float thin = fbm(lq * 0.6 + 11.0);
        float edge = cracks(lq * 1.4 + (warp - 0.5) * 0.6);
        float width = 0.012 + 0.07 * smoothstep(0.35, 0.75, thin);
        float aa = fwidth(edge);
        float crack = (1.0 - smoothstep(width * 0.4 - aa, width + aa, edge)) * min(1.0, width / max(aa, 1e-4));
        float halo = exp(-edge * 18.0) * 0.25 * thin;
        float along = 0.55 + 0.45 * fbm(lq * 5.0 + uTime * 0.3);
        float open = smoothstep(uCrust + 0.04, uCrust - 0.12, fbm(lq * 0.18 + 3.7));
        float swirl = fbm(lq * vec2(2.2, 1.2) - uFlow * uTime * 1.5 + warp * 3.0);
        float pool = mix(0.45, 0.88, smoothstep(0.35, 0.75, swirl)) * (1.0 - 0.75 * smoothstep(0.5, 0.8, fbm(lq * 3.5 + 2.0)));
        float far = smoothstep(6.0, 26.0, length(vWorld - cameraPosition));
        lavaHeat = mix(mix(max(crack * along, halo), pool, open), mix(0.16, 0.6, open), far);
      }
      lavaHeat = clamp(lavaHeat * (0.92 + 0.08 * sin(uTime * 1.7 + vWorld.x)), 0.0, 1.0);
      diffuseColor.rgb *= (1.0 - lavaHeat) * (0.6 + 0.6 * fbm(vWorld.xz * 3.0));`,
    roughness: 'roughnessFactor = mix(roughnessFactor, 0.35, lavaHeat);',
    emissive: 'totalEmissiveRadiance = heatRamp(lavaHeat) * lavaHeat * lavaHeat * uGlow;',
  });
  return { mat, time: u.uTime };
}

/**
 * Basalt: mörk, knölig sten (stenkornet som bump) som glöder i sprickorna nära lavan, där värmen
 * från den smälta stenen når upp. `uLine` = lavans höjd.
 */
const basalt = (() => {
  let m: THREE.MeshStandardMaterial | undefined;
  return () => (m ??= shaded(new THREE.MeshStandardMaterial({ color: '#3a3230', map: stoneGrain(), bumpMap: stoneGrain(), bumpScale: 4, roughness: 0.95 }), { uLine: { value: LAVA_Y } }, {
    emissive: `
      float bNear = pow(smoothstep(uLine + 0.45, uLine, vWorld.y), 2.0);
      vec2 bp = vWorld.xz * 1.6 + vWorld.y * 0.9;
      float bCrack = 1.0 - smoothstep(0.006, 0.04, cracks(bp + vec2(fbm(bp * 0.7), fbm(bp * 0.7 + 4.0)) * 1.5));
      totalEmissiveRadiance += heatRamp(0.2 + 0.6 * bNear) * bNear * (0.2 + 2.5 * bCrack * fbm(bp * 3.0));`,
  }));
})();

/** Värdebrus i 3D för klippornas form (CPU). */
function noise3(seed: number) {
  const h = (x: number, y: number, z: number) => {
    let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 1274126177) ^ Math.imul(seed, 974634);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  const s = (x: number) => x * x * (3 - 2 * x);
  return (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = s(x - xi), v = s(y - yi), w = s(z - zi);
    const l = (a: number, b: number, p: number) => a + (b - a) * p;
    const c = (dx: number, dy: number) => l(h(xi + dx, yi + dy, zi), h(xi + dx, yi + dy, zi + 1), w);
    return l(l(c(0, 0), c(1, 0), u), l(c(0, 1), c(1, 1), u), v);
  };
}

/**
 * Knölig sten ur en enkel form: varje hörn flyttas av ett brusfält (samma punkt flyttas lika, så
 * sömmarna håller). `flatTop` dämpar höjdled överst, så att man kan stå på klippan.
 */
function craggy(geo: THREE.BufferGeometry, { seed, amp, freq, flatTop }: { seed: number; amp: number; freq: number; flatTop?: number }) {
  const n = [noise3(seed), noise3(seed + 1), noise3(seed + 2)];
  const fbm = (f: (x: number, y: number, z: number) => number, x: number, y: number, z: number) => f(x, y, z) * 0.55 + f(x * 2.1, y * 2.1, z * 2.1) * 0.3 + f(x * 4.3, y * 4.3, z * 4.3) * 0.15 - 0.5;
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const fx = x * freq, fy = y * freq, fz = z * freq;
    const top = flatTop !== undefined && y >= flatTop - 1e-3 ? 0.12 : 1;
    p.setXYZ(i, x + fbm(n[0], fx, fy, fz) * amp * 2, y + fbm(n[1], fx, fy, fz) * amp * 2 * top, z + fbm(n[2], fx, fy, fz) * amp * 2);
  }
  geo.computeVertexNormals();
  return geo;
}

function Rock({ geo, position, rotation }: { geo: THREE.BufferGeometry; position: Vec3; rotation?: Vec3 }) {
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} position={position} rotation={rotation} material={basalt()} />;
}

/* ── Himlen, röken och glöden ── */

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  [[0, '#050203'], [0.35, '#1a0604'], [0.47, '#5a1606'], [0.52, '#c2440e'], [0.56, '#3a0c04'], [1, '#0a0302']].forEach(([at, col]) => grad.addColorStop(at as number, col as string));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** En rökpuff: mjuk, ojämn kant. Gråskala, materialet färgar. */
const puffTexture = (() => {
  let tex: THREE.CanvasTexture | undefined;
  return () => {
    if (tex) return tex;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const r = rng(404);
    for (let i = 0; i < 26; i++) {
      const x = 64 + (r() - 0.5) * 50, y = 64 + (r() - 0.5) * 50, rad = 18 + r() * 30;
      const grad = g.createRadialGradient(x, y, 0, x, y, rad);
      grad.addColorStop(0, 'rgba(255,255,255,0.22)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    }
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();

/**
 * En rökpelare: puffar som stiger, växer och tunnas ut. Lambert, så att lavan och utbrotten lyser
 * upp undersidan i orange medan toppen är svart. `hot` tänder puffarnas nederdel själv (eldsken).
 */
function Plume({ origin, t, count = 14, height = 14, spread = 3, size = 4, speed = 0.6, color = '#2a2422', seed = 1, opacity = 0.85, fire = 0 }: { origin: Vec3; t: number; count?: number; height?: number; spread?: number; size?: number; speed?: number; color?: string; seed?: number; opacity?: number; fire?: number }) {
  const puffs = useMemo(() => { const r = rng(seed); return Array.from({ length: count }, (_, i) => ({ ph: i / count + r() * 0.05, dx: (r() - 0.5) * spread, dz: (r() - 0.5) * spread, spin: r() * 6, s: 0.7 + r() * 0.6 })); }, [count, seed, spread]);
  const mats = useMemo(() => puffs.map(() => new THREE.MeshLambertMaterial({ map: puffTexture(), color, transparent: true, depthWrite: false, emissive: '#ff5a10', emissiveIntensity: 0 })), [puffs, color]);
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);
  return (
    <group position={origin}>
      {puffs.map((p, i) => {
        const life = (t * speed / height + p.ph) % 1;
        const k = size * p.s * (0.45 + life * 1.4);
        mats[i].opacity = opacity * Math.min(1, life * 6) * (1 - life) ** 1.5;
        mats[i].emissiveIntensity = fire * (1 - life) ** 3;
        return (
          <Billboard key={i} position={[p.dx * (0.3 + life), life * height, p.dz * (0.3 + life)]}>
            <mesh rotation={[0, 0, p.spin + t * 0.05]} scale={[k, k, k]} material={mats[i]}><planeGeometry args={[1, 1]} /></mesh>
          </Billboard>
        );
      })}
    </group>
  );
}

const EMBER_VERT = /* glsl */ `
uniform float uTime; uniform float uHeight; uniform float uSize;
attribute vec4 aSeed;
varying float vLife; varying float vHot;
void main() {
  float life = fract(uTime * (0.08 + 0.12 * aSeed.w) + aSeed.w * 7.0);
  vec3 p = position;
  p.y += life * uHeight;
  p.x += sin(uTime * (0.7 + aSeed.x) + aSeed.y * 30.0) * 0.6 * life + sin(uTime * 3.1 + aSeed.z * 20.0) * 0.08;
  p.z += cos(uTime * (0.6 + aSeed.z) + aSeed.x * 30.0) * 0.6 * life;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  /* glöden flimrar och slocknar på vägen upp */
  vHot = (1.0 - life) * (0.6 + 0.4 * sin(uTime * 17.0 + aSeed.y * 50.0));
  vLife = life;
  gl_PointSize = uSize * (0.4 + aSeed.x) * (1.0 - life * 0.6) * (300.0 / -mv.z);
}`;
const EMBER_FRAG = /* glsl */ `
varying float vLife; varying float vHot;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  vec3 c = mix(vec3(1.0, 0.25, 0.03), vec3(1.0, 0.8, 0.45), vHot);
  gl_FragColor = vec4(c * (1.0 + 5.0 * vHot) * a, a * min(1.0, vLife * 8.0) * (1.0 - vLife));
}`;

/** Glöd som stiger ur lavan: punkter i en shader, slumpade en gång, flyttade av tiden. */
function Embers({ t, count, area, position, height = 8, size = 0.05 }: { t: number; count: number; area: Vec3; position: Vec3; height?: number; size?: number }) {
  const { geo, mat } = useMemo(() => {
    const r = rng(count * 7 + area[0]);
    const pos = new Float32Array(count * 3), seed = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      pos.set([(r() - 0.5) * area[0], (r() - 0.5) * area[1], (r() - 0.5) * area[2]], i * 3);
      seed.set([r(), r(), r(), r()], i * 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    const mat = new THREE.ShaderMaterial({ vertexShader: EMBER_VERT, fragmentShader: EMBER_FRAG, uniforms: { uTime: { value: 0 }, uHeight: { value: height }, uSize: { value: size } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    return { geo, mat };
  }, [count, area, height, size]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  mat.uniforms.uTime.value = t;
  return <points geometry={geo} material={mat} position={position} frustumCulled={false} />;
}

/* ── Miljön ── */

const MOUNTAINS: [number, number, number, number][] = [[-9, 9, 9, 5], [-3, 7, 11, 4], [3.5, 10, 10, 6], [9.5, 8, 8.5, 4.5], [-13, 6, 6, 3.4], [13.5, 6.5, 6.5, 3.8]];
const BOULDERS: [number, number, number, number][] = [[-3.2, 0.1, -1.4, 0.5], [2.8, 0.05, -0.6, 0.4], [-1.9, 0.02, 1.6, 0.3], [3.6, 0.1, 1.2, 0.55], [-4.2, 0.1, -3.6, 0.6], [2.4, LEDGE_H, 0.6, 0.22], [-2.6, LEDGE_H, -0.2, 0.3]];
/** Klipporna på andra sidan lavan, med lavafall nerför framsidan. */
const CLIFFS: { pos: Vec3; size: Vec3; fall: number; seed: number }[] = [
  { pos: [-15, 5, -36], size: [16, 13, 5], fall: 3.0, seed: 31 },
  { pos: [14, 6.5, -42], size: [18, 16, 5], fall: 2.2, seed: 32 },
  { pos: [-1, 3.5, -54], size: [20, 10, 6], fall: 4.0, seed: 33 },
];
const VOLCANO: Vec3 = [-26, 0, -78];

function Environs({ t }: { t: number }) {
  const sky = useMemo(skyTexture, []);
  useEffect(() => () => sky.dispose(), [sky]);
  const sea = useMemo(() => lavaMaterial({ scale: 0.9, flow: [0.05, 0.12], crust: 0.3 }), []);
  const falls = useMemo(() => lavaMaterial({ scale: 1, flow: [0, -1.4], crust: 0, vertical: 1, glowK: 3.2 }), []);
  useEffect(() => () => { sea.mat.dispose(); falls.mat.dispose(); }, [sea, falls]);
  sea.time.value = t;
  falls.time.value = t;
  const geos = useMemo(() => ({
    bank: craggy(new THREE.BoxGeometry(34, 1.2, 26, 48, 4, 36), { seed: 1, amp: 0.12, freq: 0.9, flatTop: 0.6 }),
    ledge: craggy(new THREE.BoxGeometry(6.5, LEDGE_H, 4.4, 26, 6, 18), { seed: 2, amp: 0.1, freq: 1.4, flatTop: LEDGE_H / 2 }),
    lip: craggy(new THREE.BoxGeometry(6.8, 0.6, 1.1, 26, 3, 6), { seed: 3, amp: 0.12, freq: 1.8 }),
    shore: craggy(new THREE.BoxGeometry(22, 0.8, 1.8, 48, 3, 6), { seed: 4, amp: 0.2, freq: 1.2 }),
    boulders: BOULDERS.map(([, , , s], i) => craggy(new THREE.IcosahedronGeometry(s, 4), { seed: 10 + i, amp: s * 0.25, freq: 2.5 / s })),
    mountains: MOUNTAINS.map(([, h, , r], i) => craggy(new THREE.ConeGeometry(r, h, 24, 10), { seed: 20 + i, amp: 0.6, freq: 0.5 })),
    cliffs: CLIFFS.map((c) => craggy(new THREE.BoxGeometry(...c.size, 24, 16, 6), { seed: c.seed, amp: 0.9, freq: 0.25 })),
    volcano: craggy(new THREE.CylinderGeometry(4.5, 22, 18, 40, 12, true), { seed: 40, amp: 1.6, freq: 0.12 }),
  }), []);
  return (
    <group>
      <fogExp2 attach='fog' args={['#3a1006', 0.026]} />
      <mesh scale={[-1, 1, 1]}><sphereGeometry args={[100, 32, 16]} /><meshBasicMaterial map={sky} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
      {/* lavahavet, och vattenfallen nerför klipporna på andra sidan */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LAVA_Y, -45]} material={sea.mat}><planeGeometry args={[180, 90]} /></mesh>
      {CLIFFS.map((c, i) => (
        <group key={i}>
          <Rock geo={geos.cliffs[i]} position={c.pos} />
          <mesh position={[c.pos[0] + 1, (c.pos[1] + c.size[1] / 2 + LAVA_Y) / 2, c.pos[2] + c.size[2] / 2 + 1.0]} material={falls.mat}><planeGeometry args={[c.fall, c.pos[1] + c.size[1] / 2 - LAVA_Y, 1, 1]} /></mesh>
          <mesh position={[c.pos[0] + 1, LAVA_Y + 0.05, c.pos[2] + c.size[2] / 2 + 1.4]} rotation={[-Math.PI / 2, 0, 0]} material={glow('#ff7a20', 4, 0.8)}><circleGeometry args={[c.fall * 0.8, 24]} /></mesh>
          <Plume origin={[c.pos[0] + 1, LAVA_Y, c.pos[2] + c.size[2] / 2 + 1.6]} t={t + i * 3} count={8} height={10} spread={c.fall} size={4} speed={0.9} seed={50 + i} color='#6a5650' opacity={0.5} fire={1.5} />
        </group>
      ))}
      {/* vulkanen i fonden: en krater som sprutar glöd, under en pelare av aska */}
      <Rock geo={geos.volcano} position={[VOLCANO[0], 8.4, VOLCANO[2]]} />
      <mesh position={[VOLCANO[0], 17.2, VOLCANO[2]]} material={glow('#ff6a14', 6, 0.9)}><sphereGeometry args={[4.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
      <pointLight position={[VOLCANO[0], 20, VOLCANO[2] + 6]} color='#ff6a1a' intensity={900} distance={60} decay={2} />
      <Plume origin={[VOLCANO[0], 17, VOLCANO[2]]} t={t} count={18} height={40} spread={8} size={16} speed={2.2} seed={60} fire={3} />
      <Embers t={t} count={260} area={[8, 1, 8]} position={[VOLCANO[0], 17, VOLCANO[2]]} height={30} size={0.9} />
      <Lit>
      {/* banken vinnaren kom upp på: svart sten, kanten ner i lavan vid z ≈ -4,2 */}
      <Rock geo={geos.bank} position={[0, -0.6, 8.8]} />
      <Rock geo={geos.shore} position={[0, -0.32, -4.3]} rotation={[0.35, 0, 0]} />
      {MOUNTAINS.map(([x, h, z], i) => <Rock key={i} geo={geos.mountains[i]} position={[x, h / 2 - 0.3, z]} />)}
      {/* klipphyllan: vinnaren står högre än lavan och blocket */}
      <Rock geo={geos.ledge} position={[0, LEDGE_H / 2 - 0.02, -1.2]} />
      <Rock geo={geos.lip} position={[0, LEDGE_H - 0.45, -3.5]} rotation={[-0.5, 0, 0]} />
      {BOULDERS.map(([x, y, z], i) => <Rock key={i} geo={geos.boulders[i]} position={[x, y, z]} rotation={[i, i * 0.7, 0]} />)}
      </Lit>
      {/* glöd över lavan närmast, och aska som driver i luften runt hyllan */}
      <Embers t={t} count={500} area={[26, 0.4, 22]} position={[0, LAVA_Y, -15]} height={9} size={0.06} />
      <Embers t={t + 40} count={120} area={[8, 2, 6]} position={[0, 0.4, -2.5]} height={5} size={0.035} />
      <Plume origin={[-6, LAVA_Y, -11]} t={t} count={10} height={9} spread={4} size={5} speed={0.5} seed={70} color='#3a302c' opacity={0.45} fire={0.6} />
      <Plume origin={[7, LAVA_Y, -14]} t={t + 7} count={10} height={9} spread={4} size={5} speed={0.5} seed={71} color='#3a302c' opacity={0.45} fire={0.6} />
    </group>
  );
}

/**
 * Ljuset kommer underifrån: lavan som ett glödande golv (hemisfär och punktljus vid kanten), ett
 * utbrott långt bort som kastar skuggorna, och en miljökarta byggd av samma glöd för reflexerna.
 */
function Lights({ t }: { t: number }) {
  const throb = 1 + 0.08 * Math.sin(t * 2.3) + 0.05 * Math.sin(t * 5.7);
  return (
    <>
      <hemisphereLight args={['#2a0c08', '#ff4a10', 0.55]} />
      <directionalLight position={[-7, 6, -24]} color='#ff8a40' intensity={2.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.03}
        shadow-camera-left={-9} shadow-camera-right={9} shadow-camera-top={9} shadow-camera-bottom={-9} shadow-camera-near={1} shadow-camera-far={60} />
      {/* lavan under hyllans kant och runt blocket lyser upp ansiktena underifrån */}
      <pointLight position={[0, 0.1, -5.2]} color='#ff5a12' intensity={38 * throb} distance={14} decay={2} />
      <pointLight position={[0.4, 0.2, blockZ(t) - 1.6]} color='#ff6a1a' intensity={26 * throb} distance={10} decay={2} />
      <pointLight position={[-5, 0.4, -9]} color='#ff7a2a' intensity={40 * throb} distance={18} decay={2} />
      {/* en kall, svag motljuskant från himlen: annars blir de svarta mot den svarta klippan */}
      <directionalLight position={[3, 9, 10]} color='#6a5a70' intensity={0.35} />
      <Environment resolution={256} frames={1} environmentIntensity={0.6}>
        <color attach='background' args={['#0a0302']} />
        <Lightformer form='rect' intensity={2.2} color='#ff4a0a' position={[0, -4, -10]} rotation-x={-Math.PI / 2} scale={[60, 40, 1]} />
        <Lightformer form='rect' intensity={4} color='#ff7a20' position={[-8, 3, -30]} scale={[30, 4, 1]} />
        <Lightformer form='rect' intensity={0.3} color='#5a2a20' position={[0, 10, 0]} rotation-x={Math.PI / 2} scale={[40, 40, 1]} />
        <Lightformer form='rect' intensity={0.6} color='#3a1a14' position={[0, 2, 14]} rotation-y={Math.PI} scale={[30, 6, 1]} />
      </Environment>
    </>
  );
}

/** Det flytande blocket: en flak av skorpa som guppar på lavan; basalten glöder där den doppas. */
function Block({ t }: { t: number }) {
  const geo = useMemo(() => craggy(new THREE.BoxGeometry(2.3, 0.75, 2.3, 12, 4, 12), { seed: 5, amp: 0.08, freq: 2, flatTop: 0.375 }), []);
  return (
    <group position={[0.4, blockY(t) - 0.1, blockZ(t)]} rotation={[Math.sin(t * 0.9) * 0.02, 0, Math.cos(t * 1.1) * 0.025]}>
      <Rock geo={geo} position={[0, 0, 0]} />
    </group>
  );
}

/** Pingisbollen: matt, lite blank. */
function Ball({ position, spin }: { position: Vec3; spin: number }) {
  return <mesh position={position} rotation={[spin, spin * 0.3, 0]}><sphereGeometry args={[0.16, 24, 16]} /><meshPhysicalMaterial color='#fbf7ee' roughness={0.5} clearcoat={0.2} clearcoatRoughness={0.5} /></mesh>;
}

/**
 * Den störtade i två delar. Överhalvan (ögonen) flyger iväg och landar på rygg på hyllan.
 * Underhalvan (munnen, handtaget, manteln) landar på foten och står kvar och vinglar.
 */
function SplitRacket({ t }: { t: number }) {
  const d = t - HIT;
  const hp = hitPoint();
  const heat = Math.max(0, 1 - d / 3.2);
  const fallTop = ballistic(d, hp[1] + 1.25 - LEDGE_H, 2.6, 14, 0.06, 0.25, 2);
  const fallBottom = ballistic(d, hp[1] - LEDGE_H, 1.0, 14, 0, 0.2, 2);
  const tTop: Vec3 = [hp[0] + 0.5 * Math.min(d, 1.1), LEDGE_H + fallTop.y, hp[2] + 0.9 * Math.min(d, 1.1)];
  const tBottom: Vec3 = [hp[0] - 0.35 * Math.min(d, 0.8), LEDGE_H + fallBottom.y, hp[2] + 0.25 * Math.min(d, 0.8)];
  const rTop = fallTop.moving ? FLIP_AT_HIT - d * 7 : -Math.PI / 2 + 0.1;
  const upright = ease(span(d, 0, 0.55), 'out');
  const wobble = Math.sin(d * 9) * 0.18 * Math.exp(-d * 1.4) * span(d, 0.4, 0.6);
  const mood = d < 1.4 ? 'shock' : t > 9.6 ? 'sad' : 'grim';
  const gear = { sith: true, gaze: [0.2, -0.35] as [number, number] };
  // manteln blir kvar där den störtade landade och sjunker ihop
  const fallRobe = ballistic(d, hp[1] - LEDGE_H, 0.6, 14, 0, 0.1, 1);
  return (
    <group>
      <group position={tTop} rotation={[rTop, 0.5 * Math.min(d, 1), fallTop.moving ? d * 2 : 0.15]}>
        <group position={[0, -1.05, 0]}><RacketHalf part='top' color={DEPOSED_COLOR} mood={mood} heat={heat} gear={gear} /></group>
      </group>
      <group position={[tBottom[0], tBottom[1] + 1.0, tBottom[2]]} rotation={[FLIP_AT_HIT * (1 - upright) + wobble, 0.4, wobble * 0.5]}>
        <group position={[0, -1.0, 0]}><RacketHalf part='bottom' color={DEPOSED_COLOR} mood={mood} heat={heat} gear={gear} /></group>
      </group>
      <group position={[hp[0] + 0.8 * Math.min(d, 0.6) / 0.6, LEDGE_H + fallRobe.y, hp[2] - 0.2]} rotation={[FLIP_AT_HIT * (1 - upright), 0.4, 0]}>
        <RobeHeap crumple={ease(span(d, 0.3, 0.9), 'out')} master />
      </group>
      <Sparks position={hp} age={d} seed={66} />
      <Sparks position={[hp[0] + 0.3, hp[1] + 0.2, hp[2]]} age={d - 0.05} seed={67} />
      {/* snittets glöd lyser upp hyllan en stund */}
      <pointLight position={[tTop[0], tTop[1] + 0.3, tTop[2]]} color='#ff6a1a' intensity={d >= 0 ? 4 * heat : 0} distance={3} decay={2} />
    </group>
  );
}

/** Där sabeln slår ner i lavan: stänk av smält sten, en blixt och ånga. `age` = sekunder sedan nedslaget. */
function Splash({ age, t }: { age: number; t: number }) {
  const r = rng(808);
  const on = age >= 0 && age <= 3.5;
  return (
    <group position={SABER_SINK}>
      {on && age < 0.9 && Array.from({ length: 16 }, (_, i) => {
        const a = r() * Math.PI * 2, v = 1 + r() * 1.8, up = 2.5 + r() * 2.5;
        const y = up * age - 4.9 * age * age;
        if (y < 0) return null;
        const k = 1 - age / 0.9;
        return <mesh key={i} position={[Math.cos(a) * v * age, y, Math.sin(a) * v * age]} scale={[k, k * 1.4, k]} material={glow('#ffa040', 5, 1)}><sphereGeometry args={[0.04, 8, 6]} /></mesh>;
      })}
      {on && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={1 + age * 0.8} material={glow('#ffb060', 3, 0.8)}><ringGeometry args={[0.2, 0.32, 32]} /></mesh>}
      <pointLight position={[0, 0.5, 0]} color='#ff9a40' intensity={decay(age, 30, 1.2)} distance={6} decay={2} />
      <Plume origin={[0, 0, 0]} t={t} count={6} height={3} spread={0.6} size={1.2} speed={1.4} seed={90} color='#c8bcb4' opacity={on ? 0.6 * Math.min(1, age * 3) * (1 - age / 3.5) : 0} fire={0.8} />
    </group>
  );
}

export const mustafar: Scene = {
  key: 'mustafar', duration: 13.4,
  photo: true,
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
    if (t < 1.6) {
      // snett ovanifrån, bakom vinnaren: hyllan, lavan och blocket i samma bild
      const p = ease(span(t, 0, 1.6), 'out');
      return { position: lerp3([2.8, 4.4, 2.6], [2.2, 3.9, 1.6], p), lookAt: [0.2, 0.7, -6.5], fov: 44, snap: true };
    }
    if (t < 3.0) {
      // vinnarens ansikte, underifrån från lavans håll — höjden syns
      const p = ease(span(t, 1.6, 3.0), 'inOut');
      return { position: lerp3([1.5, 1.0, -4.9], [1.1, 1.2, -4.4], p), lookAt: [0, LEDGE_H + 1.1, -0.9], fov: 34, snap: true };
    }
    if (t < 4.6) {
      const z = blockZ(t);
      return { position: [2.9, 1.0, z + 1.8], lookAt: [0.4, 1.0, z], fov: 36, snap: true };
    }
    if (t < HIT) {
      const a = arc(span(t, JUMP_FROM, JUMP_TO), JUMP_START);
      return { position: [6.0, 2.6, a[2] + 0.8], lookAt: [a[0], Math.max(1.0, a[1] - 0.4), a[2]], fov: 42, snap: true };
    }
    if (t < 7.9) {
      const hp = hitPoint();
      return { position: [2.6, 2.3, hp[2] + 1.6], lookAt: [hp[0], hp[1] - 0.2, hp[2]], fov: 38, snap: true, shake: decay(t - HIT, 0.03, 0.4) };
    }
    const p = ease(span(t, 9.8, 11.6), 'inOut');
    // slutbilden: snett ovanifrån så halvorna och vinnaren syns tillsammans, med berget bakom honom
    return { position: lerp3([2.8, LEDGE_H + 2.8, -4.6], [2.3, LEDGE_H + 2.4, -4.0], p), lookAt: lerp3([0.1, LEDGE_H + 0.3, -2.6], [0, LEDGE_H + 0.9, -1.2], p), fov: 36, snap: true };
  },
  Scene: ({ t }) => {
    const jump = span(t, JUMP_FROM, JUMP_TO);
    const inAir = t >= JUMP_FROM && t < HIT;
    const air = arc(jump, JUMP_START);
    const split = t >= HIT;
    // vinnaren: kastar upp bollen och smashar
    const toss = span(t, 5.2, 5.8);
    const swing = kf(t, [[5.7, 0.25], [5.95, 0.95, 'inOut'], [6.15, -1.25, 'in'], [6.9, -0.1, 'out']]);
    const ballFly = span(t, 6.15, HIT);
    const hp = hitPoint();
    const ballPos: Vec3 = t < 6.15 ? [0.95, LEDGE_H + 1.35 + toss * 0.95 - (t > 5.8 ? (t - 5.8) * 1.2 : 0), -0.85] : split ? [hp[0] - (t - HIT) * 2.6, Math.max(LAVA_Y, hp[1] + (t - HIT) * 1.5 - 4 * (t - HIT) * (t - HIT)), hp[2] - (t - HIT) * 2.6] : lerp3([0.95, LEDGE_H + 1.9, -0.85], hp, ballFly);
    const turn = ease(span(t, 10.0, 11.8), 'inOut');
    // sabeln vinklas ner mot blocket, lyfts i smashen och sänks när det är över
    const saberSwing = Math.max(0, Math.min(1, -swing * 0.6)) + 0.15 * (1 - span(t, 9.5, 11));
    // den störtades sabel tumlar ner i lavan efter träffen och slocknar när den sjunker
    const saberDrop = split ? Math.min(1, (t - HIT) / SABER_FALL) : 0;
    const saberPos: Vec3 = lerp3([hp[0] + 0.5, hp[1], hp[2]], SABER_SINK, ease(saberDrop, 'in'));
    const breath = Math.sin(t * 1.6) * 0.015;
    const deposed = { robe: true, master: true, hood: false, sith: true, weapon: 'saber' as const, saber: RED, gaze: [0, -0.25] as [number, number], sway: [Math.sin(t * 1.1) * 0.04, Math.cos(t * 0.9) * 0.03] as [number, number] };
    return (
      <>
        <Environs t={t} />
        <Lights t={t} />
        <Lit>
          <Block t={t} />
          {/* vinnaren på hyllan, vänd mot lavan, sabeln neråt mot blocket */}
          <RealRacket position={WINNER} rotation={[breath, Math.PI + turn * 1.3, swing * 0.15]} color={WINNER_COLOR} mood={t > 9.5 ? 'sad' : 'grim'} t={t}
            gear={{ robe: true, hood: true, weapon: 'saber', saber: BLUE, swing: saberSwing, gaze: t < 4.6 ? [0, 0.3] : [0.1, 0.1], blink: t > 11 ? span(t, 11, 11.4) : 0, sway: [swing * 0.06 + breath, Math.sin(t * 0.8) * 0.03] }} />
          {t > 5.2 && t < HIT + 2.4 && <Ball position={ballPos} spin={t * 12} />}
          {/* den störtade: på blocket, i luften med volt, eller i två delar */}
          {!split && !inAir && <RealRacket position={[0.4, blockY(t) + 0.28, blockZ(t)]} rotation={[0, 0, Math.sin(t * 1.3) * 0.02]} color={DEPOSED_COLOR} mood='grim' t={t} gear={deposed} />}
          {inAir && (
            <group position={[air[0], air[1] + 1.0, air[2]]} rotation={[flip(t), 0, 0]}>
              <RealRacket position={[0, -1.0, 0]} color={DEPOSED_COLOR} mood='grim' t={t} gear={{ ...deposed, swing: 0.6, sway: [0.3, 0] }} />
            </group>
          )}
          {/* halvorna finns från början, under lavan: shaders kompileras i förväg och träffen hackar inte */}
          <group position={split ? [0, 0, 0] : [0, -30, 0]}><SplitRacket t={Math.max(t, HIT)} /></group>
        </Lit>
        {/* den fallande sabeln är på plats (släckt) hela scenen, så att antalet ljus aldrig ändras */}
        <group position={split ? saberPos : [0, -30, 0]} rotation={[(t - HIT) * 9, 0, (t - HIT) * 5]}><LightSaber color={RED} t={t} on={split ? 1 - saberDrop : 0} position={[0, 0, 0]} rotation={[0, 0, 0]} /></group>
        <Splash age={t - HIT - SABER_FALL} t={t} />
      </>
    );
  },
};
