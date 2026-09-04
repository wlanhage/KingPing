'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Line, Sparkles, Text } from '@react-three/drei';
import * as THREE from 'three';
import { Title3D } from '../../weave3d/Title3D';
import { novaIntensity, STATION, stationT, trailProgress, type Cosmos, type Planet, type Trail } from './scene';

/**
 * Galaxen: planeter i omloppsbana, ljusspår mellan dem, en komet som reser längs
 * spåren, och vinnarens supernova. Allt läser sidans progress ur en ref i sin
 * frame-loop — ingen React-render per bildruta.
 */

type ProgressRef = { current: number };

const GOLD = '#e7c25c';
const PALETTE = ['#e7c25c', '#9fd0ff', '#ff9fb0', '#b9ffcf', '#d6b3ff', '#ffd9a8', '#a8f0ff'];

function OrbitRing({ radius, tilt }: { radius: number; tilt: number }) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push([Math.cos(a) * radius, Math.sin(a) * radius * tilt, Math.sin(a) * radius]);
    }
    return pts;
  }, [radius, tilt]);
  return <Line points={points} color='#6f5a3a' transparent opacity={0.28} lineWidth={1} />;
}

function PlanetBody({ planet, index, progressRef }: { planet: Planet; index: number; progressRef: ProgressRef }) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const color = planet.isWinner ? GOLD : PALETTE[index % PALETTE.length];

  useFrame((state) => {
    if (!group.current || !body.current || !mat.current) return;
    const t = state.clock.elapsedTime;
    body.current.rotation.y = t * 0.25;
    if (!planet.isWinner) return;
    // Supernovan: kroppen sväller och glöder, ringen spränger utåt.
    // Måttlig flamma: ×3.2 och emissive 9 brände ut hela bilden till en vit klump.
    const nova = novaIntensity(progressRef.current);
    body.current.scale.setScalar(1 + nova * 1.5);
    mat.current.emissiveIntensity = 0.9 + nova * 3.2;
  });

  return (
    <group ref={group} position={planet.position}>
      <mesh ref={body}>
        <sphereGeometry args={[planet.radius, 40, 40]} />
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={planet.isWinner ? 0.9 : 0.35}
          roughness={0.55}
          metalness={0.25}
          toneMapped={false}
        />
      </mesh>
      {planet.isWinner && <CrownRing radius={planet.radius} progressRef={progressRef} />}
      <Billboard position={[0, planet.radius + 0.9, 0]}>
        <Title3D size={0.55} layers={6} depth={0.025} color={planet.isWinner ? '#fff2c0' : '#f1e3c6'} sideColor={planet.isWinner ? '#8a6a1f' : '#2c2740'}>
          {planet.name}
        </Title3D>
        <Text position={[0, -0.5, 0]} fontSize={0.22} color='#b29a72' anchorX='center' anchorY='middle'>
          {`${planet.wins} vinster${planet.defences ? ` · ${planet.defences} försvar` : ''}`}
        </Text>
      </Billboard>
    </group>
  );
}

/** Kronan som Saturnusring runt vinnaren. Vid supernovan expanderar den som en chockvåg. */
function CrownRing({ radius, progressRef }: { radius: number; progressRef: ProgressRef }) {
  const ring = useRef<THREE.Mesh>(null);
  const shock = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ring.current) ring.current.rotation.z = t * 0.15;
    if (shock.current) {
      const nova = novaIntensity(progressRef.current);
      shock.current.visible = nova > 0;
      const grow = stationT(progressRef.current, STATION.SUPERNOVA, 1);
      shock.current.scale.setScalar(1 + grow * 14);
      const m = shock.current.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, 0.9 - grow * 1.1);
    }
  });
  return (
    <>
      <mesh ref={ring} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[radius * 2.1, 0.09, 12, 96]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={2.2} metalness={0.9} roughness={0.25} toneMapped={false} />
      </mesh>
      <mesh ref={shock} rotation={[Math.PI / 2.4, 0, 0]} visible={false}>
        <ringGeometry args={[radius * 2.0, radius * 2.35, 96]} />
        <meshBasicMaterial color='#fff2c0' transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </>
  );
}

