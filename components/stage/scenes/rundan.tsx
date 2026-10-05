'use client';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { Billboard, Environment, Lightformer, MeshReflectorMaterial, RoundedBox, Sparkles, SpotLight, Text } from '@react-three/drei';
import * as THREE from 'three';
import { lerp3 } from '../props';
import { Astromech, daylight, HAND_POS, LightSaber, marble as marbleMap, netMap, PodRacer, RealCity, RealCrown, RealEwok, RealRacket, scuffs, Sign, Sparks, stoneGrain, wood, type RacketGear, type Sky } from '../real';
import { ease, rng, span } from '../anim';
import { hash } from '@/lib/domain/heraldry';
import { BALL_R, ballPos, BENCH_Z, cheer, droidAt, droidTrips, DUEL, ordinal, outfit, PALETTE, parries, SCALE, seatPos, slowmo, stageAt, TABLE, wieldsSaber, type Actor, type Gear, type Kit, type Merits, type RoundPlan, type Trip, type Turn } from '../rundan';
import type { CameraPose, CueName, Scene, Word } from '../types';

/*
 * RUNDAN I REPRIS. En sal i Jeditemplet på Coruscant, ewoks på läktaren.
 *   intro     In genom salen från fönstren och läktaren ner mot bordet. Antal spelare och liv.
 *   varven    Ringen roterar runt bordet, den vid kortsidan slår. Miss: en livsprick slocknar.
 *             Utslagning: närbild, till bänken, ewokerna jublar.
 *   finalen   "FINALEN", duell framför bordet (sablarna korsas), sedan var sin kortsida. Tvåan missar
 *             och får sabeln utslagen ur handen.
 *   kronan    Kronan faller på vinnaren. YUB NUB!
 * Renderas i fotoläget (Stage.tsx) med rekvisitan i real.tsx: skuggor, sten, päls, AO och skärpedjup.
 * Spelarna är jedi med sabel eller blaster, en flyger podracer och en är ett fraktskepp (rundan.ts: outfit).
 * Avgörande missar går i ultrarapid (slowmo), en droid hämtar bollarna, staden följer dygnet.
 */

export type Cast = Record<string, { name: string; color: string }>;

const WALL_Z = -9.4;
const COLUMNS = [-6.5, -3, 0.5, 4].flatMap((z) => [[-8.5, z], [8.5, z]] as [number, number][]);
const WINDOWS = [-6.75, -2.25, 2.25, 6.75];
// strålkastarens mål ligger utanför scenen: matrisen räknas en gång, den rör sig aldrig
const STAND_TARGET = new THREE.Object3D();
STAND_TARGET.position.set(0, 0.8, -6.6);
STAND_TARGET.updateMatrixWorld();
const LAMP: [number, number, number] = [0, 8.6, 1.8];
const STEPS = [{ z: -5.7, top: 0.35 }, { z: -6.6, top: 0.75 }, { z: -7.5, top: 1.15 }];
const FURS = ['#5a3d26', '#6b4a2e', '#3f2b1d', '#7a5a3a', '#8a7a6a'];
const HOODS = ['#7a4a2e', '#8c5a36', '#5e3a22', '#a06a40', '#6b4f3a'];
const EWOKS = (() => {
  const r = rng(1983);
  return STEPS.flatMap((_, row) => Array.from({ length: 9 }, (_, i) => ({
    x: (i - 4) * 1.05 + (row % 2) * 0.5 + (r() - 0.5) * 0.25,
    row,
    fur: FURS[Math.floor(r() * FURS.length)],
    hood: HOODS[Math.floor(r() * HOODS.length)],
    ph: r() * Math.PI * 2,
    scale: 0.9 + r() * 0.2,
    // temperament: en del hoppar högt och viftar vilt, en del sitter mest still och tittar
    temper: 0.3 + r() * 1.2,
    tempo: 0.8 + r() * 0.5,
  })));
})();

/**
 * Skuggor på allt fast och opakt. Glas, text, livsprickar och stadens fönster (basic-material)
 * varken kastar eller tar emot. `noCast` i userData: tar emot men kastar inte (pälsens skal).
 */
