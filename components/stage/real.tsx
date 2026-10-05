'use client';
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from './anim';
import type { Mood } from './props';
import type { Vec3 } from './types';

/*
 * Fotolägets rekvisita: samma skådespelare som i props.tsx, men byggda som riktiga föremål.
 * Racketen är ett tävlingsbat (plywood, gummi med svamp, utsvängt trähandtag) med glasögon,
 * ewokerna har päls, kronan är guld med sammet, pärlor och stenar. Texturerna ritas på canvas.
 */

// ponytail: texturer, geometrier och material skapas en gång per sidladdning och delas av alla figurer (några MB, släpps aldrig).
function once<T>(make: () => T): () => T {
  let v: T | undefined;
  return () => (v ??= make());
}

function canvasTexture(w: number, h: number, seed: number, draw: (g: CanvasRenderingContext2D, r: () => number) => void, repeat: [number, number] = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, rng(seed));
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Sten och marmor: korn och ådror, ritade med omlott så att texturen kaklar sömlöst. */
function stoneTexture(seed: number, veins: number, repeat: number) {
  const S = 512;
  return canvasTexture(S, S, seed, (g, r) => {
    g.fillStyle = '#bdbdbd'; g.fillRect(0, 0, S, S);
    const wrapped = (draw: () => void) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) { g.save(); g.translate(dx, dy); draw(); g.restore(); } };
    for (let i = 0; i < 4000; i++) {
      const v = Math.round(140 + r() * 115), x = r() * S, y = r() * S, w = 1 + r() * 5;
      g.fillStyle = `rgba(${v},${v},${v},0.3)`; g.fillRect(x, y, w, w);
    }
    g.lineCap = 'round';
    for (let i = 0; i < veins; i++) {
      const pts: [number, number][] = [[r() * S, r() * S]];
      for (let k = 0; k < 30; k++) { const [x, y] = pts[k]; pts.push([x + (r() - 0.25) * 22, y + (r() - 0.5) * 22]); }
      const a = 0.12 + r() * 0.3, w = 0.6 + r() * 2.4;
      wrapped(() => { g.strokeStyle = `rgba(40,40,52,${a})`; g.lineWidth = w; g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); });
    }
  }, [repeat, repeat]);
}
export const stoneGrain = once(() => stoneTexture(7, 6, 2));
export const marble = once(() => stoneTexture(11, 40, 6));

/** Ådrat trä: långa, lätt slingrande årsringar längs v, med porer. */
export const wood = once(() => canvasTexture(512, 512, 5, (g, r) => {
  g.fillStyle = '#c99a62'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 90; i++) {
    const x0 = r() * 512, amp = 2 + r() * 8, f = 0.004 + r() * 0.01, ph = r() * 6;
    g.strokeStyle = `rgba(${90 + r() * 40},${50 + r() * 25},${20 + r() * 15},${0.15 + r() * 0.35})`;
    g.lineWidth = 0.6 + r() * 3;
    for (const dx of [-512, 0, 512]) {
      g.beginPath();
      for (let y = 0; y <= 512; y += 8) { const x = x0 + dx + Math.sin(y * f * Math.PI * 2 + ph) * amp; if (y) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke();
    }
  }
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(60,35,15,${r() * 0.25})`; g.fillRect(r() * 512, r() * 512, 1, 2 + r() * 4); }
}));

/** Bladkanten: plywood med ljusa och mörka fanér och tunna limfogar, tvärs över tjockleken (v). */
const ply = once(() => canvasTexture(64, 256, 9, (g, r) => {
  const plies = ['#d8b07a', '#a8764a', '#e2c08e', '#8a5a34', '#e2c08e', '#a8764a', '#d8b07a'];
  const h = 256 / plies.length;
  plies.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i * h, 64, h); g.fillStyle = 'rgba(40,25,10,0.6)'; g.fillRect(0, i * h, 64, 1.5); });
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(60,35,15,${r() * 0.2})`; g.fillRect(r() * 64, r() * 256, 2 + r() * 6, 1); }
}, [8, 1]));

/** Gummits yta: fint, nästan osynligt korn som bump- och råhetskarta. Också läder. */
export const rubberGrain = once(() => canvasTexture(256, 256, 13, (g, r) => {
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) { const v = Math.round(90 + r() * 80); g.fillStyle = `rgba(${v},${v},${v},0.5)`; g.beginPath(); g.arc(r() * 256, r() * 256, 0.6 + r() * 1.4, 0, Math.PI * 2); g.fill(); }
}, [6, 6]));

