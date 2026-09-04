'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Två lager stjärnor.
 *
 * 1. Ett avlägset, statiskt fält (drei Stars) som ger djup.
 * 2. Ett nära "tunnelfält" parenterat till kameran: stjärnorna ligger i en cylinder
 *    framför linsen och strömmar bakåt med scrollhastigheten. Vid warp sträcks varje
 *    stjärna till ett streck i färdriktningen — klassisk hyperspace, men styrd av hur
 *    fort man faktiskt skrollar.
 *
 * Strecken är LineSegments: varje stjärna är två hörn, och shadern skjuter det ena
 * hörnet bakåt i Z proportionellt mot uWarp. Ingen geometri byggs om per frame.
 */

type Refs = { warp: { current: number }; velocity: { current: number } };

const COUNT = 1000;
const TUNNEL = { radius: 26, length: 90 } as const;

const vertex = /* glsl */ `
  attribute float aTail;
  attribute float aSeed;
  uniform float uWarp;
  uniform float uScroll;
  varying float vTail;
  varying float vSeed;
  void main() {
    vTail = aTail;
    vSeed = aSeed;
    vec3 p = position;
    // Strömma bakåt (mot +Z, dvs mot kameran) och slå runt i tunneln.
    float z = mod(p.z + uScroll * (0.6 + aSeed * 0.8), ${TUNNEL.length.toFixed(1)}) - ${TUNNEL.length.toFixed(1)};
    p.z = z;
    // Svansen dras ut i färdriktningen efter warp-graden.
    p.z += aTail * uWarp * (6.0 + aSeed * 10.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uWarp;
  varying float vTail;
  varying float vSeed;
  void main() {
    // Huvudet är ljust, svansen tonar ut — och hela strecket lyser starkare i warp.
    float a = (1.0 - vTail * 0.9) * (0.35 + uWarp * 0.65);
    vec3 warm = vec3(1.0, 0.93, 0.78);
    vec3 cool = vec3(0.75, 0.85, 1.0);
    vec3 c = mix(cool, warm, vSeed);
    gl_FragColor = vec4(c, a);
  }
`;

export function Starfield({ warp, velocity }: Refs) {
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  const scroll = useRef(0);

  const geometry = useMemo(() => {
    const pos = new Float32Array(COUNT * 2 * 3);
    const tail = new Float32Array(COUNT * 2);
    const seed = new Float32Array(COUNT * 2);
    for (let i = 0; i < COUNT; i++) {
      // Deterministisk fördelning så scenen är reproducerbar mellan körningar.
      const a = i * 2.399963;
      const r = TUNNEL.radius * (0.15 + ((i * 7919) % 1000) / 1000 * 0.85);
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      const z = -((i * 104729) % 1000) / 1000 * TUNNEL.length;
      const s = ((i * 31337) % 1000) / 1000;
      for (let k = 0; k < 2; k++) {
        const j = (i * 2 + k) * 3;
        pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
        tail[i * 2 + k] = k;
        seed[i * 2 + k] = s;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aTail', new THREE.BufferAttribute(tail, 1));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    return g;
  }, []);

  useFrame((state, dt) => {
    if (!group.current || !material.current) return;
    // Tunneln följer kameran exakt, så den fungerar oavsett var kameran är.
    group.current.position.copy(state.camera.position);
    group.current.quaternion.copy(state.camera.quaternion);
    // Grundström + scrollhastighet. Hastigheten kommer i px/s; dämpas till lagom fart.
    scroll.current += dt * (1.5 + Math.min(40, Math.abs(velocity.current) * 0.02) + warp.current * 60);
    material.current.uniforms.uScroll.value = scroll.current;
    material.current.uniforms.uWarp.value = warp.current;
  });

  return (
    <>
      <Stars radius={220} depth={80} count={3000} factor={4} saturation={0.15} fade speed={0.3} />
      <group ref={group}>
        <lineSegments geometry={geometry} frustumCulled={false}>
          <shaderMaterial
            ref={material}
            vertexShader={vertex}
            fragmentShader={fragment}
            uniforms={{ uWarp: { value: 0 }, uScroll: { value: 0 } }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>
    </>
  );
}