function Lit({ children }: { children: ReactNode }) {
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

/**
 * Ljuset som i en riktig sal: en varm takarmatur över bordet, kallt stadsljus genom fönstren som
 * kastar pelarnas skuggor över golvet, och en miljökarta byggd av samma ljuskällor för reflexerna.
 */
function Lights({ sky }: { sky: Sky }) {
  return (
    <>
      <ambientLight intensity={0.05 + 0.15 * sky.fill} color='#8f9bd0' />
      <hemisphereLight args={['#6a78c0', '#20140c', 0.12 + 0.3 * sky.fill]} />
      {/* takarmaturen: ljuskäglan syns i dammet i luften, dammkornen glimmar i den */}
      <SpotLight position={LAMP} angle={0.6} penumbra={0.7} distance={12} intensity={420} color='#ffe2bd' attenuation={10} anglePower={4} opacity={0.5} radiusTop={0.3} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} shadow-normalBias={0.02} shadow-radius={5} shadow-blurSamples={16} />
      <group position={LAMP} rotation={[0.21, 0, 0]}>
        <mesh position={[0, 0.15, 0]}><cylinderGeometry args={[0.16, 0.48, 0.38, 32, 1, true]} /><meshStandardMaterial color='#1c1d20' metalness={0.7} roughness={0.4} side={2} /></mesh>
        <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.42, 32]} /><meshBasicMaterial color={new THREE.Color('#ffe8c8').multiplyScalar(8)} side={2} /></mesh>
        <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.012, 0.012, 0.4, 6]} /><meshStandardMaterial color='#111' /></mesh>
      </group>
      <Sparkles count={160} scale={[4.5, 6, 4.5]} position={[0, 3, 0.4]} size={0.9} speed={0.12} noise={0.6} opacity={0.3} color='#ffe6c8' />
      <directionalLight position={[-4, 8, -22]} intensity={sky.sunIntensity} color={sky.sun} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0003} shadow-normalBias={0.03}
        shadow-camera-left={-14} shadow-camera-right={14} shadow-camera-top={14} shadow-camera-bottom={-14} shadow-camera-near={1} shadow-camera-far={50} />
      {/* publikljuset: en bred, mjuk strålkastare snett framifrån mot läktaren */}
      <spotLight position={[0, 7, 1]} target={STAND_TARGET} angle={0.5} penumbra={1} intensity={90} color='#ffd9b0' />
      <Environment resolution={256} frames={1} environmentIntensity={0.55}>
        <color attach='background' args={['#05060c']} />
        <Lightformer form='rect' intensity={6} color='#ffe2bd' position={[0, 9, 0]} rotation-x={Math.PI / 2} scale={[4, 2, 1]} />
        {WINDOWS.map((x) => <Lightformer key={x} form='rect' intensity={1.4 + 1.6 * sky.fill} color={sky.window} position={[x, 4.8, WALL_Z]} scale={[3.6, 7.4, 1]} />)}
        <Lightformer form='rect' intensity={0.15} color='#8a7a68' position={[0, -1, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
        {/* salen runt om: stenväggar och läktare i svagt varmt ljus, så att guld och lack har något att spegla */}
        {[0, 1, 2, 3].map((i) => { const a = (i * Math.PI) / 2; return <Lightformer key={i} form='rect' intensity={0.45} color='#c8a888' position={[Math.sin(a) * 10, 2, Math.cos(a) * 10]} rotation-y={a + Math.PI} scale={[14, 4, 1]} />; })}
      </Environment>
    </>
  );
}

