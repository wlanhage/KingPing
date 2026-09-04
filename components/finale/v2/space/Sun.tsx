'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Tronen som sol: en glödande kärna, en additiv korona-sprite och ett punktljus
 * som färgar planeterna. Koronatexturen ritas på en canvas vid mount i stället
 * för att laddas — inga assets, ingen väntan.
 */

const GOLD = '#ffd27a';

function coronaTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255, 240, 200, 1)');
  g.addColorStop(0.18, 'rgba(255, 210, 122, 0.85)');
  g.addColorStop(0.45, 'rgba(255, 170, 60, 0.25)');
  g.addColorStop(1, 'rgba(255, 140, 40, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Sun() {
  const corona = useRef<THREE.Sprite>(null);
  const core = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => coronaTexture(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Solen andas: koronan pulserar sakta, kärnan roterar.
    if (corona.current) corona.current.scale.setScalar(9 + Math.sin(t * 0.8) * 0.6);
    if (core.current) core.current.rotation.y = t * 0.05;
  });

  return (
    <group>
      <mesh ref={core}>
        <sphereGeometry args={[1.6, 48, 48]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={3.2} roughness={1} toneMapped={false} />
      </mesh>
      <sprite ref={corona} scale={9}>
        <spriteMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight color={GOLD} intensity={40} distance={60} decay={1.6} />
    </group>
  );
}