function LightTrail({ trail, total, progressRef }: { trail: Trail; total: number; progressRef: ProgressRef }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(trail.curve, 72, 0.07, 8, false), [trail.curve]);
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const g = stationT(progressRef.current, STATION.GALAXY, STATION.WARP);
    const p = trailProgress(trail.order, total, g);
    if (mesh.current) {
      const count = geometry.index ? geometry.index.count : 0;
      geometry.setDrawRange(0, Math.floor(count * p));
      mesh.current.visible = p > 0;
    }
    if (mat.current) mat.current.emissiveIntensity = p >= 1 ? 1.1 : 3.4;
  });
  return (
    <mesh ref={mesh} geometry={geometry} visible={false}>
      <meshStandardMaterial ref={mat} color={GOLD} emissive={GOLD} emissiveIntensity={1} roughness={0.3} metalness={0.6} toneMapped={false} />
    </mesh>
  );
}

/** Kometen: huvud + punktljus som reser längs det spår som håller på att ritas. */
function Comet({ cosmos, progressRef }: { cosmos: Cosmos; progressRef: ProgressRef }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current || cosmos.trails.length === 0) return;
    const g = stationT(progressRef.current, STATION.GALAXY, STATION.WARP);
    const total = cosmos.trails.length;
    const idx = Math.min(total - 1, Math.floor(g * total));
    const local = trailProgress(idx, total, g);
    ref.current.position.copy(cosmos.trails[idx].curve.getPoint(Math.min(1, local)));
    ref.current.visible = g > 0.001 && g < 0.999;
    ref.current.rotation.y = state.clock.elapsedTime * 3;
  });
  return (
    <group ref={ref} visible={false}>
      <mesh>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color='#fff6d5' emissive='#fff6d5' emissiveIntensity={6} toneMapped={false} />
      </mesh>
      <pointLight color={GOLD} intensity={18} distance={14} decay={1.5} />
    </group>
  );
}

function Supernova({ winner, progressRef }: { winner: Planet; progressRef: ProgressRef }) {
  const group = useRef<THREE.Group>(null);
  const title = useRef<THREE.Group>(null);
  useFrame(() => {
    const nova = novaIntensity(progressRef.current);
    const t = stationT(progressRef.current, STATION.SUPERNOVA, 1);
    if (group.current) group.current.visible = nova > 0;
    if (title.current) {
      title.current.visible = t > 0.05 && t < 0.95;
      const rise = Math.min(1, Math.max(0, (t - 0.05) / 0.5));
      title.current.position.y = winner.position[1] + 2.6 + rise * 2.4;
      title.current.scale.setScalar(0.5 + rise * 1.1);
      // Tonar ut när eftertexterna når bilden, så de aldrig ligger ovanpå titeln.
      const fade = 1 - Math.min(1, Math.max(0, (t - 0.6) / 0.3));
      title.current.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (m && 'opacity' in m) { m.transparent = true; m.opacity = fade; }
      });
    }
  });
  return (
    <>
      <group ref={group} position={winner.position} visible={false}>
        <Sparkles count={320} scale={16} size={5} speed={2.4} color='#ffe6a8' opacity={0.7} />
        <pointLight color='#fff2c0' intensity={35} distance={40} decay={1.4} />
      </group>
      <group ref={title} position={[winner.position[0], winner.position[1] + 2.6, winner.position[2]]} visible={false}>
        <Billboard>
          <Title3D size={2.2} layers={18} depth={0.08}>{winner.name.toUpperCase()}</Title3D>
          <Title3D position={[0, -1.6, 0]} size={0.42} layers={5} depth={0.025} color={GOLD} sideColor='#5a4512'>
            SÄSONGENS HÄRSKARE
          </Title3D>
        </Billboard>
      </group>
    </>
  );
}

export function Galaxy({ cosmos, progressRef }: { cosmos: Cosmos; progressRef: ProgressRef }) {
  const winner = cosmos.planets.find((p) => p.isWinner) ?? null;
  return (
    <group>
      {cosmos.planets.map((p) => <OrbitRing key={`orbit-${p.id}`} radius={p.orbit} tilt={0.35} />)}
      {cosmos.trails.map((t) => <LightTrail key={t.order} trail={t} total={cosmos.trails.length} progressRef={progressRef} />)}
      {cosmos.planets.map((p, i) => <PlanetBody key={p.id} planet={p} index={i} progressRef={progressRef} />)}
      <Comet cosmos={cosmos} progressRef={progressRef} />
      {winner && <Supernova winner={winner} progressRef={progressRef} />}
    </group>
  );
}