/** Salen: templets golvemblem under bordet, pelargångar, och höga fönster mot Coruscant i fonden. */
function Hall({ sky }: { sky: Sky }) {
  const grain = stoneGrain();
  const marble = marbleMap();
  const stone = <meshStandardMaterial color='#6a6f80' map={grain} bumpMap={grain} bumpScale={1.5} roughnessMap={grain} roughness={0.95} />;
  return (
    <group>
      {/* dis som tunnas ut med avståndet: inne i salen syns den knappt, staden försvinner i den */}
      <fogExp2 attach='fog' args={[sky.fog, sky.fogDensity]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}>
        <planeGeometry args={[40, 50]} />
        <MeshReflectorMaterial blur={[300, 90]} resolution={512} mixBlur={0.8} mixStrength={1.1} roughness={0.35} roughnessMap={marble} map={marble} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color='#3a4050' metalness={0.05} mirror={0} />
      </mesh>
      {/* emblemet: polerad sandfärgad marmor, inlagda mässingsringar och en röd marmorcirkel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><circleGeometry args={[5.2, 96]} /><meshPhysicalMaterial color='#9a8a70' map={marble} roughness={0.3} clearcoat={0.7} clearcoatRoughness={0.15} /></mesh>
      {[[5.05, 5.2], [3.0, 3.25]].map(([a, b]) => <mesh key={a} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[a, b, 128]} /><meshStandardMaterial color='#c79a4a' metalness={1} roughness={0.28} /></mesh>)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}><circleGeometry args={[2.3, 96]} /><meshPhysicalMaterial color='#9a4232' map={marble} roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.25} /></mesh>
      {COLUMNS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 4.5, 0]}><cylinderGeometry args={[0.45, 0.5, 9, 20]} />{stone}</mesh>
          <RoundedBox args={[1.3, 0.4, 1.3]} radius={0.04} smoothness={3} position={[0, 0.2, 0]}>{stone}</RoundedBox>
          <RoundedBox args={[1.3, 0.4, 1.3]} radius={0.04} smoothness={3} position={[0, 8.8, 0]}>{stone}</RoundedBox>
        </group>
      ))}
      {[-10, 10].map((x) => <mesh key={x} position={[x, 4.6, -3]}><boxGeometry args={[0.4, 9.2, 16]} />{stone}</mesh>)}
      <mesh position={[0, 9.2, -3]}><boxGeometry args={[20, 0.4, 16]} /><meshStandardMaterial color='#151826' roughness={1} /></mesh>
      {[-9, -4.5, 0, 4.5, 9].map((x) => <mesh key={x} position={[x, 4.6, WALL_Z]}><boxGeometry args={[0.9, 9.2, 0.5]} />{stone}</mesh>)}
      <mesh position={[0, 0.6, WALL_Z]}><boxGeometry args={[20, 1.2, 0.5]} />{stone}</mesh>
      <mesh position={[0, 8.9, WALL_Z]}><boxGeometry args={[20, 0.6, 0.5]} />{stone}</mesh>
      {WINDOWS.map((x) => <mesh key={x} position={[x, 4.8, WALL_Z]}><planeGeometry args={[3.6, 7.4]} /><meshBasicMaterial color='#9ec5ff' transparent opacity={0.05} side={2} /></mesh>)}
    </group>
  );
}

/** Läktaren: tre steg ewoks. De gungar med rallyt och blir vilda när `hype` stiger. */
const SIGN_HOLDER = EWOKS[4];

function Stand({ t, hype, crownAt, winner, ball }: { t: number; hype: number; crownAt: number; winner: string; ball: number[] | null }) {
  // vid kröningen kastar ewokerna huvorna i luften, två gånger var, och en på första raden håller upp en skylt
  const tossOf = (ph: number) => [0, 1.5].map((d) => t - (crownAt + 0.25 + (ph / (Math.PI * 2)) * 0.8 + d)).find((x) => x >= 0 && x < 1);
  const step = STEPS[SIGN_HOLDER.row];
  return (
    <group>
      <Sign position={[SIGN_HOLDER.x, step.top, step.z]} name={winner} raise={ease(span(t, crownAt + 0.6, crownAt + 1.0), 'out')} />
      {STEPS.map((s) => <RoundedBox key={s.z} args={[11, s.top, 0.9]} radius={0.025} smoothness={3} position={[0, s.top / 2, s.z]}><meshStandardMaterial map={wood()} color='#6a5040' roughness={0.8} /></RoundedBox>)}
      {EWOKS.map((e, i) => {
        const step = STEPS[e.row];
        const jump = Math.abs(Math.sin(t * 3 * e.tempo + e.ph)) * 0.04 + hype * e.temper * Math.abs(Math.sin(t * 10 * e.tempo + e.ph)) * 0.3;
        const yaw = Math.sin(e.ph) * 0.2;
        // huvudet följer bollen när den är i spel, annars tittar de sig omkring en stund då och då
        const [bx, by, bz] = ball ?? [Math.sin(t * 0.4 + e.ph) * 4, 1.5, 0];
        const look: [number, number] = [
          THREE.MathUtils.clamp(Math.atan2(bx - e.x, bz - step.z) - yaw, -1, 1),
          THREE.MathUtils.clamp(Math.atan2(step.top + 0.8 - by, Math.hypot(bx - e.x, bz - step.z)) * 0.6, -0.3, 0.4),
        ];
        return <RealEwok key={i} position={[e.x, step.top + jump, step.z]} rotation={[0, yaw, Math.sin(t * 2 * e.tempo + e.ph) * 0.08 * (1 + hype * 2 * e.temper)]} fur={e.fur} hood={e.hood} spear={0.25 + hype * e.temper * (0.75 + 0.4 * Math.sin(t * 12 * e.tempo + e.ph))} scale={e.scale} toss={tossOf(e.ph)} look={look} />;
      })}
    </group>
  );
}

function Bench({ seats }: { seats: number }) {
  if (!seats) return null;
  const w = seats * 1.25 + 0.4;
  return (
    <group position={[0, 0, BENCH_Z]}>
      <RoundedBox args={[w, 0.08, 0.6]} radius={0.02} smoothness={3} position={[0, 0.3, 0]}><meshPhysicalMaterial map={wood()} color='#a07a55' roughness={0.55} clearcoat={0.4} clearcoatRoughness={0.4} /></RoundedBox>
      {[-w / 2 + 0.2, w / 2 - 0.2].map((x) => <mesh key={x} position={[x, 0.15, 0]}><boxGeometry args={[0.12, 0.3, 0.5]} /><meshStandardMaterial color='#5a4530' roughness={0.8} /></mesh>)}
    </group>
  );
}

function Table() {
  const { length: L, width: W, height: H } = TABLE;
  // tävlingsbord: halvmatt blå skiva på en stålram, nät med stolpar och klämmor, ben på hjul
  const white = <meshStandardMaterial color='#f2f2ee' roughness={0.6} />;
  const steel = <meshStandardMaterial color='#2a2c30' metalness={0.7} roughness={0.45} />;
  const T = 0.03;
  const legs = [1, -1].flatMap((sx) => [1, -1].map((sz) => [sx * (L / 2 - 0.3), sz * (W / 2 - 0.2)] as const));
  return (
    <group>
      <RoundedBox args={[L, T, W]} radius={0.006} smoothness={2} position={[0, H - T / 2, 0]}><meshPhysicalMaterial color='#1b3f72' roughness={0.8} roughnessMap={scuffs()} clearcoat={0.15} clearcoatRoughness={0.6} /></RoundedBox>
      {[W / 2 - 0.01, -(W / 2 - 0.01)].map((z) => <mesh key={z} position={[0, H + 0.001, z]}><boxGeometry args={[L, 0.002, 0.02]} />{white}</mesh>)}
      {[L / 2 - 0.01, -(L / 2 - 0.01)].map((x) => <mesh key={x} position={[x, H + 0.001, 0]}><boxGeometry args={[0.02, 0.002, W]} />{white}</mesh>)}
      <mesh position={[0, H + 0.001, 0]}><boxGeometry args={[L, 0.002, 0.008]} />{white}</mesh>
      {/* ramen under skivan: långsidor och en tvärbalk vid varje kortsida och vid mitten */}
      {[W / 2 - 0.08, -(W / 2 - 0.08)].map((z) => <mesh key={z} position={[0, H - T - 0.025, z]}><boxGeometry args={[L - 0.16, 0.05, 0.03]} />{steel}</mesh>)}
      {[L / 2 - 0.08, 0.06, -0.06, -(L / 2 - 0.08)].map((x) => <mesh key={x} position={[x, H - T - 0.025, 0]}><boxGeometry args={[0.03, 0.05, W - 0.16]} />{steel}</mesh>)}
      {legs.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0, z]}>
          <mesh position={[0, (H - T) / 2 + 0.04, 0]}><boxGeometry args={[0.05, H - T - 0.08, 0.05]} />{steel}</mesh>
          <mesh position={[0, 0.06, 0]}><boxGeometry args={[0.07, 0.03, 0.07]} />{steel}</mesh>
          <mesh position={[0, 0.035, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, 0.03, 20]} /><meshStandardMaterial color='#111' roughness={0.8} /></mesh>
        </group>
      ))}
      {[1, -1].map((sx) => <mesh key={sx} position={[sx * (L / 2 - 0.3), 0.18, 0]}><boxGeometry args={[0.04, 0.04, W - 0.4]} />{steel}</mesh>)}
      {/* nätet: en mörk väv med vit kant, spänd mellan två stolpar som kläms fast i skivans kant */}
      <mesh position={[0, H + 0.08, 0]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[W + 0.3, 0.155]} /><meshStandardMaterial color='#0d1a33' alphaMap={netMap()} alphaTest={0.5} side={2} roughness={0.9} /></mesh>
      <mesh position={[0, H + 0.162, 0]}><boxGeometry args={[0.006, 0.014, W + 0.3]} />{white}</mesh>
      {[1, -1].map((sz) => (
        <group key={sz} position={[0, H, sz * (W / 2 + 0.15)]}>
          <mesh position={[0, 0.085, 0]}><cylinderGeometry args={[0.009, 0.009, 0.17, 12]} />{steel}</mesh>
          <mesh position={[0, 0.006, -sz * 0.075]}><boxGeometry args={[0.025, 0.012, 0.16]} />{steel}</mesh>
          <mesh position={[0, -0.02, -sz * 0.15]}><boxGeometry args={[0.04, 0.05, 0.03]} />{steel}</mesh>
        </group>
      ))}
    </group>
  );
}

