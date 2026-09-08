'use client';
import { useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { CameraPose } from './types';

/** Scenen: bara canvas, kamera och efterbehandling. Miljön (tempel, kantina …) ritar varje scen själv. */

function CameraRig({ poseRef }: { poseRef: React.MutableRefObject<CameraPose> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const look = useRef(new THREE.Vector3(0, 1, -6));
  const jitter = useRef(0);
  useFrame((_, delta) => {
    const p = poseRef.current;
    const target = new THREE.Vector3(...p.position);
    const lookTarget = new THREE.Vector3(...p.lookAt);
    if (p.snap) { camera.position.copy(target); look.current.copy(lookTarget); }
    else { const k = Math.min(1, delta * 6); camera.position.lerp(target, k); look.current.lerp(lookTarget, k); }
    const shake = p.shake ?? 0;
    jitter.current += delta * 60;
    const j = shake ? new THREE.Vector3(Math.sin(jitter.current * 1.3) * shake, Math.cos(jitter.current * 1.7) * shake, 0) : new THREE.Vector3();
    camera.lookAt(look.current.clone().add(j));
    const fov = p.fov ?? 40;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = p.snap ? fov : camera.fov + (fov - camera.fov) * Math.min(1, delta * 8); camera.updateProjectionMatrix(); }
  });
  return null;
}

function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={1.1} luminanceThreshold={0.6} luminanceSmoothing={0.4} mipmapBlur />
      <ChromaticAberration offset={new THREE.Vector2(0.0008, 0.0005)} radialModulation modulationOffset={0.5} />
      <Noise opacity={0.05} />
      <Vignette eskil={false} offset={0.2} darkness={0.9} />
    </EffectComposer>
  );
}

export function StageCanvas({ poseRef, children, onContextLost }: { poseRef: React.MutableRefObject<CameraPose>; children: ReactNode; onContextLost?: () => void }) {
  return (
    <Canvas
      className='stage-canvas'
      dpr={[1, 1.5]}
      camera={{ position: [0.8, 1.4, -1.5], fov: 40, near: 0.05, far: 120 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={(state) => { state.gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onContextLost?.(); }); }}
    >
      <color attach='background' args={['#03030a']} />
      <CameraRig poseRef={poseRef} />
      {children}
      <Effects />
    </Canvas>
  );
}