/** Bordsskivans slitage som råhetskarta: repor, bollmärken och blankslitna fläckar där händerna tar stöd. */
export const scuffs = once(() => Object.assign(canvasTexture(1024, 512, 61, (g, r) => {
  g.fillStyle = '#c8c8c8'; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 260; i++) {
    const x = r() * 1024, y = r() * 512, a = r() * Math.PI, l = 6 + r() * 60;
    g.strokeStyle = `rgba(255,255,255,${0.15 + r() * 0.35})`; g.lineWidth = 0.5 + r();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + r() * 0.2})`; g.beginPath(); g.arc(r() * 1024, r() * 512, 2 + r() * 4, 0, Math.PI * 2); g.fill(); }
  for (const x of [40, 984]) for (const y of [90, 422]) {
    const grad = g.createRadialGradient(x, y, 0, x, y, 70);
    grad.addColorStop(0, 'rgba(60,60,60,0.55)'); grad.addColorStop(1, 'rgba(60,60,60,0)');
    g.fillStyle = grad; g.fillRect(x - 70, y - 70, 140, 140);
  }
}), { colorSpace: THREE.NoColorSpace }));

/** Nätets maskor som alfakarta: vita trådar på svart. */
export const netMap = once(() => canvasTexture(32, 32, 1, (g) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 4); g.fillRect(0, 0, 4, 32);
}, [70, 5]));

/** Ögat på en sfär: iris och pupill där u = 0.25 (sfärens +z), vitan med svaga ådror. */
const eyeMap = once(() => {
  const tex = canvasTexture(512, 256, 17, (g, r) => {
    const sclera = g.createRadialGradient(128, 128, 30, 128, 128, 200);
    sclera.addColorStop(0, '#f4f0ea'); sclera.addColorStop(0.7, '#eadfd6'); sclera.addColorStop(1, '#d9b9b0');
    g.fillStyle = sclera; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 14; i++) {
      const a = r() * Math.PI * 2;
      g.strokeStyle = `rgba(170,40,40,${0.15 + r() * 0.2})`; g.lineWidth = 0.6 + r();
      g.beginPath(); let x = 128 + Math.cos(a) * 180, y = 128 + Math.sin(a) * 120; g.moveTo(x, y);
      for (let k = 0; k < 6; k++) { x += (128 - x) * 0.12 + (r() - 0.5) * 10; y += (128 - y) * 0.12 + (r() - 0.5) * 10; g.lineTo(x, y); }
      g.stroke();
    }
    const iris = g.createRadialGradient(128, 128, 14, 128, 128, 52);
    iris.addColorStop(0, '#6a4a22'); iris.addColorStop(0.45, '#4a6a4a'); iris.addColorStop(0.85, '#2e4a3a'); iris.addColorStop(1, '#12100c');
    g.fillStyle = iris; g.beginPath(); g.arc(128, 128, 52, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 160; i++) {
      const a = r() * Math.PI * 2, r0 = 18 + r() * 8, r1 = 34 + r() * 16;
      g.strokeStyle = r() < 0.5 ? `rgba(220,190,120,${0.15 + r() * 0.25})` : `rgba(10,15,10,${0.2 + r() * 0.3})`; g.lineWidth = 0.8;
      g.beginPath(); g.moveTo(128 + Math.cos(a) * r0, 128 + Math.sin(a) * r0); g.lineTo(128 + Math.cos(a + (r() - 0.5) * 0.2) * r1, 128 + Math.sin(a) * r1); g.stroke();
    }
    g.fillStyle = '#050403'; g.beginPath(); g.arc(128, 128, 19, 0, Math.PI * 2); g.fill();
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  return tex;
});

/**
 * Skuggor på allt fast och opakt. Glas, text, livsprickar och stadens fönster (basic-material)
 * varken kastar eller tar emot. `noCast` i userData: tar emot men kastar inte (pälsens skal).
 */
export function Lit({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  // ponytail: går igenom alla meshar varje render (~700, billigt); flytta till castShadow-props om scenen växer mycket.
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      const m = o.material as THREE.Material & { isMeshBasicMaterial?: boolean };
      o.receiveShadow = !m.transparent && !m.isMeshBasicMaterial;
      o.castShadow = o.receiveShadow && !o.userData.noCast;
    });
  });
  return <group ref={ref}>{children}</group>;
}

/** Sithögat: samma vita, men irisen gul mot en röd kant. Glödkartan är bara irisen. */
const SITH_IRIS: [number, string][] = [[0, '#fff2a0'], [0.4, '#ffc21a'], [0.8, '#e0480a'], [1, '#3a0604']];
const sithEyeMap = once(() => {
  const base = eyeMap().image as HTMLCanvasElement;
  const tex = canvasTexture(512, 256, 18, (g) => {
    g.drawImage(base, 0, 0);
    const iris = g.createRadialGradient(128, 128, 14, 128, 128, 52);
    SITH_IRIS.forEach(([at, c]) => iris.addColorStop(at, c));
    g.fillStyle = iris; g.beginPath(); g.arc(128, 128, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120400'; g.beginPath(); g.ellipse(128, 128, 7, 19, 0, 0, Math.PI * 2); g.fill();
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  return tex;
});
const sithGlowMap = once(() => {
  const tex = canvasTexture(512, 256, 19, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, 512, 256);
    const iris = g.createRadialGradient(128, 128, 18, 128, 128, 50);
    iris.addColorStop(0, '#ffcc40'); iris.addColorStop(0.7, '#ff7a10'); iris.addColorStop(1, '#000');
    g.fillStyle = iris; g.beginPath(); g.arc(128, 128, 52, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.ellipse(128, 128, 7, 19, 0, 0, Math.PI * 2); g.fill();
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  return tex;
});

/* ── Racketen ── */

const R = 0.72;
const CORE = 0.035;
const SHEET = 0.014;
const FRONT = CORE / 2 + SHEET;

const handleGeo = once(() => {
  // utsvängt (FL) handtag: smalt på mitten, brett vid änden och upp mot bladet
  const pts = [[0, -0.03], [0.1, -0.028], [0.128, -0.015], [0.135, 0.02], [0.12, 0.12], [0.1, 0.24], [0.098, 0.3], [0.106, 0.36], [0.122, 0.4], [0.122, 0.41], [0, 0.41]].map(([x, y]) => new THREE.Vector2(x, y));
  const geo = new THREE.LatheGeometry(pts, 40);
  geo.scale(1, 1, 0.62);
  return geo;
});

const bladeMats = once(() => {
  const side = new THREE.MeshStandardMaterial({ map: ply(), roughness: 0.75 });
  const face = new THREE.MeshStandardMaterial({ map: wood(), roughness: 0.6 });
  return [side, face, face];
});

const rubberMats = new Map<string, THREE.Material[]>();
/** Gummit: blank, lite klibbig topp; kanten är svampen under. Baksidan är svart som på riktiga bat. */
function rubber(color: string) {
  let m = rubberMats.get(color);
  if (!m) {
    const top = new THREE.MeshPhysicalMaterial({ color, roughness: 0.42, roughnessMap: rubberGrain(), bumpMap: rubberGrain(), bumpScale: 0.4, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.3), clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const sponge = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.6), roughness: 0.95, bumpMap: rubberGrain(), bumpScale: 1.5 });
    m = [sponge, top, top];
    rubberMats.set(color, m);
  }
  return m;
}

function Eye({ r, x, y, look, gaze, lid, tilt, skin, sith }: { r: number; x: number; y: number; look: number; gaze: [number, number]; lid: number; tilt: number; skin: string; sith?: boolean }) {
  return (
    // ögonen är kupor (tillplattade bakåt) så att de inte sticker ut genom batets baksida
    <group position={[x, y, 0.005]} scale={[1, 1, 0.5]}>
      <mesh rotation={[look + gaze[1], -x * 0.4 + gaze[0], 0]}>
        <sphereGeometry args={[r, 32, 24]} />
        {sith
          ? <meshPhysicalMaterial map={sithEyeMap()} emissiveMap={sithGlowMap()} emissive='#ffffff' emissiveIntensity={1.6} roughness={0.2} clearcoat={1} clearcoatRoughness={0.03} />
          : <meshPhysicalMaterial map={eyeMap()} roughness={0.2} clearcoat={1} clearcoatRoughness={0.03} />}
      </mesh>
      {/* ögonlocket: en kupa i gummits färg över ögats överdel; sänks för sorg och ilska, lutas utåt */}
      {lid > 0 && (
        <mesh rotation={[-0.25, 0, x < 0 ? -tilt : tilt]}>
          <sphereGeometry args={[r * 1.06, 32, 12, 0, Math.PI * 2, 0, Math.PI * lid]} />
          <meshPhysicalMaterial color={skin} roughness={0.45} clearcoat={0.25} side={2} />
        </mesh>
      )}
    </group>
  );
}

/**
 * Ansiktet: glasögon med iris och ögonlock, och en mun av mörk, blank gummilist. `gaze` vrider
 * ögonen (sida, höjd) mot det figuren tittar på; `blink` 0 → 1 drar ner locken. `sith` ger gula,
 * glödande ögon. `part` ritar bara ögonen ('top') eller bara munnen ('bottom'), för ett kluvet bat.
 */
function RealFace({ mood, skin, gaze = [0, 0], blink = 0, sith, part }: { mood: Mood; skin: string; gaze?: [number, number]; blink?: number; sith?: boolean; part?: 'top' | 'bottom' }) {
  if (mood === 'none') return null;
  const shock = mood === 'shock';
  const r = shock ? 0.15 : 0.125;
  const open = mood === 'sad' ? 0.42 : mood === 'grim' ? 0.4 : mood === 'calm' ? 0.55 : shock ? 0 : 0.2;
  const lid = open + (0.97 - open) * blink;
  const tilt = mood === 'sad' ? -0.35 : mood === 'grim' ? 0.4 : 0;
  const look = mood === 'sad' ? 0.3 : mood === 'hope' ? -0.15 : 0;
  const lip = <meshPhysicalMaterial color='#2a0c0c' roughness={0.35} clearcoat={0.6} clearcoatRoughness={0.2} />;
  return (
    <group position={[0, 1.05, FRONT]}>
      {part !== 'bottom' && [-0.22, 0.22].map((x) => <Eye key={x} r={r} x={x} y={shock ? 0.15 : 0.12} look={look} gaze={gaze} lid={lid} tilt={tilt * (1 - blink)} skin={skin} sith={sith} />)}
      {/* En halv torus rakt upp är en båge uppåt (∩, sur); ett halvt varv runt blir den ett leende (∪). */}
      {part === 'top' ? null : shock ? (
        <mesh position={[0, -0.22, 0.01]} scale={[1, 1.25, 0.4]}><sphereGeometry args={[0.1, 20, 16]} /><meshStandardMaterial color='#140404' roughness={0.6} /></mesh>
      ) : mood === 'grim' ? (
        <mesh position={[0, -0.24, 0.01]} rotation={[0, 0, Math.PI / 2]}><capsuleGeometry args={[0.022, 0.2, 6, 12]} />{lip}</mesh>
      ) : (
        <mesh position={[0, mood === 'sad' ? -0.4 : -0.14, 0.01]} rotation={[0, 0, mood === 'sad' ? 0 : Math.PI]}><torusGeometry args={[0.2, 0.03, 12, 32, Math.PI]} />{lip}</mesh>
      )}
    </group>
  );
}

/* ── Tyg, skrov och utrustning ── */

/** Vävt ylle: varp och inslag som ljusa och mörka trådar, med ojämna noppor. Färg- och bumpkarta. */
const fabric = once(() => canvasTexture(256, 256, 31, (g, r) => {
  g.fillStyle = '#b0b0b0'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 4) {
    g.fillStyle = `rgba(255,255,255,${0.08 + r() * 0.1})`; g.fillRect(0, i, 256, 2);
    g.fillStyle = `rgba(0,0,0,${0.1 + r() * 0.12})`; g.fillRect(i, 0, 2, 256);
  }
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'},${0.1 + r() * 0.15})`; g.fillRect(r() * 256, r() * 256, 2 + r() * 10, 1 + r() * 2); }
}, [10, 10]));