/** Hur en spelare ser ut just nu: racketen (eventuellt med överstyrd position), utstyrseln och podracern. */
type View = { actor: Actor; gear: RacketGear; kind: Gear; lift: number; stretch: number; hidden: boolean; lean: [number, number]; pod?: { pos: [number, number, number]; heading: number; ridden: boolean } };

/** Hologrammens blå: över 1 så att det blommar som en projektion. */
const HOLO = new THREE.Color('#8fdcff').multiplyScalar(1.6);
const TRAIL = new THREE.Color('#fff4e0').multiplyScalar(1.4);
const HOLO_LOST = new THREE.Color('#ff5a4a').multiplyScalar(0.5);

/**
 * En spelare: racketfiguren i sin färg och utstyrsel, och över den ett blått hologram med namnet och
 * livsprickarna, som flimrar och hackar till ibland som en projektion. `lean` lutar racketen framåt
 * och åt sidan i gångriktningen (i racketens eget plan, innanför vridningen).
 */
function Player({ view, name, color, max, showLives, t }: { view: View; name: string; color: string; max: number; showLives: boolean; t: number }) {
  const { actor, gear, kind, lift, stretch, hidden, pod, lean } = view;
  const top = (kind === 'falcon' ? 2.6 : actor.crown ? 2.5 : 2.2) + lift;
  const ph = hash(name) % 100;
  const glitch = Math.sin(t * 1.7 + ph) > 0.985;
  const flicker = 0.82 + 0.1 * Math.sin(t * 37 + ph) + (glitch ? -0.4 : 0);
  return (
    <>
      {pod && <group position={pod.pos} rotation={[0, pod.heading, 0]} scale={SCALE}><PodRacer color={color} t={t} /></group>}
      {!hidden && (
        <group position={actor.pos}>
          <group position={[0, lift, 0]} rotation={[0, actor.heading, 0]}>
            <RealRacket rotation={[(actor.seated ? -0.2 : 0) + lean[0], 0, actor.swing + lean[1]]} scale={[SCALE, SCALE * stretch, SCALE]} color={color} mood={actor.mood} crown={actor.crown} gear={gear} t={t} />
          </group>
          <Billboard position={[glitch ? 0.03 : 0, top, 0]}>
            <Text userData={{ noCast: true }} fontSize={0.22} color={HOLO} fillOpacity={flicker} outlineWidth={0.012} outlineBlur={0.08} outlineColor='#2a9dff' outlineOpacity={0.55 * flicker} anchorX='center' anchorY='bottom' letterSpacing={0.04}>{name}</Text>
            {showLives && Array.from({ length: max }, (_, i) => (
              <mesh key={i} position={[(i - (max - 1) / 2) * 0.17, -0.09, 0]} rotation={[0, 0, Math.PI / 4]}><planeGeometry args={[0.07, 0.07]} /><meshBasicMaterial color={i < actor.lives ? HOLO : HOLO_LOST} transparent opacity={(i < actor.lives ? 0.9 : 0.5) * flicker} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>
            ))}
          </Billboard>
        </group>
      )}
    </>
  );
}

/** När sablarna tänds, och när blasterskyttarna skjuter salut för vinnaren. */
const IGNITE = 1.3;
const salutes = (plan: RoundPlan) => [plan.crownAt + 0.4, plan.crownAt + 1.1];
/** Sablarnas tre möten i finalens duell, sekunder efter att duellanterna stannat. */
const CLASHES = [0.3, 0.65, 1.0];
/** Duellens mötespunkt: mitt emellan finalisterna framför bordet, i sabelhöjd. */
const CLASH_AT: [number, number, number] = [0, 1.3, 2.4];
/** Podracerns ilskna ärevarv runt salen: en ellips utanför ringen och framför bänken. */
const lap = (a: number): [number, number, number] => [6.2 * Math.cos(a), 0, 0.3 + 3.6 * Math.sin(a)];

/** Hur långt bak gången tittar för att få fram hastigheten. */
const GAIT_DT = 0.04;

/** Ett hugg: stiger mot träffen och sjunker tillbaka. */
const bump = (dt: number, rise = 0.15, fall = 0.25) => (dt < -rise || dt > fall ? 0 : dt < 0 ? ease(1 + dt / rise, 'out') : 1 - ease(dt / fall, 'inOut'));
const mix3 = (a: number[], b: number[], p: number): [number, number, number] => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
/** Handens plats i världen för en racket som står i `pos`, vänd `heading`. */
const handAt = (pos: number[], heading: number): [number, number, number] => {
  const [x, y, z] = HAND_POS.map((v) => v * SCALE);
  return [pos[0] + x * Math.cos(heading) + z * Math.sin(heading), pos[1] + y, pos[2] - x * Math.sin(heading) + z * Math.cos(heading)];
};

type Story = { plan: RoundPlan; kit: Record<string, Kit>; parried: Turn[]; trips: Trip[]; duel: boolean; knocked: boolean; miss: number; drawers: string[] };

