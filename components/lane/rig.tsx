'use client';
import { useMemo, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import type { CameraPose } from './types';

/*
 * 90-talets bowlinghall: speglande bana längs -z, rutigt golv, gradienthimmel, neonvägg
 * bakom käglorna, studiobelysning som ger klarlacken sina reflexer, och VHS-brus ovanpå.
 * Cosmic bowling = fredagsläget: mörkt, UV-lila, allt självlysande.
 */

function gradientTexture(stops: [number, string][]) {
  const c = document.createElement('canvas');
  c.width = 4; c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  for (const [at, color] of stops) grad.addColorStop(at, color);
  g.fillStyle = grad; g.fillRect(0, 0, 4, 512);
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
  tex.repeat.set(30, 30);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Neonväggen bakom käglorna: ränder som rullar och ett skyltord som pulserar. */
function NeonWall({ cosmic }: { cosmic: boolean }) {
  const stripes = useRef<THREE.Group>(null);
  useFrame((s) => { if (stripes.current) stripes.current.position.x = (s.clock.elapsedTime * 0.6) % 1.2; });
  const a = cosmic ? '#ff2bd6' : '#ff5fa2';
  const b = cosmic ? '#2bf0ff' : '#ffd12b';
  return (
    <group position={[0, 0, -21.2]}>
      <mesh position={[0, 3.2, 0]}><planeGeometry args={[30, 7]} /><meshStandardMaterial color={cosmic ? '#0b0620' : '#1a0f33'} roughness={0.9} /></mesh>
      <group ref={stripes} position={[0, 4.6, 0.02]}>
        {Array.from({ length: 24 }, (_, i) => (
          <mesh key={i} position={[-14 + i * 1.2, 0, 0]} rotation={[0, 0, 0.5]}><planeGeometry args={[0.18, 2.6]} /><meshBasicMaterial color={i % 2 ? a : b} toneMapped={false} transparent opacity={0.75} /></mesh>
        ))}
      </group>
      <mesh position={[0, 4.6, 0.04]}><planeGeometry args={[30, 0.06]} /><meshBasicMaterial color={b} toneMapped={false} /></mesh>
      <mesh position={[0, 2.5, 0.04]}><planeGeometry args={[30, 0.06]} /><meshBasicMaterial color={a} toneMapped={false} /></mesh>
    </group>
  );
}

function Hall({ cosmic }: { cosmic: boolean }) {
  const sky = useMemo(() => (cosmic ? gradientTexture([[0, '#03000f'], [0.5, '#2a0a5e'], [1, '#0a0020']]) : gradientTexture([[0, '#0d2a6b'], [0.45, '#7b3fc4'], [0.75, '#ff6a3d'], [1, '#2a1030']])), [cosmic]);
  const checker = useMemo(() => (cosmic ? checkerTexture('#0e0722', '#1d1140') : checkerTexture('#1b1330', '#33245c')), [cosmic]);
  return (
    <group>
      <mesh scale={[-1, 1, 1]}><sphereGeometry args={[90, 32, 16]} /><meshBasicMaterial map={sky} side={THREE.BackSide} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -10]}><planeGeometry args={[90, 90]} /><meshStandardMaterial map={checker} roughness={0.4} metalness={0.05} /></mesh>
      {/* banan speglar käglor, boll och ljus — det är den som säljer 90-talsblänket */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -9]}>
        <planeGeometry args={[3.2, 26]} />
        <MeshReflectorMaterial blur={[260, 80]} resolution={512} mixBlur={0.9} mixStrength={cosmic ? 1.6 : 1.1} roughness={0.55} depthScale={0.9} minDepthThreshold={0.6} maxDepthThreshold={1.3} color={cosmic ? '#2a1552' : '#c8935a'} metalness={0.15} mirror={0} />
      </mesh>
      <mesh position={[0, 0.03, -9]}><boxGeometry args={[3.3, 0.06, 26]} /><meshStandardMaterial color={cosmic ? '#1a0d38' : '#8a5a34'} roughness={0.6} /></mesh>
      {[-1.85, 1.85].map((x) => (
        <mesh key={x} position={[x, 0.02, -9]}><boxGeometry args={[0.5, 0.06, 26]} /><meshStandardMaterial color={cosmic ? '#0b0620' : '#3b2a44'} roughness={0.5} /></mesh>
      ))}
      {[-1.62, 1.62].map((x) => (
        <mesh key={x} position={[x, 0.09, -9]}><boxGeometry args={[0.05, 0.05, 26]} /><meshBasicMaterial color={cosmic ? (x < 0 ? '#2bf0ff' : '#ff2bd6') : '#ffd784'} toneMapped={false} /></mesh>
      ))}
      <mesh position={[0, 0.9, -20.4]}><boxGeometry args={[6, 1.8, 0.6]} /><meshStandardMaterial color={cosmic ? '#160a33' : '#2b1a3f'} roughness={0.7} /></mesh>
      <NeonWall cosmic={cosmic} />
      {cosmic && <Sparkles count={140} scale={[16, 8, 30]} position={[0, 4, -8]} size={3} speed={0.4} color='#ffffff' />}
    </group>
  );
}