/** Skrovplåt: paneler med fogar, påbyggda detaljer, sotränder och brännmärken. */
const hull = once(() => canvasTexture(512, 512, 41, (g, r) => {
  g.fillStyle = '#c4c2bc'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(r() * 16) * 32, y = Math.floor(r() * 16) * 32, w = 32 * (1 + Math.floor(r() * 4)), h = 32 * (1 + Math.floor(r() * 3));
    const v = Math.round(170 + r() * 50);
    g.fillStyle = `rgb(${v},${v - 2},${v - 6})`; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(40,40,40,0.55)'; g.lineWidth = 1.5; g.strokeRect(x + 0.5, y + 0.5, w, h);
  }
  for (let i = 0; i < 120; i++) { const v = r() < 0.5 ? 90 : 220; g.fillStyle = `rgba(${v},${v},${v},0.35)`; g.fillRect(r() * 512, r() * 512, 3 + r() * 14, 3 + r() * 8); }
  for (let i = 0; i < 40; i++) {
    const x = r() * 512, y = r() * 512, l = 20 + r() * 90;
    const grad = g.createLinearGradient(x, y, x, y + l);
    grad.addColorStop(0, 'rgba(50,40,30,0.35)'); grad.addColorStop(1, 'rgba(50,40,30,0)');
    g.fillStyle = grad; g.fillRect(x, y, 2 + r() * 6, l);
  }
  for (let i = 0; i < 6; i++) {
    const x = r() * 512, y = r() * 512, rad = 10 + r() * 30;
    const grad = g.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, 'rgba(20,15,10,0.55)'); grad.addColorStop(1, 'rgba(20,15,10,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
}));

const hullMats = new Map<string, THREE.Material>();
/** Lackerad och sliten plåt i spelarens färg (grå för skeppet). */
function plate(color: string) {
  let m = hullMats.get(color);
  if (!m) hullMats.set(color, (m = new THREE.MeshPhysicalMaterial({ color, map: hull(), bumpMap: hull(), bumpScale: 1.2, roughnessMap: hull(), roughness: 0.6, metalness: 0.45, clearcoat: 0.2, clearcoatRoughness: 0.6 })));
  return m;
}
const gunmetal = once(() => new THREE.MeshStandardMaterial({ color: '#3a3c40', metalness: 0.85, roughness: 0.42, roughnessMap: rubberGrain(), bumpMap: rubberGrain(), bumpScale: 0.6 }));
const chrome = once(() => new THREE.MeshStandardMaterial({ color: '#c8ccd2', metalness: 1, roughness: 0.22 }));
const leather = once(() => new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.75, bumpMap: rubberGrain(), bumpScale: 2 }));
const wool = once(() => new THREE.MeshPhysicalMaterial({ color: '#4e3424', map: fabric(), bumpMap: fabric(), bumpScale: 0.8, roughness: 0.95, sheen: 0.7, sheenRoughness: 0.8, sheenColor: '#9a7a5e', side: THREE.DoubleSide }));
/** Mästarens mantel: mörkare, tätare ylle. */
const masterWool = once(() => new THREE.MeshPhysicalMaterial({ color: '#2e1c12', map: fabric(), bumpMap: fabric(), bumpScale: 0.6, roughness: 0.9, sheen: 0.8, sheenRoughness: 0.7, sheenColor: '#7a5a44', side: THREE.DoubleSide }));
/** Samma ylle med fållens smuts (vertexfärger): bara manteln har dem, huvan och ärmen inte. */
const robeWool = once(() => Object.assign((wool() as THREE.MeshPhysicalMaterial).clone(), { vertexColors: true }));
const robeMasterWool = once(() => Object.assign((masterWool() as THREE.MeshPhysicalMaterial).clone(), { vertexColors: true }));
const linen = once(() => new THREE.MeshPhysicalMaterial({ color: '#cbb690', map: fabric(), bumpMap: fabric(), bumpScale: 0.6, roughness: 0.9, sheen: 0.4, sheenColor: '#fff2dd', side: THREE.DoubleSide }));

/** Ljus i HDR (över 1): blir vitt i tonmappningen och blommar, som en överexponerad lampa på film. */
export const hot = (color: string, k: number) => new THREE.Color(color).multiplyScalar(k);
const glowMats = new Map<string, THREE.Material>();
export function glow(color: string, k: number, opacity: number) {
  const key = `${color}:${k}:${opacity}`;
  let m = glowMats.get(key);
  if (!m) glowMats.set(key, (m = new THREE.MeshBasicMaterial({ color: hot(color, k), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false })));
  return m;
}

/**
 * Tyg som faller: radiell förskjutning i veck som växer mot fållen, och en lätt vågig fåll.
 * `depth` plattar till plagget framifrån-bakåt så att det sluter tätt om den platta racketen.
 */
function drape(geo: THREE.BufferGeometry, top: number, bottom: number, depth: number, folds: number, amp: number) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const phi = Math.atan2(x, z);
    const h = THREE.MathUtils.clamp((top - y) / (top - bottom), 0, 1);
    const k = 1 + amp * h * (0.7 * Math.sin(phi * folds + 1.5 * Math.sin(phi * 3)) + 0.3 * Math.sin(phi * folds * 2.3 + 1));
    p.setXYZ(i, x * k, y + (h > 0.97 ? Math.sin(phi * 5) * 0.02 : 0), z * k * depth);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Manteln: öppen framtill (±0.85 rad kring +z) så att ansiktet och handtaget syns. */
const robeGeo = once(() => {
  const pts = Array.from({ length: 16 }, (_, i) => { const y = 0.88 - (i / 15) * 0.86; return new THREE.Vector2(0.76 + (0.88 - y) * 0.24, y); });
  const geo = drape(new THREE.LatheGeometry(pts, 96, 0.85, Math.PI * 2 - 1.7), 0.88, 0.02, 0.5, 12, 0.09);
  // fållen har släpat i golvet: mörkare och brunare nedtill
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const d = 0.5 * THREE.MathUtils.smoothstep(0.32 - p.getY(i), 0, 0.3); c.set([1 - d, 1 - d * 1.08, 1 - d * 1.2], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
});
/** Huvan: en kupa bakom och över bladet som ramar in ansiktet. */
const hoodGeo = once(() => {
  const geo = drape(new THREE.SphereGeometry(0.84, 64, 24, Math.PI / 2 + 0.8, Math.PI * 2 - 1.6, 0, Math.PI * 0.6), 0.84, -0.26, 0.55, 9, 0.05);
  geo.translate(0, 1.05, -0.03);
  return geo;
});
/** Tunikan om handtagets överdel, under bältet. */
const tunicGeo = once(() => {
  const geo = drape(new THREE.LatheGeometry([0.42, 0.36, 0.3, 0.24, 0.18, 0.14].map((y, i) => new THREE.Vector2(0.15 - i * 0.004, y)), 48), 0.42, 0.14, 0.66, 14, 0.06);
  return geo;
});

const SHOULDER = new THREE.Vector3(0.6, 0.8, 0.02);
const HAND = new THREE.Vector3(0.98, 0.66, 0.3);
const ARM = (() => {
  const d = HAND.clone().sub(SHOULDER);
  return { mid: SHOULDER.clone().add(HAND).multiplyScalar(0.5).toArray() as Vec3, len: d.length(), q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()) };
})();

/** Padawanflätan: en tunn fläta som hänger från bladets överkant på höger sida. */
const BRAID = Array.from({ length: 14 }, (_, i) => { const u = i / 13; return [0.52 + u * 0.34 + 0.1 * Math.sin(Math.PI * u) + (i % 2 ? 0.014 : -0.014), 1.7 - u * 0.78, FRONT + 0.03] as Vec3; });

/**
 * Manteln, huvan, tunikan och bältet. `sway` (framåt, åt sidan) svänger manteln kring axlarna: den
 * släpar efter när figuren rör sig och andas lite när den står still.
 */
function Robe({ arm, hood = true, master = false, sway = [0, 0] }: { arm: boolean; hood?: boolean; master?: boolean; sway?: [number, number] }) {
  const cloth = master ? masterWool() : wool();
  return (
    <group>
      <group position={[0, 0.88, 0]} rotation={[sway[0], 0, sway[1]]}>
        <mesh position={[0, -0.88, 0]} geometry={robeGeo()} material={master ? robeMasterWool() : robeWool()} />
      </group>
      {hood && <mesh geometry={hoodGeo()} material={cloth} />}
      {!hood && BRAID.map((p, i) => <mesh key={i} position={p} scale={[1, 1.5, 1]}><sphereGeometry args={[0.03, 10, 8]} /><meshStandardMaterial color='#5a3c22' roughness={0.8} /></mesh>)}
      <mesh geometry={tunicGeo()} material={linen()} />
      <mesh position={[0, 0.22, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.66, 1]} material={leather()}><torusGeometry args={[0.15, 0.028, 10, 40]} /></mesh>
      <mesh position={[0, 0.22, 0.105]} material={chrome()}><boxGeometry args={[0.07, 0.05, 0.02]} /></mesh>
      {arm && (
        <>
          <mesh position={ARM.mid} quaternion={ARM.q} material={cloth}><cylinderGeometry args={[0.07, 0.11, ARM.len, 20, 1, true]} /></mesh>
          <mesh position={HAND.toArray()} scale={[1, 0.85, 1.1]} material={leather()}><sphereGeometry args={[0.075, 20, 16]} /></mesh>
        </>
      )}
    </group>
  );
}

