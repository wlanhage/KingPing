'use client';
import { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { FinaleSummary } from '@/lib/domain/finale';
import { Starfield } from './space/Starfield';
import { Nebula } from './space/Nebula';
import { Sun } from './space/Sun';
import { Galaxy } from './space/Galaxy';
import { buildCosmos, cameraAt } from './space/scene';

/**
 * Den fasta fullskärmscanvasen bakom hela finalen. Scrollen driver två tal — sidans
 * progress och hastighet — som scenen läser i sin frame-loop. Kameran, warpen och
 * post-effekterna härleds ur dem; ingen React-render per bildruta.
 */

type Refs = { progress: { current: number }; velocity: { current: number } };

function Rig({ cosmos, progress, velocity, warp }: Refs & { cosmos: ReturnType<typeof buildCosmos>; warp: { current: number } }) {
  const winner = useMemo(() => cosmos.planets.find((p) => p.isWinner) ?? null, [cosmos]);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const look = useRef(new THREE.Vector3());

  useFrame(() => {
    const pose = cameraAt(progress.current, cosmos, winner);
    // Lerp ger mjuk skrubbning; blicken lerpas separat så svängar inte knycker.
    camera.position.lerp(pose.position, 0.07);
    look.current.lerp(pose.lookAt, 0.09);
    camera.lookAt(look.current);
    // Scrollfarten ger en liten extra warp även utanför warpstationen.
    const speedWarp = Math.min(0.35, Math.abs(velocity.current) / 9000);
    warp.current += (Math.max(pose.warp, speedWarp) - warp.current) * 0.12;
    const fov = pose.fov + warp.current * 8;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov += (fov - camera.fov) * 0.1; camera.updateProjectionMatrix(); }
  });
  return null;
}

function Effects({ warp }: { warp: { current: number } }) {
  const aberration = useRef<{ offset: THREE.Vector2 } | null>(null);
  useFrame(() => {
    // Aberrationen växer med warpen — det är den som gör att strecken "drar isär".
    if (aberration.current) aberration.current.offset.set(0.0006 + warp.current * 0.012, 0.0004 + warp.current * 0.008);
  });
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={1.35} luminanceThreshold={0.22} luminanceSmoothing={0.85} mipmapBlur />
      <ChromaticAberration ref={aberration as never} offset={new THREE.Vector2(0.0006, 0.0004)} radialModulation modulationOffset={0.3} />
      <Noise opacity={0.06} />
      <Vignette eskil={false} offset={0.2} darkness={0.9} />
    </EffectComposer>
  );
}

export function CosmosCanvas({
  summary,
  progress,
  velocity,
  onContextLost,
  onReady,
}: {
  summary: FinaleSummary;
  progress: { current: number };
  velocity: { current: number };
  onContextLost?: () => void;
  onReady?: (api: { gl: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.Camera }) => void;
}) {
  const cosmos = useMemo(
    () => buildCosmos(
      summary.standings.map((s) => ({ id: s.id, name: s.name, totalWins: s.totalWins, rank: s.rank })),
      summary.transfers,
      summary.defences,
    ),
    [summary],
  );
  const warp = useRef(0);

  return (
    <Canvas
      dpr={[1, 1.25]}
      camera={{ position: [60, 20, 70], fov: 50, near: 0.1, far: 900 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={(state) => {
        onReady?.({ gl: state.gl, scene: state.scene, camera: state.camera });
        state.gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onContextLost?.(); });
      }}
    >
      <color attach='background' args={['#030208']} />
      <ambientLight intensity={0.18} />
      <Nebula />
      <Starfield warp={warp} velocity={velocity} />
      <Sun />
      <Galaxy cosmos={cosmos} progressRef={progress} />
      <Rig cosmos={cosmos} progress={progress} velocity={velocity} warp={warp} />
      <Effects warp={warp} />
    </Canvas>
  );
}