function Lights({ cosmic }: { cosmic: boolean }) {
  return (
    <>
      <Environment resolution={256} frames={1}>
        <Lightformer form='rect' intensity={cosmic ? 2 : 4} position={[0, 6, -6]} scale={[10, 3, 1]} color={cosmic ? '#b46bff' : '#fff2d6'} />
        <Lightformer form='rect' intensity={cosmic ? 3 : 2} position={[-6, 3, 2]} rotation={[0, Math.PI / 2, 0]} scale={[6, 4, 1]} color={cosmic ? '#2bf0ff' : '#ffd0a8'} />
        <Lightformer form='rect' intensity={cosmic ? 3 : 2} position={[6, 3, 2]} rotation={[0, -Math.PI / 2, 0]} scale={[6, 4, 1]} color={cosmic ? '#ff2bd6' : '#b8d8ff'} />
      </Environment>
      {cosmic ? (
        <>
          <ambientLight intensity={0.2} color='#6a3bff' />
          <spotLight position={[0, 9, -4]} angle={0.7} penumbra={0.6} intensity={140} color='#b46bff' />
          <pointLight position={[0, 4, -16]} intensity={70} color='#2bf0ff' distance={16} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.35} />
          <directionalLight position={[6, 10, 4]} intensity={2.4} />
          <spotLight position={[0, 8, -14]} angle={0.6} penumbra={0.5} intensity={120} color='#ffd9a0' />
          <pointLight position={[-4, 3, 0]} intensity={30} color='#ff8fc8' distance={14} />
          <pointLight position={[4, 3, -6]} intensity={30} color='#7fd0ff' distance={14} />
        </>
      )}
    </>
  );
}

function CameraRig({ poseRef }: { poseRef: React.MutableRefObject<CameraPose> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const look = useRef(new THREE.Vector3(0, 1, -12));
  const jitter = useRef(0);
  useFrame((_, delta) => {
    const p = poseRef.current;
    const k = Math.min(1, delta * 8);
    camera.position.lerp(new THREE.Vector3(...p.position), k);
    look.current.lerp(new THREE.Vector3(...p.lookAt), k);
    const shake = p.shake ?? 0;
    jitter.current += delta * 60;
    const j = shake ? new THREE.Vector3(Math.sin(jitter.current * 1.3) * shake, Math.cos(jitter.current * 1.7) * shake, 0) : new THREE.Vector3();
    camera.lookAt(look.current.clone().add(j));
    const fov = p.fov ?? 48;
    if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, delta * 10); camera.updateProjectionMatrix(); }
  });
  return null;
}

function Effects({ cosmic }: { cosmic: boolean }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={cosmic ? 1.5 : 0.7} luminanceThreshold={cosmic ? 0.25 : 0.7} luminanceSmoothing={0.5} mipmapBlur />
      <ChromaticAberration offset={new THREE.Vector2(0.001, 0.0007)} radialModulation modulationOffset={0.45} />
      <Noise opacity={0.07} />
      <Vignette eskil={false} offset={0.22} darkness={0.8} />
    </EffectComposer>
  );
}

export function LaneCanvas({ cosmic, poseRef, children, onContextLost }: { cosmic: boolean; poseRef: React.MutableRefObject<CameraPose>; children: ReactNode; onContextLost?: () => void }) {
  return (
    <Canvas
      className='lane-canvas'
      dpr={[1, 1.5]}
      camera={{ position: [0, 3, 7], fov: 48, near: 0.1, far: 220 }}
      gl={{ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={(state) => { state.gl.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onContextLost?.(); }); }}
    >
      <fog attach='fog' args={[cosmic ? '#0a0020' : '#3a1f6a', 26, 70]} />
      <Lights cosmic={cosmic} />
      <Hall cosmic={cosmic} />
      <CameraRig poseRef={poseRef} />
      {children}
      <Effects cosmic={cosmic} />
    </Canvas>
  );
}