/** Sabelns vila (bladet upp och utåt) och hugg (framåt och in mot mitten), som Euler-vinklar vid handen. */
const REST: Vec3 = [0.2, 0, -0.35];
const STRIKE: Vec3 = [1.3, 0, 0.5];
export const HAND_POS = HAND.toArray() as Vec3;

/**
 * Ljussabeln: räfflat fäste i krom och svart, bladet en överexponerad vit kärna i ett färgat sken som
 * lyser upp omgivningen. `on` 0 → 1 tänder (bladet växer ur fästet), `swing` 0 → 1 är hugget. Ljuset
 * sitter kvar med styrkan noll när sabeln är släckt: ett ljus som kommer och går kompilerar om
 * alla shaders och hackar.
 */
export function LightSaber({ color, t, on, swing = 0, position = HAND_POS, rotation }: { color: string; t: number; on: number; swing?: number; position?: Vec3; rotation?: Vec3 }) {
  const flicker = 1 + 0.06 * Math.sin(t * 47) + 0.04 * Math.sin(t * 113);
  const L = 1.1;
  const pose = rotation ?? (REST.map((r, i) => r + (STRIKE[i] - r) * swing) as Vec3);
  return (
    <group position={position} rotation={pose}>
      <mesh position={[0, -0.12, 0]} material={chrome()}><cylinderGeometry args={[0.032, 0.036, 0.06, 20]} /></mesh>
      <mesh position={[0, -0.02, 0]} material={gunmetal()}><cylinderGeometry args={[0.033, 0.033, 0.16, 20]} /></mesh>
      {[-0.08, -0.05, -0.02, 0.01, 0.04].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} material={chrome()}><torusGeometry args={[0.034, 0.006, 8, 24]} /></mesh>)}
      <mesh position={[0, 0.1, 0]} material={chrome()}><cylinderGeometry args={[0.042, 0.034, 0.08, 20]} /></mesh>
      <mesh position={[0.036, 0.02, 0]}><boxGeometry args={[0.012, 0.02, 0.014]} /><meshStandardMaterial color='#b01818' roughness={0.4} /></mesh>
      {on > 0.01 && (
        <group position={[0, 0.14, 0]} scale={[flicker, on, flicker]}>
          <group position={[0, L / 2, 0]}>
            <mesh><capsuleGeometry args={[0.016, L, 6, 16]} /><meshBasicMaterial color={hot('#ffffff', 6)} /></mesh>
            <mesh material={glow(color, 3, 0.55)}><capsuleGeometry args={[0.032, L, 6, 16]} /></mesh>
            <mesh material={glow(color, 2, 0.16)}><capsuleGeometry args={[0.075, L, 6, 16]} /></mesh>
          </group>
        </group>
      )}
      <pointLight position={[0, 0.14 + (L / 2) * on, 0]} color={color} intensity={6 * flicker * on} distance={5} decay={2} />
    </group>
  );
}

/** Blasterpistolen: låda, pipa med flamdämpare, sikte och grepp. `bolt` = sekunder sedan skottet. */
function Blaster({ bolt }: { bolt?: number }) {
  return (
    <group position={HAND.toArray()} rotation={[0.35, 0, -0.25]}>
      <mesh position={[0, 0.02, -0.02]} rotation={[0.35, 0, 0]} material={leather()}><boxGeometry args={[0.045, 0.14, 0.06]} /></mesh>
      <mesh position={[0, 0.13, 0.01]} material={gunmetal()}><boxGeometry args={[0.05, 0.16, 0.08]} /></mesh>
      <mesh position={[0, 0.29, 0.02]} material={gunmetal()}><cylinderGeometry args={[0.02, 0.02, 0.2, 16]} /></mesh>
      <mesh position={[0, 0.41, 0.02]} material={gunmetal()}><cylinderGeometry args={[0.028, 0.022, 0.06, 16]} /></mesh>
      <mesh position={[0, 0.16, 0.07]} rotation={[0, 0, 0]} material={gunmetal()}><cylinderGeometry args={[0.014, 0.014, 0.12, 12]} /></mesh>
      <mesh position={[0, 0.225, 0.07]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.012, 16]} /><meshPhysicalMaterial color='#1a2a3a' roughness={0.05} clearcoat={1} /></mesh>
      {bolt !== undefined && bolt < 0.05 && <mesh position={[0, 0.46, 0.02]} material={glow('#ffb070', 6, 0.9)}><sphereGeometry args={[0.06, 12, 10]} /></mesh>}
      <group position={[0, 0.5 + (bolt ?? 0) * 28, 0.02]}>
        {bolt !== undefined && <mesh><capsuleGeometry args={[0.012, 0.32, 4, 10]} /><meshBasicMaterial color={hot('#ffffff', 5)} /></mesh>}
        {bolt !== undefined && <mesh material={glow('#ff2a14', 4, 0.6)}><capsuleGeometry args={[0.03, 0.34, 4, 10]} /></mesh>}
        {/* kvar med styrkan noll mellan skotten, se LightSaber */}
        <pointLight color='#ff3a20' intensity={bolt !== undefined ? 4 : 0} distance={4} decay={2} />
      </group>
    </group>
  );
}

/** Skeppsdelarna på bladet: käftarna framåt (uppåt), cockpitröret åt styrbord, parabolen, motorsken baktill. */
function Freighter({ boost = 1 }: { boost?: number }) {
  const p = plate('#bdbab2');
  return (
    <group>
      {[-0.19, 0.19].map((x) => (
        <group key={x} position={[x, 1.86, 0]}>
          <mesh material={p}><boxGeometry args={[0.2, 0.42, 0.05]} /></mesh>
          <mesh position={[x < 0 ? -0.04 : 0.04, 0.05, 0.035]} material={gunmetal()}><boxGeometry args={[0.06, 0.18, 0.02]} /></mesh>
        </group>
      ))}
      <mesh position={[0.68, 1.4, 0.01]} rotation={[0, 0, -0.35]} material={p}><cylinderGeometry args={[0.07, 0.08, 0.5, 20]} /></mesh>
      <group position={[0.77, 1.66, 0.01]} rotation={[0, 0, -0.35]}>
        <mesh material={p}><sphereGeometry args={[0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
        {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.sin(i * 0.5 - 0.75) * 0.085, 0.045, Math.cos(i * 0.5 - 0.75) * 0.085]} rotation={[0, i * 0.5 - 0.75, 0]}><boxGeometry args={[0.035, 0.04, 0.005]} /><meshPhysicalMaterial color='#0a1018' roughness={0.03} clearcoat={1} /></mesh>)}
      </group>
      <group position={[-0.42, 1.52, FRONT + 0.03]} rotation={[0.3, 0, 0]}>
        <mesh material={chrome()} position={[0, 0, -0.02]}><cylinderGeometry args={[0.012, 0.012, 0.05, 8]} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={p}><sphereGeometry args={[0.1, 24, 8, 0, Math.PI * 2, 0, 0.6]} /></mesh>
      </group>
      {/* motorskenet: en blå båge längs bakkanten (nedtill), bakom handtaget */}
      <mesh position={[0, 1.05, -0.02]} rotation={[0, 0, -Math.PI * 0.82]} material={glow('#7ab8ff', 5, 0.95)} scale={[1, 1, boost]}><torusGeometry args={[R * 1.02, 0.022 * boost, 8, 60, Math.PI * 0.64]} /></mesh>
      <mesh position={[0, 1.05, -0.02]} rotation={[0, 0, -Math.PI * 0.82]} material={glow('#7ab8ff', 2, 0.25)}><torusGeometry args={[R * 1.02, 0.06 * boost, 8, 60, Math.PI * 0.64]} /></mesh>
    </group>
  );
}