/** Allt som bara beror på planen räknas en gång, inte varje bildruta. */
function story(plan: RoundPlan, merits?: Merits): Story {
  const kit = outfit(plan.standings, merits);
  const { winner, runnerUp, turns } = plan.final;
  const robed = (id: string) => kit[id].gear !== 'falcon';
  const miss = turns[turns.length - 1].at;
  return {
    plan, kit, parried: parries(plan, kit), trips: droidTrips(plan),
    duel: robed(winner) && robed(runnerUp),
    knocked: wieldsSaber(plan, kit, runnerUp, miss),
    miss,
    drawers: [winner, runnerUp].filter((id) => robed(id) && kit[id].gear !== 'saber'),
  };
}

function viewOf(st: Story, s: ReturnType<typeof stageAt>, before: ReturnType<typeof stageAt>, id: string, t: number): View {
  const { plan, kit } = st;
  const k = kit[id];
  const actor = { ...s.actors[id] };
  const outSeg = plan.segments.find((g) => g.turns[g.turns.length - 1].player === id);
  const o = outSeg?.turns[outSeg.turns.length - 1].at;
  const finalist = id === plan.final.winner || id === plan.final.runnerUp;
  let lift = 0, stretch = 1, hidden = false;
  let pod: View['pod'];

  // sabeln: tänds i introt (eller när en finalist drar sin i finalen), slocknar vid utslagningen,
  // huggen vid parader och i duellen, och utslagen ur tvåans hand vid finalens sista miss
  const knockedNow = st.knocked && id === plan.final.runnerUp && t >= st.miss;
  const saber = wieldsSaber(plan, kit, id, t) && !knockedNow;
  let ignite = st.drawers.includes(id) ? span(t, plan.final.at + 0.3, plan.final.at + 0.65) : span(t, IGNITE, IGNITE + 0.35);
  if (o !== undefined) ignite *= 1 - span(t, o + 0.15, o + 0.45);
  let swing = Math.max(0, ...st.parried.filter((x) => x.player === id).map((x) => bump(t - x.at)));
  const duelFrom = plan.final.at + DUEL.meet - 0.1, duelTo = plan.final.at + DUEL.part;
  if (st.duel && finalist && t >= duelFrom && t < duelTo) swing = 0.45 + 0.55 * Math.max(...CLASHES.map((c) => bump(t - (plan.final.at + DUEL.meet + c))));

  // podracern: under piloten i ringen, parkerad vid bänken efter ett ärevarv, eller för finalisten
  // parkerad när finalen börjar (piloten går själv till duellen)
  if (k.gear === 'pod') {
    const pods = plan.standings.filter((x) => kit[x].gear === 'pod');
    const w = plan.segments.length * 1.25 + 0.4;
    const left = pods.indexOf(id) === 0;
    const park = { pos: [left ? -(w / 2 + 2.6) : w / 2 + 2.6, 0, BENCH_Z + 0.4] as [number, number, number], heading: left ? 0 : Math.PI };
    const hover = 0.16 + Math.sin(t * 2.1) * 0.03;
    if (o !== undefined && t >= o + 0.5) {
      const from = stageAt(plan, o + 0.5).actors[id].pos;
      const a0 = Math.atan2((from[2] - 0.3) / 3.6, from[0] / 6.2);
      const u = span(t, o + 0.5, o + 2.3), u2 = span(t, o + 2.3, o + 3.0), u3 = span(t, o + 3.0, o + 3.6);
      const a = a0 + Math.PI * 2 * ease(u, 'inOut');
      const onLap = mix3(from, lap(a), ease(Math.min(1, u / 0.15), 'inOut'));
      const end = lap(a0 + Math.PI * 2);
      const tangent = Math.atan2(-(3.6 * Math.cos(a)), -6.2 * Math.sin(a));
      const p = u2 > 0 ? mix3(end, park.pos, ease(u2, 'inOut')) : onLap;
      const heading = u2 > 0 ? park.heading : tangent;
      if (u3 <= 0) {
        // piloten sitter kvar i kapseln, sur
        Object.assign(actor, { pos: p, heading, seated: false, mood: 'grim' as const });
        lift = hover;
        pod = { pos: p, heading, ridden: true };
      } else {
        const seat = seatPos(plan.segments.indexOf(outSeg!), plan.segments.length);
        const q = ease(u3, 'inOut');
        Object.assign(actor, { pos: mix3(park.pos, seat, q), heading: q < 1 ? Math.atan2(seat[0] - park.pos[0], seat[2] - park.pos[2]) : 0, seated: q >= 1 });
        pod = { ...park, ridden: false };
      }
    } else if (finalist && t >= plan.final.at) {
      const at = stageAt(plan, plan.final.at).actors[id];
      const q = ease(span(t, plan.final.at, plan.final.at + 1.2), 'inOut');
      pod = { pos: mix3(at.pos, park.pos, q), heading: q < 0.5 ? at.heading : park.heading, ridden: false };
    } else {
      lift = hover;
      pod = { pos: actor.pos, heading: actor.heading, ridden: true };
    }
  }

  // skeppet: varvar upp motorerna och hoppar till ljusfart i stället för att gå till bänken
  let boost = 1;
  if (k.gear === 'falcon' && o !== undefined && t >= o + 0.5) {
    const from = stageAt(plan, o + 0.5).actors[id];
    const spin = span(t, o + 0.5, o + 0.9), jump = span(t, o + 0.9, o + 1.15);
    Object.assign(actor, { pos: from.pos, heading: from.heading, seated: false });
    boost = 1 + 2.5 * spin;
    lift = 0.3 * ease(spin, 'inOut') + 18 * jump * jump;
    stretch = 1 + 9 * jump;
    hidden = t >= o + 1.15;
  }

  // gången: hastigheten ur var figuren stod för ett ögonblick sedan, i racketens eget plan (sida, fram).
  // Steg som gungar och vaggar, lutning in i rörelsen; den som åker podracer eller är skepp svävar.
  const walks = !pod?.ridden && k.gear !== 'falcon' && !actor.seated;
  const vx = (actor.pos[0] - before.actors[id].pos[0]) / GAIT_DT, vz = (actor.pos[2] - before.actors[id].pos[2]) / GAIT_DT;
  const h = actor.heading;
  const side = vx * Math.cos(h) - vz * Math.sin(h), fwd = vx * Math.sin(h) + vz * Math.cos(h);
  const speed = walks ? Math.min(1, Math.hypot(vx, vz) / 1.2) : 0;
  const ph = (hash(id) % 628) / 100;
  const step = Math.sin(t * 11 + ph);
  lift += Math.abs(step) * 0.05 * speed;
  const clampLean = (v: number) => THREE.MathUtils.clamp(v, -0.22, 0.22);
  const lean: [number, number] = walks ? [clampLean(fwd * 0.07), clampLean(-side * 0.07) + step * 0.06 * speed] : [0, 0];
  // manteln släpar efter rörelsen och andas lite när figuren står still
  const sway: [number, number] = [-lean[0] * 0.8 + Math.sin(t * 1.3 + ph) * 0.012, -lean[1] * 0.8 + Math.sin(t * 1.1 + ph * 2) * 0.01];

  // blicken: mot bollen när den är framför, annars rakt fram; blinkar var fjärde sekund ungefär
  const eye = [actor.pos[0], actor.pos[1] + lift + 1.17 * SCALE, actor.pos[2]];
  const ball = s.ball;
  let gaze: [number, number] = [0, 0];
  if (ball) {
    const dx = ball[0] - eye[0], dy = ball[1] - eye[1], dz = ball[2] - eye[2];
    const lx = dx * Math.cos(h) - dz * Math.sin(h), lz = dx * Math.sin(h) + dz * Math.cos(h);
    if (lz > 0) gaze = [THREE.MathUtils.clamp(Math.atan2(lx, lz), -0.6, 0.6), THREE.MathUtils.clamp(Math.atan2(-dy, Math.hypot(lx, lz)), -0.4, 0.4)];
  }
  const c = (t + ph) % (3.4 + (ph % 1.5));
  const blink = c < 0.15 ? Math.sin((c / 0.15) * Math.PI) : 0;

  const weapon = k.gear === 'falcon' || (k.gear === 'pod' && !saber) ? undefined : saber ? 'saber' as const : k.gear === 'blaster' ? 'blaster' as const : undefined;
  const bolt = weapon === 'blaster' ? salutes(plan).map((at) => t - at).find((age) => age >= 0 && age < 0.6) : undefined;
  const gear: RacketGear = { robe: k.gear !== 'falcon', hood: !k.padawan, master: k.master, sway, gaze, blink, weapon, saber: k.saber, ignite, swing, falcon: k.gear === 'falcon', boost, bolt };
  return { actor, gear, kind: k.gear, lift, stretch, hidden, lean, pod };
}

