'use client';
import { useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { CameraPose } from './types';

/*
 * 90-talets bowlinghall som tredimensionell rigg: glansig bana längs -z, rutigt golv,
 * gradienthimmel, tre lampor och VHS-brus ovanpå. Klippen ritar sin rekvisita inuti.
 * Cosmic bowling = fredagsläget: mörkt, UV-lila, allt självlysande.
 */

function gradientTexture(top: string, mid: string, bottom: string) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top); grad.addColorStop(0.55, mid); grad.addColorStop(1, bottom);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function checkerTexture(a: string, b: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = a; g.fillRect(0, 0, 64, 64);
  g.fillStyle = b; g.fillRect(0, 0, 32, 32); g.fillRect(32, 32, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Hall({ cosmic }: { cosmic: boolean }) {
  const sky = useMemo(() => (cosmic ? gradientTexture('#05001a', '#2a0a5e', '#0a0020') : gradientTexture('#1c5fb8', '#8a3fc4', '#ff7a3d')), [cosmic]);
  const checker = useMemo(() => (cosmic ? checkerTexture('#12082a', '#1e0f44') : checkerTexture('#1b1330', '#2c1f52')), [cosmic]);
  const lane = cosmic ? '#2a1552' : '#d9a86a';
  return (
    <group>
      <mesh scale={[-1, 1, 1]}><sphereGeometry args={[80, 32, 16]} /><meshBasicMaterial map={sky} side={THREE.BackSide} toneMapped={false} /></mesh>
      {/* golvet runt banan */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -10]}><planeGeometry args={[80, 80]} /><meshStandardMaterial map={checker} roughness={0.35} metalness={0.05} /></mesh>
      {/* banan: blank och lite upphöjd, med rännor på sidorna */}
      <mesh position={[0, 0.02, -9]}><boxGeometry args={[3.2, 0.06, 26]} /><meshStandardMaterial color={lane} roughness={0.12} metalness={0.15} emissive={cosmic ? '#3a1a7a' : '#000'} emissiveIntensity={cosmic ? 0.5 : 0} /></mesh>
      {[-1.85, 1.85].map((x) => (
        <mesh key={x} position={[x, 0.02, -9]}><boxGeometry args={[0.5, 0.06, 26]} /><meshStandardMaterial color={cosmic ? '#0b0620' : '#3b2a44'} roughness={0.5} /></mesh>
      ))}
      {/* banans slut: käglornas gryta */}
      <mesh position={[0, 0.9, -20.4]}><boxGeometry args={[6, 1.8, 0.6]} /><meshStandardMaterial color={cosmic ? '#160a33' : '#2b1a3f'} roughness={0.7} emissive={cosmic ? '#ff2bd6' : '#000'} emissiveIntensity={cosmic ? 0.25 : 0} /></mesh>
      {/* neonlister längs banan i cosmic-läge */}
      {cosmic && [-1.62, 1.62].map((x) => (
        <mesh key={x} position={[x, 0.08, -9]}><boxGeometry args={[0.05, 0.05, 26]} /><meshBasicMaterial color={x < 0 ? '#2bf0ff' : '#ff2bd6'} toneMapped={false} /></mesh>
      ))}
    </group>
  );
}

function Lights({ cosmic }: { cosmic: boolean }) {
  return cosmic ? (
    <>
      <ambientLight intensity={0.25} color='#6a3bff' />
      <spotLight position={[0, 9, -4]} angle={0.7} penumbra={0.6} intensity={120} color='#b46bff' />
      <pointLight position={[0, 4, -16]} intensity={60} color='#2bf0ff' distance={16} />
    </>
  ) : (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#ffe9c4', '#3a2a5a', 0.7]} />
      <directionalLight position={[6, 10, 4]} intensity={2.2} />
      <spotLight position={[0, 8, -14]} angle={0.6} penumbra={0.5} intensity={90} color='#ffd9a0' />
    </>
  );
}

function CameraRig({ poseRef }: { poseRef: React.MutableRefObject<CameraPose> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const look = useRef(new THREE.Vector3(0, 1, -12));
  const jitter = useRef(0);
  useFrame((_, delta) => {
    const p = poseRef.current;
    const k = Math.min(1, delta * 7);
    camera.position.lerp(new THREE.Vector3(...p.position), k);
    look.current.lerp(new THREE.Vector3(...p.lookAt), k);
    const shake = p.shake ?? 0;
    jitter.current += delta * 60;
    const j = shake ? new THREE.Vector3(Math.sin(jitter.current * 1.3) * shake, Math.cos(jitter.current * 1.7) * shake, 0) : new THREE.Vector3();
    camera.lookAt(look.current.clone().add(j));
    const fov = p.fov ?? 48;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix(); }
  });
  return null;
}

function Effects({ cosmic }: { cosmic: boolean }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={cosmic ? 1.6 : 0.85} luminanceThreshold={cosmic ? 0.25 : 0.55} luminanceSmoothing={0.6} mipmapBlur />
      <ChromaticAberration offset={new THREE.Vector2(0.0012, 0.0008)} radialModulation modulationOffset={0.4} />
      <Noise opacity={0.09} />
      <Vignette eskil={false} offset={0.25} darkness={0.85} />
    </EffectComposer>
  );
}

export function LaneCanvas({ cosmic, poseRef, children, onContextLost }: { cosmic: boolean; poseRef: React.MutableRefObject<CameraPose>; children: ReactNode; onContextLost?: () => void }) {
  return (
    <Canvas
      className='lane-canvas'
      dpr={[1, 1.5]}
      camera={{ position: [0, 3, 7], fov: 48, near: 0.1, far: 200 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={(state) => { state.gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onContextLost?.(); }); }}
    >
      <fog attach='fog' args={[cosmic ? '#0a0020' : '#3a1f6a', 22, 60]} />
      <Lights cosmic={cosmic} />
      <Hall cosmic={cosmic} />
      <CameraRig poseRef={poseRef} />
      {children}
      <Effects cosmic={cosmic} />
    </Canvas>
  );
}