/** Podracern: piloten i en kapsel, två motorer framför (längs ringen) i kabel, med en energibrygga mellan intagen. */
export function PodRacer({ color, t }: { color: string; t: number }) {
  const p = plate(color);
  const bob = Math.sin(t * 2.1) * 0.03;
  const arc = 1 + 0.25 * Math.sin(t * 31) * Math.sin(t * 7);
  const engine = (z: number) => (
    <group key={`engine${z}`} position={[1.35, 0.18 + Math.sin(t * 2.6 + z) * 0.02, z]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={p}><cylinderGeometry args={[0.15, 0.17, 0.85, 32]} /></mesh>
      {[-0.2, 0.05, 0.28].map((x) => <mesh key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={gunmetal()}><torusGeometry args={[0.165, 0.012, 8, 32]} /></mesh>)}
      <mesh position={[0.44, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={chrome()}><torusGeometry args={[0.15, 0.03, 12, 32]} /></mesh>
      <group position={[0.42, 0, 0]} rotation={[t * 40, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}><circleGeometry args={[0.14, 24]} /><meshStandardMaterial color='#0c0c0e' roughness={0.6} /></mesh>
        {Array.from({ length: 9 }, (_, i) => <mesh key={i} rotation={[(i / 9) * Math.PI * 2, 0, 0]} position={[0.005, 0, 0]} material={gunmetal()}><boxGeometry args={[0.005, 0.26, 0.03]} /></mesh>)}
      </group>
      <mesh position={[-0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={gunmetal()}><cylinderGeometry args={[0.15, 0.1, 0.16, 24, 1, true]} /></mesh>
      <mesh position={[-0.57, 0, 0]} rotation={[0, -Math.PI / 2, 0]} material={glow('#ff9a40', 4, 0.9)}><circleGeometry args={[0.1, 24]} /></mesh>
      {[1, -1].map((s) => <mesh key={s} position={[0.05, s * 0.18, 0]} material={p}><boxGeometry args={[0.5, 0.012, 0.09]} /></mesh>)}
    </group>
  );
  const cable = (z: number) => {
    const a = new THREE.Vector3(0.4, 0.05, z * 0.35), b = new THREE.Vector3(0.88, 0.18, z);
    const d = b.clone().sub(a);
    return <mesh key={`cable${z}`} position={a.clone().add(b).multiplyScalar(0.5).toArray()} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())}><cylinderGeometry args={[0.012, 0.012, d.length(), 8]} /><meshStandardMaterial color='#111' roughness={0.7} /></mesh>;
  };
  return (
    <group position={[0, 0.42 + bob, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} scale={[0.62, 1, 0.85]} material={p}><capsuleGeometry args={[0.38, 0.5, 10, 32]} /></mesh>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.25, 0.9, 1]} material={gunmetal()}><torusGeometry args={[0.3, 0.03, 10, 40]} /></mesh>
      <mesh position={[0.32, 0.25, 0]} rotation={[0, 0, -0.6]}><boxGeometry args={[0.02, 0.16, 0.42]} /><meshPhysicalMaterial color='#9ab0c0' roughness={0.05} transparent opacity={0.3} /></mesh>
      {engine(0.45)}
      {engine(-0.45)}
      {cable(0.45)}
      {cable(-0.45)}
      <group position={[1.79, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[arc, 1, arc]}>
        <mesh><cylinderGeometry args={[0.008, 0.008, 0.78, 6]} /><meshBasicMaterial color={hot('#e8d8ff', 5)} /></mesh>
        <mesh material={glow('#a060ff', 3, 0.5)}><cylinderGeometry args={[0.03, 0.03, 0.78, 10]} /></mesh>
        <pointLight color='#a070ff' intensity={3 * arc} distance={3} decay={2} />
      </group>
    </group>
  );
}

export type RacketGear = { robe: boolean; hood?: boolean; master?: boolean; sway?: [number, number]; gaze?: [number, number]; blink?: number; sith?: boolean; weapon?: 'saber' | 'blaster'; saber?: string; ignite?: number; swing?: number; falcon?: boolean; boost?: number; bolt?: number };

/**
 * Tävlingsbatet som person: färgat gummi fram, svart bak, plywoodkant och trähandtag. Med `gear`
 * bär det jedimantel och sabel eller blaster, eller är ett fraktskepp (skrovplåt i stället för gummi).
 */
export function RealRacket({ position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3, scale = 1, color = '#d8232a', mood = 'happy' as Mood, crown = false, gear, t = 0 }: { position?: Vec3; rotation?: Vec3; scale?: number | Vec3; color?: string; mood?: Mood; crown?: boolean; gear?: RacketGear; t?: number }) {
  const falcon = gear?.falcon;
  const skin = falcon ? '#bdbab2' : color;
  const face = falcon ? plate(skin) : rubber(color);
  const back = falcon ? plate(skin) : rubber('#151515');
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* på huvan sitter kronan lite högre, på skeppet ovanför käftarna */}
      {crown && <RealCrown position={[0, falcon ? 2.12 : gear?.robe ? 1.86 : 1.76, 0]} scale={0.8} />}
      {/* bladet är lite bredare än högt, som ett riktigt bat */}
      <group position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.03, 1, 1]}>
        <mesh material={falcon ? plate(skin) : bladeMats()}><cylinderGeometry args={[R, R, CORE, 72]} /></mesh>
        <mesh position={[0, CORE / 2 + SHEET / 2, 0]} material={face}><cylinderGeometry args={[R - 0.004, R - 0.004, SHEET, 72]} /></mesh>
        <mesh position={[0, -(CORE / 2 + SHEET / 2), 0]} material={back}><cylinderGeometry args={[R - 0.004, R - 0.004, SHEET, 72]} /></mesh>
      </group>
      {falcon && <mesh position={[0, 1.05, FRONT + 0.002]}><ringGeometry args={[R * 0.9, R * 0.95, 72]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>}
      <mesh geometry={handleGeo()}><meshPhysicalMaterial map={wood()} color='#e8d2b0' roughness={0.45} roughnessMap={rubberGrain()} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>
      <RealFace mood={mood} skin={skin} gaze={gear?.gaze} blink={gear?.blink} sith={gear?.sith} />
      {falcon && <Freighter boost={gear?.boost} />}
      {gear?.robe && <Robe arm={!!gear.weapon} hood={gear.hood ?? true} master={gear.master} sway={gear.sway} />}
      {gear?.weapon === 'saber' && <LightSaber color={gear.saber ?? '#3a9bff'} t={t} on={gear.ignite ?? 1} swing={gear.swing} />}
      {gear?.weapon === 'blaster' && <Blaster bolt={gear.bolt} />}
    </group>
  );
}

/**
 * Ett bat kluvet tvärs över bladets mitt. 'top' är överhalvan med ögonen, 'bottom' underhalvan med
 * munnen och handtaget. Snittet visar plywoodens fanér; `heat` 1 → 0 är hur mycket snittet
 * fortfarande glöder efter sabeln (vitgult, rött, svart).
 */
export function RacketHalf({ part, color, mood = 'grim' as Mood, heat = 0, gear }: { part: 'top' | 'bottom'; color: string; mood?: Mood; heat?: number; gear?: Pick<RacketGear, 'sith' | 'gaze'> }) {
  const theta = part === 'top' ? Math.PI / 2 : -Math.PI / 2;
  const T = CORE + 2 * SHEET;
  const ember = new THREE.Color('#2a0400').lerp(new THREE.Color('#ff3a08'), Math.min(1, heat * 1.6)).lerp(new THREE.Color('#ffd27a'), Math.max(0, heat - 0.6) * 2.5);
  return (
    <group>
      <group position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.03, 1, 1]}>
        <mesh material={bladeMats()}><cylinderGeometry args={[R, R, CORE, 36, 1, false, theta, Math.PI]} /></mesh>
        <mesh position={[0, CORE / 2 + SHEET / 2, 0]} material={rubber(color)}><cylinderGeometry args={[R - 0.004, R - 0.004, SHEET, 36, 1, false, theta, Math.PI]} /></mesh>
        <mesh position={[0, -(CORE / 2 + SHEET / 2), 0]} material={rubber('#151515')}><cylinderGeometry args={[R - 0.004, R - 0.004, SHEET, 36, 1, false, theta, Math.PI]} /></mesh>
      </group>
      {/* snittet: plywoodens skikt tvärs över tjockleken, brända och glödande längs kanten */}
      <mesh position={[0, 1.05, 0]} rotation={[part === 'top' ? Math.PI / 2 : -Math.PI / 2, 0, 0]} scale={[1.03, 1, 1]}>
        <planeGeometry args={[2 * R, T]} />
        <meshStandardMaterial map={ply()} color='#7a5a3a' roughness={0.9} emissive={ember} emissiveIntensity={0.4 + heat * 5} />
      </mesh>
      <RealFace mood={mood} skin={color} gaze={gear?.gaze} sith={gear?.sith} part={part} />
      {part === 'bottom' && <mesh geometry={handleGeo()}><meshPhysicalMaterial map={wood()} color='#e8d2b0' roughness={0.45} roughnessMap={rubberGrain()} clearcoat={0.5} clearcoatRoughness={0.3} /></mesh>}
    </group>
  );
}