/** Gnistorna just nu: parader, duellens möten, den utslagna sabeln och skeppets hopp. */
function sparksAt(st: Story, t: number): { at: [number, number, number]; age: number }[] {
  const { plan } = st;
  const out: { at: [number, number, number]; age: number }[] = [];
  for (const x of st.parried) if (Math.abs(t - x.at - 0.2) < 0.25) out.push({ at: (stageAt(plan, x.at).ball ?? [0, 1, 0]) as [number, number, number], age: t - x.at });
  if (st.duel) for (const c of CLASHES) out.push({ at: CLASH_AT, age: t - (plan.final.at + DUEL.meet + c) });
  if (st.knocked) { const a = stageAt(plan, st.miss).actors[plan.final.runnerUp]; out.push({ at: handAt(a.pos, a.heading), age: t - st.miss }); }
  const falcon = plan.standings.find((id) => st.kit[id].gear === 'falcon');
  const seg = plan.segments.find((g) => g.turns[g.turns.length - 1].player === falcon);
  const jump = seg && seg.turns[seg.turns.length - 1].at + 0.9;
  if (falcon && jump !== undefined && t >= jump && t <= jump + 0.4) { const [x, , z] = stageAt(plan, jump - 0.4).actors[falcon].pos; out.push({ at: [x, 1.2, z], age: t - jump }); }
  return out.filter((x) => x.age >= 0 && x.age <= 0.4);
}

/** Tvåans sabel efter att den slagits ur handen: en snurrande båge ner på golvet, där den slocknar. */
function KnockedSaber({ st, t }: { st: Story; t: number }) {
  const { plan } = st;
  const age = t - st.miss;
  if (!st.knocked || age < 0) return null;
  const a = stageAt(plan, st.miss).actors[plan.final.runnerUp];
  const from = handAt(a.pos, a.heading);
  const away = Math.sign(a.pos[0]) || 1;
  const fly = Math.min(age, 0.85);
  const pos: [number, number, number] = [from[0] + away * 2.4 * fly, Math.max(0.05, from[1] + 3.2 * fly - 4.9 * fly * fly), from[2] + 0.9 * fly];
  const landed = age >= 0.85;
  const rot: [number, number, number] = landed ? [0, 0, Math.PI / 2] : [fly * 9, 0, fly * 14];
  const kit = st.kit[plan.final.runnerUp];
  return (
    <group scale={SCALE}>
      <LightSaber color={kit.saber} t={t} on={1 - span(age, 0.85, 1.05)} position={[pos[0] / SCALE, pos[1] / SCALE, pos[2] / SCALE]} rotation={rot} />
    </group>
  );
}

