'use client';
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, type ThreeElements } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { FinaleSummary } from '@/lib/domain/finale';
import { buildWeave3D, cameraAt, curveProgress, type Weave3DCard, type Weave3DCurve, type Weave3DScene } from './scene';

/**
 * Kronans vandring i 3D. Samma data och samma kurvmatte som SVG-versionen —
 * skillnaden är att kameran flyger genom väven i stället för att betrakta den platt.
 *
 * Scrollen driver ETT tal (`progressRef`), som scenen läser i sin egen frame-loop.
 * Därför behövs ingen React-rendering per frame, och GSAP/Lenis förblir enda
 * scroll-motorn — drei's ScrollControls skulle konkurrera med Lenis om samma hjul.
 */

type ProgressRef = { current: number };

const GOLD = '#e7c25c';
const GOLD_DIM = '#8a6a1f';

function CurveTube({ item, total, progressRef }: { item: Weave3DCurve; total: number; progressRef: ProgressRef }) {
  const geometry = useMemo(() => new THREE.TubeGeometry(item.curve, 64, 0.055, 8, false), [item.curve]);
  const ref = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame(() => {
    const p = curveProgress(item.order, total, progressRef.current);
    if (ref.current) {
      // Tuben "ritas" genom att bara visa en växande del av indexbufferten.
      const count = geometry.index ? geometry.index.count : 0;
      geometry.setDrawRange(0, Math.floor(count * p));
      ref.current.visible = p > 0;
    }
    if (mat.current) {
      // Nyaste kurvan glöder starkast, äldre lugnar ner sig.
      mat.current.emissiveIntensity = p >= 1 ? 0.8 : 2.6;
    }
  });

  return (
    <mesh ref={ref} geometry={geometry} visible={false}>
      <meshStandardMaterial ref={mat} color={GOLD} emissive={GOLD} emissiveIntensity={1} roughness={0.35} metalness={0.7} toneMapped={false} />
    </mesh>
  );
}

function PlayerCard({ card, isWinner, progressRef }: { card: Weave3DCard; isWinner: boolean; progressRef: ProgressRef }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    // Mjuk svävning så scenen aldrig står helt still.
    const t = state.clock.elapsedTime;
    group.current.position.y = card.position[1] + Math.sin(t * 0.6 + card.position[0]) * 0.12;
    if (isWinner) {
      // Vinnaren växer fram mot slutet av akten.
      const grow = Math.max(0, (progressRef.current - 0.85) / 0.15);
      const s = 1 + grow * 0.9;
      group.current.scale.setScalar(s);
    }
  });

  return (
    <group ref={group} position={card.position}>
      <Billboard>
        <mesh>
          <planeGeometry args={[3.4, 1.1]} />
          <meshStandardMaterial
            color={isWinner ? '#2a2113' : '#141019'}
            emissive={isWinner ? GOLD : '#000000'}
            emissiveIntensity={isWinner ? 0.35 : 0}
            transparent
            opacity={0.92}
            roughness={0.6}
          />
        </mesh>
        <Text position={[0, 0.2, 0.01]} fontSize={0.34} color={isWinner ? GOLD : '#f1e3c6'} anchorX='center' anchorY='middle'>
          {card.name}
        </Text>
        <Text position={[0, -0.22, 0.01]} fontSize={0.18} color={GOLD_DIM} anchorX='center' anchorY='middle'>
          {`${card.wins} vinster${card.defences > 0 ? ` · ${card.defences} försvar` : ''}`}
        </Text>
      </Billboard>
    </group>
  );
}

function TravellingCrown({ scene, progressRef }: { scene: Weave3DScene; progressRef: ProgressRef }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current || scene.curves.length === 0) return;
    const total = scene.curves.length;
    const t = progressRef.current;
    const idx = Math.min(total - 1, Math.floor(t * total));
    const local = curveProgress(idx, total, t);
    const point = scene.curves[idx].curve.getPoint(Math.min(1, local));
    ref.current.position.copy(point);
    ref.current.visible = t > 0.001 && t < 0.995;
    ref.current.rotation.y += 0.05;
  });

  return (
    <group ref={ref}>
      <mesh>
        <torusGeometry args={[0.28, 0.09, 8, 24]} />
        <meshStandardMaterial color='#fff2c0' emissive='#fff2c0' emissiveIntensity={4} toneMapped={false} />
      </mesh>
      <pointLight color={GOLD} intensity={12} distance={9} />
    </group>
  );
}

function Rig({ scene, progressRef }: { scene: Weave3DScene; progressRef: ProgressRef }) {
  useFrame((state) => {
    const { position, lookAt } = cameraAt(progressRef.current, scene.radius);
    // Lerp i stället för hård sättning: gör skrubbning mjuk utan att tappa kontroll.
    state.camera.position.lerp(position, 0.08);
    state.camera.lookAt(lookAt);
  });
  return null;
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const geometry = useMemo(() => {
    const n = 900;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      // Deterministisk fördelning (ingen Math.random) så scenen är reproducerbar.
      const a = i * 2.399963;
      const r = 6 + (i % 90) * 0.32;
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = ((i % 47) - 23) * 0.55;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.02;
  });

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={0.06} color={GOLD} transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export function CrownWeave3D({
  summary,
  progressRef,
  onReady,
  onContextLost,
}: {
  summary: FinaleSummary;
  progressRef: ProgressRef;
  onReady?: (api: { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }) => void;
  onContextLost?: () => void;
}) {
  const scene = useMemo(
    () => buildWeave3D(
      summary.standings.map((s) => ({ id: s.id, name: s.name, wins: s.totalWins })),
      summary.transfers,
      summary.defences,
    ),
    [summary],
  );
  const winnerId = summary.standings[0]?.id ?? null;

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 3, 28], fov: 55 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={(state) => {
        onReady?.({ gl: state.gl, scene: state.scene, camera: state.camera });
        // En förlorad kontext får R3F att kasta på getContextAttributes(); fånga den
        // och låt föräldern falla tillbaka på SVG-väven i stället.
        state.gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          onContextLost?.();
        });
      }}
    >
      <color attach='background' args={['#05040a']} />
      <fog attach='fog' args={['#05040a', 18, 60]} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 10, 8]} intensity={0.7} color='#ffe9b0' />

      <Dust />
      {scene.curves.map((c) => (
        <CurveTube key={c.order} item={c} total={scene.curves.length} progressRef={progressRef} />
      ))}
      {scene.cards.map((c) => (
        <PlayerCard key={c.id} card={c} isWinner={c.id === winnerId} progressRef={progressRef} />
      ))}
      <TravellingCrown scene={scene} progressRef={progressRef} />
      <Rig scene={scene} progressRef={progressRef} />

      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.25} luminanceSmoothing={0.9} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}

export type { ThreeElements };