/** Manteln som blir kvar när bäraren är borta: `crumple` 0 → 1 sjunker den ihop till en hög tyg. */
export function RobeHeap({ crumple, master = false }: { crumple: number; master?: boolean }) {
  const c = THREE.MathUtils.clamp(crumple, 0, 1);
  return (
    <group scale={[1 + 0.35 * c, 1 - 0.86 * c, 1 + 0.35 * c]} rotation={[0, c * 0.6, 0]}>
      <mesh geometry={robeGeo()} material={master ? robeMasterWool() : robeWool()} />
    </group>
  );
}

/* ── Kronan ── */

export function RealCrown({ position = [0, 0, 0] as Vec3, scale = 1, rotation = [0, 0, 0] as Vec3 }: { position?: Vec3; scale?: number; rotation?: Vec3 }) {
  const gold = <meshPhysicalMaterial color='#e6b24a' metalness={1} roughness={0.16} clearcoat={0.3} />;
  const gem = (c: string) => <meshPhysicalMaterial color={c} roughness={0.03} transmission={0.9} thickness={0.12} ior={1.77} clearcoat={1} />;
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.42, 0.46, 0.24, 64, 1, true]} />{gold}</mesh>
      {[0.005, 0.235].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[y < 0.1 ? 0.46 : 0.42, 0.022, 12, 64]} />{gold}</mesh>)}
      {/* sammetsmössan inuti */}
      <mesh position={[0, 0.12, 0]} scale={[1, 0.75, 1]}><sphereGeometry args={[0.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color='#5a0a14' roughness={0.9} sheen={1} sheenRoughness={0.45} sheenColor='#ff6070' /></mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        const b = a + Math.PI / 6;
        return (
          <group key={i}>
            <mesh position={[Math.cos(a) * 0.4, 0.36, Math.sin(a) * 0.4]}><coneGeometry args={[0.07, 0.26, 24]} />{gold}</mesh>
            <mesh position={[Math.cos(a) * 0.4, 0.5, Math.sin(a) * 0.4]}><sphereGeometry args={[0.035, 20, 16]} /><meshPhysicalMaterial color='#f4eee4' roughness={0.25} sheen={0.6} sheenColor='#ffe8f0' clearcoat={1} /></mesh>
            <mesh position={[Math.cos(b) * 0.452, 0.12, Math.sin(b) * 0.452]} rotation={[0, -b + Math.PI / 2, 0]} scale={[1, 1.3, 0.55]}><sphereGeometry args={[0.045, 24, 16]} />{gem(i % 2 ? '#1a3cff' : '#e01030')}</mesh>
          </group>
        );
      })}
    </group>
  );
}

/* ── Ewoken ── */

const SHELLS = 16;
const FUR = 0.05;

/** Pälsens strån: ett slumpvärde per texel. Skalen klipper bort allt under sin höjd, så stråna smalnar mot toppen. */
const strands = once(() => {
  const N = 64;
  const r = rng(21);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) { const v = Math.floor(r() * 256); data.set([v, v, v, 255], i * 4); }
  const tex = new THREE.DataTexture(data, N, N);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
});

function part(geo: THREE.BufferGeometry, m: THREE.Matrix4, tint = 1) {
  geo.applyMatrix4(m);
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count * 3).fill(tint), 3));
  geo.setAttribute('furUv', geo.attributes.uv.clone());
  return geo;
}
const M = (p: Vec3, s: Vec3 = [1, 1, 1], rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, rz)), new THREE.Vector3(...s));

/** Halsen: huvudet vrids kring den här punkten. */
const NECK = 0.6;
/** Kroppen: bål, fötter och vänsterarmen. */
const ewokBody = once(() => mergeGeometries([
  part(new THREE.SphereGeometry(0.3, 32, 24), M([0, 0.34, 0], [1, 1.15, 0.9])),
  ...[-0.13, 0.13].map((x) => part(new THREE.SphereGeometry(0.08, 16, 12), M([x, 0.05, 0.08], [1, 0.6, 1.4]))),
  part(new THREE.SphereGeometry(0.065, 16, 12), M([-0.29, 0.4, 0.05], [1, 2.4, 1], -0.3)),
])!);
/** Huvudet, med halsen i origo: huvud, öron och nos (ljusare). */
const ewokHead = once(() => mergeGeometries([
  part(new THREE.SphereGeometry(0.27, 32, 24), M([0, 0.78 - NECK, 0])),
  ...[-0.17, 0.17].map((x) => part(new THREE.SphereGeometry(0.07, 16, 12), M([x, 1.05 - NECK, -0.04]))),
  part(new THREE.SphereGeometry(0.08, 20, 16), M([0, 0.71 - NECK, 0.24], [1.2, 0.85, 1]), 1.7),
])!);
/** Högerarmen sitter i spjutgruppen och följer spjutet. */
const ewokArm = once(() => part(new THREE.SphereGeometry(0.065, 16, 12), M([-0.03, 0.05, 0], [1, 2.4, 1], 0.2)));

const furMats = new Map<string, THREE.Material>();
/** Skalpäls: SHELLS instanser av samma kropp, var och en lite längre ut längs normalen och lite nedtyngd. */
function furMaterial(color: string) {
  let m = furMats.get(color);
  if (!m) {
    // Lambert, inte PBR: skalen ritas sexton lager djupt i varje ljus, och päls har ändå ingen glans
    const mat = new THREE.MeshLambertMaterial({ color, vertexColors: true });
    mat.onBeforeCompile = (s) => {
      s.uniforms.strands = { value: strands() };
      s.vertexShader = s.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 furUv;\nvarying vec2 vFurUv;\nvarying float vShell;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vShell = float(gl_InstanceID + 1) / ${SHELLS}.0;
          vFurUv = furUv * vec2(7.0, 4.0);
          transformed += objectNormal * vShell * ${FUR};
          transformed.y -= vShell * vShell * ${FUR * 0.6};`);
      s.fragmentShader = s.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform sampler2D strands;\nvarying vec2 vFurUv;\nvarying float vShell;')
        .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          float strand = texture2D(strands, vFurUv).r;
          if (strand < mix(0.3, 1.0, vShell)) discard;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= mix(0.45, 1.2, vShell) * (0.8 + 0.4 * strand);`);
    };
    furMats.set(color, (m = mat));
  }
  return m;
}

function Fur({ geo, fur }: { geo: THREE.BufferGeometry; fur: string }) {
  return (
    <>
      {/* huden under pälsen kastar skuggan; skalen gör det inte (de skulle bara rita samma form 16 gånger) */}
      <mesh geometry={geo}><meshStandardMaterial color={new THREE.Color(fur).multiplyScalar(0.4)} roughness={1} vertexColors /></mesh>
      <instancedMesh args={[geo, furMaterial(fur), SHELLS]} frustumCulled={false} userData={{ noCast: true }} />
    </>
  );
}