function Replay({ st, cast, t, sky }: { st: Story; cast: Cast; t: number; sky: Sky }) {
  const { plan } = st;
  const s = stageAt(plan, t);
  const before = stageAt(plan, t - GAIT_DT);
  const sparks = sparksAt(st, t);
  // bollens ljusspår: där den var de senaste hundradelarna, svagare och mindre bakåt
  const trail = s.ball ? Array.from({ length: 9 }, (_, i) => ballPos(plan, t - (i + 1) * 0.012)).filter((p): p is [number, number, number] => !!p) : [];
  const flash = sparks.reduce((m, x) => Math.max(m, x.age < 0.25 ? 1 - x.age / 0.25 : 0), 0);
  const droid = droidAt(st.trips, t);
  return (
    <>
      <Lights sky={sky} />
      <Lit>
        <Hall sky={sky} />
        <Stand t={t} hype={cheer(plan, t)} crownAt={plan.crownAt} winner={cast[plan.final.winner]?.name ?? '?'} ball={s.ball} />
        <Bench seats={plan.segments.length} />
        <Table />
        {plan.standings.map((id) => <Player key={id} view={viewOf(st, s, before, id, t)} name={cast[id]?.name ?? '?'} color={cast[id]?.color ?? PALETTE[0]} max={plan.lives} showLives={plan.segments.length > 0 && t < plan.final.at} t={t} />)}
        {s.ball && (
          // bollen snurrar: den tryckta randen syns i ultrarapiden
          <group position={s.ball} rotation={[t * 30, t * 11, 0]}>
            <mesh><sphereGeometry args={[BALL_R, 32, 24]} /><meshPhysicalMaterial color='#f6f4ef' roughness={0.5} clearcoat={0.15} sheen={0.3} /></mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[BALL_R * 1.002, 0.004, 6, 32, Math.PI * 0.7]} /><meshStandardMaterial color='#d24a14' roughness={0.6} /></mesh>
          </group>
        )}
        {trail.map((p, i) => <mesh key={i} position={p} scale={1 - i * 0.08}><sphereGeometry args={[BALL_R * 0.8, 12, 8]} /><meshBasicMaterial color={TRAIL} transparent opacity={0.22 * (1 - i / 9)} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>)}
        {st.trips.filter((x) => t >= x.lands && t < x.pick).map((x) => <mesh key={x.lands} position={x.ball}><sphereGeometry args={[BALL_R, 24, 16]} /><meshPhysicalMaterial color='#f6f4ef' roughness={0.5} clearcoat={0.15} /></mesh>)}
        <Astromech position={droid.pos} heading={droid.heading} t={t} moving={droid.moving} carrying={droid.carrying} />
        {s.crownDrop && <RealCrown position={s.crownDrop} scale={0.8 * SCALE} rotation={[0, t * 5, 0]} />}
        <KnockedSaber st={st} t={t} />
      </Lit>
      {sparks.map((x, i) => <Sparks key={i} position={x.at} age={x.age} seed={i + 1} />)}
      {/* ett enda blixtljus för alla gnistor: ljus som kommer och går kompilerar om shaders */}
      <pointLight position={sparks[0]?.at ?? [0, -5, 0]} color='#ffd8a0' intensity={10 * flash} distance={6} decay={2} />
      {/* templet ligger högt: staden syns under och bortom fönstren */}
      <RealCity t={t} sky={sky} />
    </>
  );
}

type Out = { turn: Turn; until: number };

/** Handhållen kamera: långsam, oregelbunden gungning i position och blick, som en operatör med kameran på axeln. */
function handheld(p: CameraPose, t: number): CameraPose {
  const n = (f: number, ph: number) => Math.sin(t * f + ph) * 0.6 + Math.sin(t * f * 2.7 + ph * 3) * 0.4;
  return { ...p, position: [p.position[0] + n(0.8, 0) * 0.03, p.position[1] + n(1.1, 1) * 0.02, p.position[2] + n(0.6, 2) * 0.025], lookAt: [p.lookAt[0] + n(0.9, 3) * 0.02, p.lookAt[1] + n(1.3, 4) * 0.015, p.lookAt[2]] };
}

function cameraAt(plan: RoundPlan, t: number, firstServe: number, outs: Out[]): CameraPose {
  if (t < firstServe) {
    // in genom salen: från fönstren och läktaren ner mot bordet
    const p = ease(span(t, 0, firstServe), 'inOut');
    return { position: lerp3([0, 6.8, 13], [0, 4.6, 8.8], p), lookAt: lerp3([0, 3.2, -9], [0, 0.8, -0.8], p), fov: 44, snap: true };
  }
  if (t >= plan.crownAt) {
    // kronan på vinnaren, sedan bakåt så att läktaren kommer med
    const w = stageAt(plan, t).actors[plan.final.winner].pos;
    const p = ease(span(t, plan.crownAt + 1.4, plan.duration), 'inOut');
    return { position: lerp3([w[0] * 0.7, 2.1, 3.4], [w[0] * 0.3, 3.6, 8.2], p), lookAt: lerp3([w[0], 1.3, w[2]], [w[0] * 0.5, 1.6, -3], p), fov: 38, snap: true };
  }
  if (t >= plan.final.at + DUEL.meet - 0.1 && t < plan.final.at + DUEL.part) {
    // duellen: nära, i sabelhöjd, rakt framifrån
    return { position: [0, 1.55, 5.0], lookAt: [0, 1.15, 2.3], fov: 36, snap: true };
  }
  if (t >= plan.final.at) {
    // finalen från sidan, lågt, sakta närmare; långt nog bak för att båda kortsidorna ryms i 4:3
    return { position: [0, 1.9, 8.0 - span(t, plan.final.at, plan.crownAt) * 0.8], lookAt: [0, 0.95, 0], fov: 42, snap: true };
  }
  const out = outs.find(({ turn }) => t >= turn.at && t < turn.at + 1.4);
  if (out) {
    // närbild på den som åkte ut, där hen stod när bollen gick förbi
    const v = stageAt(plan, out.turn.at).actors[out.turn.player].pos;
    return { position: [v[0] * 1.1, 1.9, v[2] + 3.2], lookAt: [v[0], 1.0, v[2]], fov: 34, snap: true };
  }
  // varven: vid bild som sakta driver i sidled; utan snap glider kameran mjukt tillbaka från närbilderna
  return { position: [Math.sin(t * 0.18) * 2.4, 4.4, 8.6], lookAt: [0, 0.8, -0.6], fov: 44 };
}