/** En ewok med päls, läderhuva, blanka ögon och ett trä- och stenspjut. `spear` är spjutarmens vinkel. */
export function RealEwok({ position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3, fur = '#5a3d26', hood = '#7a4a2e', spear = 0.25, scale = 1, toss, look = [0, 0] }: { position?: Vec3; rotation?: Vec3; fur?: string; hood?: string; spear?: number; scale?: number; toss?: number; look?: [number, number] }) {
  // huvan kastad i luften: en sekund upp och ner igen på huvudet, snurrande
  const up = toss === undefined ? 0 : 4.9 * toss * (1 - toss);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <Fur geo={ewokBody()} fur={fur} />
      {/* huvudet följer bollen (`look`: sida, höjd); huvan, ögonen och nosen sitter på det */}
      <group position={[0, NECK, 0]} rotation={[look[1], look[0], 0]}>
        <Fur geo={ewokHead()} fur={fur} />
        <mesh position={[0, 0.8 + up - NECK, -0.02]} rotation={[-0.35 + (toss ?? 0) * Math.PI * 2, 0, 0]}><sphereGeometry args={[0.315, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color={hood} roughness={0.95} bumpMap={rubberGrain()} bumpScale={4} side={2} /></mesh>
        {[-0.1, 0.1].map((x) => <mesh key={x} position={[x, 0.82 - NECK, 0.235]}><sphereGeometry args={[0.055, 20, 16]} /><meshPhysicalMaterial color='#0a0604' roughness={0.05} clearcoat={1} clearcoatRoughness={0.02} /></mesh>)}
        <mesh position={[0, 0.74 - NECK, 0.33]} scale={[1.2, 0.8, 0.8]}><sphereGeometry args={[0.03, 16, 12]} /><meshPhysicalMaterial color='#1a1210' roughness={0.4} clearcoat={0.5} /></mesh>
      </group>
      <group position={[0.3, 0.45, 0.05]} rotation={[0, 0, -spear]}>
        <Fur geo={ewokArm()} fur={fur} />
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.016, 0.02, 1.1, 10]} /><meshStandardMaterial map={wood()} color='#9a7a55' roughness={0.8} /></mesh>
        <mesh position={[0, 1.05, 0]}><coneGeometry args={[0.035, 0.15, 5]} /><meshStandardMaterial color='#7a7268' roughness={0.7} bumpMap={rubberGrain()} bumpScale={3} flatShading /></mesh>
        <mesh position={[0, 0.97, 0]}><cylinderGeometry args={[0.024, 0.024, 0.05, 10]} /><meshStandardMaterial color='#5a4030' roughness={1} /></mesh>
      </group>
    </group>
  );
}

/* ── Droiden, gnistorna och skylten ── */