export type ReplayOptions = { hour?: number; merits?: Merits };

/**
 * Reprisen som vanlig scen: samma form som Mustafar och Cloud City, men byggd ur rundans plan.
 * `hour` är när rundan spelades (svensk tid, timmar med decimaler) och sätter dygnet över staden;
 * utan den är det natt. Ord och ljud räknas i scenens tid och flyttas till verklig tid med
 * ultrarapiden (slowmo.real), kameran och scenen får scenens tid via warp.
 */
export function rundanScene(plan: RoundPlan, cast: Cast, { hour, merits }: ReplayOptions = {}): Scene {
  const name = (id: string) => cast[id]?.name ?? '?';
  const { final, crownAt, standings } = plan;
  const { warp, real } = slowmo(plan);
  const duration = real(plan.duration);
  const firstServe = plan.segments[0]?.turns[0].at ?? final.turns[0].at;
  const outs: Out[] = plan.segments.map((s, i) => ({ turn: s.turns[s.turns.length - 1], until: plan.segments[i + 1]?.turns[0].at ?? final.at }));
  const turns = [...plan.segments.flatMap((s) => s.turns), ...final.turns];
  const bounces = turns.flatMap((a, i) => (a.kind === 'hit' && turns[i + 1] ? [a.at + (turns[i + 1].at - a.at) * 0.72] : []));
  // Finalparet i bokstavsordning: "vinnaren mot tvåan" hade avslöjat slutet.
  const [a, b] = [final.winner, final.runnerUp].map(name).sort((x, y) => x.localeCompare(y, 'sv'));
  const n = standings.length;
  const st = story(plan, merits);
  const { kit } = st;
  const sky = daylight(hour ?? 23);
  const gearOut = (gear: Gear) => outs.filter(({ turn }) => kit[turn.player].gear === gear).map(({ turn }) => turn.at);
  const cues: { at: number; cue: CueName }[] = [
    ...turns.filter((x) => x.kind === 'hit').map((x) => ({ at: x.at, cue: 'pok' as CueName })),
    ...bounces.map((at) => ({ at, cue: 'pok' as CueName })),
    ...outs.flatMap(({ turn }) => [{ at: turn.at, cue: 'slam' as CueName }, { at: turn.at + 0.25, cue: 'cheer' as CueName }]),
    { at: final.at, cue: 'slam' },
    { at: crownAt, cue: 'cheer' },
    { at: crownAt + 0.35, cue: 'slam' },
    ...(Object.values(kit).some((k) => k.gear === 'saber') ? [{ at: IGNITE, cue: 'ignite' as CueName }] : []),
    ...(st.drawers.length ? [{ at: final.at + 0.3, cue: 'ignite' as CueName }] : []),
    ...(Object.values(kit).some((k) => k.gear === 'blaster') ? salutes(plan).map((at) => ({ at, cue: 'blast' as CueName })) : []),
    // en hundradel efter "pok": två ljud på exakt samma tid och det andra hörs aldrig
    ...st.parried.map((x) => ({ at: x.at + 0.012, cue: 'clash' as CueName })),
    ...(st.duel ? CLASHES.map((c) => ({ at: final.at + DUEL.meet + c, cue: 'clash' as CueName })) : []),
    ...(st.knocked ? [{ at: st.miss + 0.02, cue: 'clash' as CueName }, { at: st.miss + 0.85, cue: 'retract' as CueName }] : []),
    ...gearOut('saber').map((at) => ({ at: at + 0.15, cue: 'retract' as CueName })),
    ...gearOut('falcon').map((at) => ({ at: at + 0.9, cue: 'jump' as CueName })),
    ...gearOut('pod').map((at) => ({ at: at + 0.5, cue: 'roar' as CueName })),
    ...st.trips.map((x) => ({ at: x.pick, cue: 'beep' as CueName })),
  ];
  return {
    key: 'rundan',
    duration,
    photo: true,
    words: (ctx) => ([
      { at: 0.4, until: firstServe - 0.2, text: 'Jeditemplet · Coruscant', style: 'subtitle' },
      { at: 0.9, until: firstServe - 0.2, text: n > 2 ? `${n} spelare · ${plan.lives} liv` : `${n} spelare`, style: 'name', size: 0.8 },
      ...outs.map(({ turn, until }): Word => ({ at: turn.at + 0.15, until, text: `${name(turn.player)} åker ut · ${ordinal(standings.indexOf(turn.player) + 1)} plats`, style: 'subtitle' })),
      { at: final.at, until: final.turns[0].at, text: 'FINALEN', size: 2.4 },
      { at: final.at + 0.3, until: final.turns[0].at, text: `${a} mot ${b}`, style: 'subtitle' },
      { at: crownAt + 0.3, text: 'YUB NUB!', size: 2.2, color: '#ffb35c' },
      { at: crownAt + 1.1, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
    ] as Word[]).map((w) => ({ ...w, at: real(w.at), until: w.until === undefined ? undefined : real(w.until) })),
    cues: cues.filter((c) => c.at <= plan.duration).map((c) => ({ ...c, at: real(c.at) })),
    fade: (t) => Math.max(1 - span(t, 0, 0.8), span(t, duration - 0.8, duration - 0.2) * 0.85),
    warp,
    camera: (t) => handheld(cameraAt(plan, t, firstServe, outs), t),
    Scene: ({ t }) => <Replay st={st} cast={cast} t={t} sky={sky} />,
  };
}