/** Droidens plåt: vit lack med blå paneler, fogar och lite smuts; kupolen samma i silver. */
const droidMap = (base: string) => canvasTexture(512, 256, base === 'white' ? 51 : 52, (g, r) => {
  g.fillStyle = base === 'white' ? '#e8e6e0' : '#c8ccd2'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 14; i++) {
    const x = (i / 14) * 512 + r() * 10, w = 14 + r() * 26, y = 20 + r() * 150, h = 20 + r() * 70;
    g.fillStyle = r() < 0.65 ? '#2a4ea8' : '#9aa0a8'; g.fillRect(x, y, w, h);
    g.strokeStyle = 'rgba(30,30,30,0.6)'; g.lineWidth = 1.5; g.strokeRect(x, y, w, h);
  }
  g.strokeStyle = 'rgba(30,30,30,0.35)'; g.lineWidth = 1;
  for (let y = 40; y < 256; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(70,55,40,${r() * 0.2})`; g.fillRect(r() * 512, 180 + r() * 76, 2 + r() * 20, 2 + r() * 10); }
});
const droidBody = once(() => new THREE.MeshPhysicalMaterial({ map: droidMap('white'), roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3, bumpMap: rubberGrain(), bumpScale: 0.3 }));
const droidDome = once(() => new THREE.MeshStandardMaterial({ map: droidMap('silver'), metalness: 0.85, roughness: 0.25 }));

/**
 * En astromekdroid som bollkalle: tunna, kupolen som vrider sig, två axelben och en mittfot. Lutar
 * bakåt när den rullar, piper med blinkande lampor. `carrying` = bollen i griparmen framtill.
 */
export function Astromech({ position, heading, t, moving, carrying }: { position: Vec3; heading: number; t: number; moving: boolean; carrying: boolean }) {
  const tilt = moving ? -0.22 : 0;
  const blink = Math.sin(t * 9) > 0;
  return (
    <group position={position} rotation={[0, heading, 0]}>
      <group rotation={[tilt, 0, Math.sin(t * 13) * (moving ? 0.02 : 0)]} position={[0, moving ? 0 : 0, 0]}>
        <mesh position={[0, 0.5, 0]} material={droidBody()}><cylinderGeometry args={[0.24, 0.24, 0.58, 40]} /></mesh>
        <group position={[0, 0.79, 0]} rotation={[0, Math.sin(t * 1.7) * 0.9, 0]}>
          <mesh material={droidDome()}><sphereGeometry args={[0.245, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /></mesh>
          <mesh position={[0, 0.13, 0.19]}><sphereGeometry args={[0.045, 20, 16]} /><meshPhysicalMaterial color='#050508' roughness={0.02} clearcoat={1} /></mesh>
          <mesh position={[0.1, 0.07, 0.215]}><sphereGeometry args={[0.018, 12, 10]} /><meshBasicMaterial color={hot(blink ? '#ff2a2a' : '#401010', blink ? 4 : 1)} /></mesh>
          <mesh position={[-0.1, 0.16, 0.18]}><sphereGeometry args={[0.016, 12, 10]} /><meshBasicMaterial color={hot(blink ? '#203060' : '#4aa0ff', blink ? 1 : 4)} /></mesh>
        </group>
        <mesh position={[0, 0.18, 0]} material={gunmetal()}><cylinderGeometry args={[0.2, 0.24, 0.06, 32]} /></mesh>
        {carrying && (
          <group position={[0, 0.48, 0.3]}>
            <mesh position={[0, 0, -0.04]} material={chrome()} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.012, 0.012, 0.1, 8]} /></mesh>
            <mesh position={[0, 0, 0.03]}><sphereGeometry args={[0.07, 24, 16]} /><meshPhysicalMaterial color='#f6f4ef' roughness={0.5} clearcoat={0.15} /></mesh>
          </group>
        )}
      </group>
      {[-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.29, 0, 0]}>
          <mesh position={[0, 0.62, 0]} rotation={[0, 0, Math.PI / 2]} material={droidBody()}><cylinderGeometry args={[0.07, 0.07, 0.06, 24]} /></mesh>
          <mesh position={[0, 0.36, 0]} material={droidBody()}><boxGeometry args={[0.06, 0.56, 0.11]} /></mesh>
          <mesh position={[0, 0.05, 0.02]} material={droidBody()}><boxGeometry args={[0.11, 0.1, 0.22]} /></mesh>
          <mesh position={[0, 0.02, 0.02]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.09, 16]} /><meshStandardMaterial color='#111' roughness={0.7} /></mesh>
        </group>
      ))}
      <mesh position={[0, 0.06, -0.04]} material={droidBody()}><boxGeometry args={[0.1, 0.12, 0.14]} /></mesh>
    </group>
  );
}

/**
 * Gnistor där sabeln möter något: ett tjugotal glödande korn som flyger ut och faller, korta och
 * överexponerade som på film. `age` = sekunder sedan smällen; borta efter 0.4 s.
 */
export function Sparks({ position, age, seed }: { position: Vec3; age: number; seed: number }) {
  if (age < 0 || age > 0.4) return null;
  const r = rng(seed);
  return (
    <group position={position}>
      {Array.from({ length: 22 }, (_, i) => {
        const a = r() * Math.PI * 2, e = (r() - 0.3) * 1.4, v = 2 + r() * 3;
        const d: Vec3 = [Math.cos(a) * Math.cos(e) * v, Math.sin(e) * v + 1, Math.sin(a) * Math.cos(e) * v];
        const k = 1 - age / 0.4;
        return <mesh key={i} position={[d[0] * age, d[1] * age - 4.9 * age * age, d[2] * age]} scale={[k, k, k]} material={glow(i % 3 ? '#ffd090' : '#ffffff', 6, 1)}><sphereGeometry args={[0.012, 6, 4]} /></mesh>;
      })}
      {age < 0.08 && <mesh material={glow('#ffe0b0', 5, 0.8)}><sphereGeometry args={[0.08 * (1 - age / 0.08) + 0.02, 12, 8]} /></mesh>}
    </group>
  );
}

/** Skylten en ewok håller upp vid kröningen: en målad bräda på två käppar med vinnarens namn. */
export function Sign({ position, name, raise }: { position: Vec3; name: string; raise: number }) {
  if (raise <= 0) return null;
  return (
    <group position={[position[0], position[1] + 0.4 + raise * 1.1, position[2] + 0.3]} rotation={[-0.08, 0, Math.sin(raise * 9) * 0.05 * (1 - raise)]}>
      <mesh><boxGeometry args={[1.5, 0.5, 0.03]} /><meshStandardMaterial map={wood()} color='#d8c0a0' roughness={0.85} /></mesh>
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, -0.45, -0.03]}><cylinderGeometry args={[0.018, 0.02, 0.9, 8]} /><meshStandardMaterial map={wood()} color='#8a6a45' roughness={0.9} /></mesh>)}
      <Text userData={{ noCast: true }} position={[0, 0, 0.017]} fontSize={0.24} maxWidth={1.4} color='#2a140a' anchorX='center' anchorY='middle'>{name}</Text>
    </group>
  );
}

/* ── Staden under templet ── */

const CITY = (() => {
  const r = rng(66);
  const out: { x: number; z: number; w: number; d: number; top: number }[] = [];
  while (out.length < 520) {
    const x = (r() - 0.5) * 520, z = -40 - r() * 300;
    if (Math.abs(x) < 30 && z > -70) continue;
    const tall = r() < 0.08;
    out.push({ x, z, w: 8 + r() * 18, d: 8 + r() * 18, top: tall ? 10 + r() * 90 : -70 + r() * 70 });
  }
  return out;
})();
const BASE = -160;

/**
 * Dygnet över Coruscant, efter när rundan spelades (svensk tid): himlens gradient uppifrån och ner,
 * disen, ljuset som faller in genom fönstren, hur stor del av fönstren som är tända och hur starkt.
 */
type Sky = { sky: string[]; facade: string; fog: string; fogDensity: number; sun: string; sunIntensity: number; window: string; lit: number; glow: number; fill: number };
const NIGHT: Sky = { sky: ['#02030a', '#0b0e22', '#3a2a36', '#2a1c24', '#0a0810'], facade: '#16181e', fog: '#1a1828', fogDensity: 0.0045, sun: '#a9c4ff', sunIntensity: 0.9, window: '#9ec5ff', lit: 0.28, glow: 1, fill: 0 };
const DAWN: Sky = { sky: ['#1c2548', '#5a5c88', '#e8a48e', '#b07a6c', '#30242a'], facade: '#40404c', fog: '#6a6072', fogDensity: 0.0035, sun: '#ffc6a0', sunIntensity: 2.2, window: '#ffd4b8', lit: 0.15, glow: 0.6, fill: 0.5 };
const DAY: Sky = { sky: ['#2e5ea8', '#6a9ad2', '#c8d8e8', '#a4acb6', '#5a626c'], facade: '#7a828e', fog: '#9aa6b6', fogDensity: 0.0028, sun: '#fff0dc', sunIntensity: 4.2, window: '#e6f0ff', lit: 0.05, glow: 0.25, fill: 1 };
const DUSK: Sky = { sky: ['#0e1634', '#3a2e60', '#ff8a50', '#9a4a40', '#1e1620'], facade: '#2c2632', fog: '#5a3a48', fogDensity: 0.0038, sun: '#ff9a60', sunIntensity: 2.4, window: '#ffb488', lit: 0.22, glow: 0.9, fill: 0.4 };
const KEYS: [number, Sky][] = [[0, NIGHT], [5.5, NIGHT], [7, DAWN], [9, DAY], [16.5, DAY], [18.8, DUSK], [20.8, NIGHT], [24, NIGHT]];

const lerpHex = (a: string, b: string, p: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), p).getHexString()}`;
export function daylight(hour: number): Sky {
  const h = ((hour % 24) + 24) % 24;
  const i = KEYS.findIndex(([at], k) => h >= at && h < (KEYS[k + 1]?.[0] ?? 25));
  const [a0, a] = KEYS[i], [b0, b] = KEYS[i + 1] ?? KEYS[i];
  const p = b0 > a0 ? (h - a0) / (b0 - a0) : 0;
  const n = (x: number, y: number) => x + (y - x) * p;
  return { sky: a.sky.map((c, k) => lerpHex(c, b.sky[k], p)), facade: lerpHex(a.facade, b.facade, p), fog: lerpHex(a.fog, b.fog, p), fogDensity: n(a.fogDensity, b.fogDensity), sun: lerpHex(a.sun, b.sun, p), sunIntensity: n(a.sunIntensity, b.sunIntensity), window: lerpHex(a.window, b.window, p), lit: n(a.lit, b.lit), glow: n(a.glow, b.glow), fill: n(a.fill, b.fill) };
}

/** Andelen tända fönster och deras styrka: delas av alla tornen, sätts av RealCity efter dygnet. */
const windowLight = { lit: { value: NIGHT.lit }, glow: { value: NIGHT.glow } };

/** Fasaderna: fönster i ett rutnät i världskoordinater, slumpvis tända, varmt eller kallt ljus. */
const towerMat = once(() => {
  const m = new THREE.MeshStandardMaterial({ color: '#16181e', roughness: 0.75, metalness: 0.2 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uLit = windowLight.lit;
    s.uniforms.uGlow = windowLight.glow;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;\nvarying vec3 vWN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        mat4 wm = modelMatrix * instanceMatrix;
        vWorld = (wm * vec4(transformed, 1.0)).xyz;
        vWN = normalize(mat3(wm) * objectNormal);`);
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorld;\nvarying vec3 vWN;\nuniform float uLit;\nuniform float uGlow;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        if (abs(vWN.y) < 0.5) {
          vec2 f = abs(vWN.x) > 0.5 ? vWorld.zy : vWorld.xy;
          vec2 cell = f / vec2(1.8, 3.2);
          vec2 id = floor(cell), q = fract(cell);
          float win = step(0.25, q.x) * step(q.x, 0.75) * step(0.3, q.y) * step(q.y, 0.8);
          float h = fract(sin(dot(id + floor(vWorld.xz / 300.0) + vWN.xz * 17.0, vec2(12.9898, 78.233))) * 43758.5453);
          vec3 wc = mix(vec3(1.0, 0.72, 0.42), vec3(0.7, 0.85, 1.0), step(0.8, fract(h * 7.3)));
          totalEmissiveRadiance += win * step(1.0 - uLit, h) * wc * (0.25 + 1.2 * fract(h * 13.1)) * uGlow;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.015, 0.018, 0.025), win);
        }`);
  };
  return m;
});

/** Himlen: dygnets gradient, med smogen som lyser vid horisonten. */
const skyMap = (c: string[]) => canvasTexture(4, 256, 1, (g) => {
  const grad = g.createLinearGradient(0, 0, 0, 256);
  [0, 0.38, 0.5, 0.56, 1].forEach((at, i) => grad.addColorStop(at, c[i]));
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
});

const LANES = (() => {
  const r = rng(77);
  return Array.from({ length: 180 }, () => ({ x: r() * 520, y: -40 + Math.floor(r() * 6) * 9, z: -60 - Math.floor(r() * 8) * 30, v: (r() < 0.5 ? -1 : 1) * (14 + r() * 22), red: r() < 0.3 }));
})();

/**
 * Coruscant som en riktig nattstad: hundratals torn med upplysta fönster, smoggig himmel och
 * lufttrafik i filer. Kamerans bortre plan flyttas ut så att staden och himlen får plats.
 */
export type { Sky };
export function RealCity({ t, sky }: { t: number; sky: Sky }) {
  windowLight.lit.value = sky.lit;
  towerMat().color.set(sky.facade);
  windowLight.glow.value = sky.glow;
  const key = sky.sky.join();
  // nyckeln är färgerna: en ny array med samma färger ska inte rita om himlen
  const skyTex = useMemo(() => skyMap(sky.sky), [key]);
  useEffect(() => () => skyTex.dispose(), [skyTex]);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => { camera.far = 1200; camera.updateProjectionMatrix(); }, [camera]);
  const towers = useMemo(() => {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), towerMat(), CITY.length);
    const m = new THREE.Matrix4();
    CITY.forEach((b, i) => mesh.setMatrixAt(i, m.compose(new THREE.Vector3(b.x, (BASE + b.top) / 2, b.z), new THREE.Quaternion(), new THREE.Vector3(b.w, b.top - BASE, b.d))));
    mesh.frustumCulled = false;
    return mesh;
  }, []);
  useEffect(() => () => { towers.geometry.dispose(); towers.dispose(); }, [towers]);
  const traffic = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = traffic.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    LANES.forEach((l, i) => {
      const x = (((l.x + l.v * t) % 520) + 520) % 520 - 260;
      mesh.setMatrixAt(i, m.makeTranslation(x, l.y, l.z));
      mesh.setColorAt(i, new THREE.Color(l.red ? '#ff4030' : '#fff2d8').multiplyScalar(l.red ? 3 : 4));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (
    <group>
      <primitive object={towers} />
      <instancedMesh ref={traffic} args={[undefined, undefined, LANES.length]} frustumCulled={false}>
        <boxGeometry args={[1.6, 0.5, 0.5]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <mesh><sphereGeometry args={[1000, 32, 16]} /><meshBasicMaterial map={skyTex} side={THREE.BackSide} fog={false} depthWrite={false} /></mesh>
    </group>
  );
}
