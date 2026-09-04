'use client';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Nebulosa som bakgrund: en inverterad sfär runt hela scenen med ett FBM-brus i
 * guld, lila och djupblått som driver långsamt. Ritas utan djupskrivning så allt
 * annat ligger framför, och toneMapped=false så bloomen får bita i de ljusa stråken.
 */

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;

  // Klassiskt hash/value-brus + fbm. Billigt nog för en fullskärmsbakgrund.
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.02 + vec3(1.7, 9.2, 4.1);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 d = vDir;
    float t = uTime * 0.02;
    float n1 = fbm(d * 2.5 + vec3(t, 0.0, -t));
    float n2 = fbm(d * 5.0 - vec3(0.0, t * 1.3, 0.0));
    float veil = smoothstep(0.35, 0.75, n1);      // breda moln
    float wisps = smoothstep(0.55, 0.9, n2);      // tunna stråk

    vec3 deep = vec3(0.012, 0.010, 0.030);        // nästan svart, blåsvart
    vec3 violet = vec3(0.24, 0.10, 0.42);
    vec3 gold = vec3(0.86, 0.66, 0.26);
    vec3 blue = vec3(0.14, 0.32, 0.72);

    vec3 c = deep;
    c = mix(c, violet, veil * 0.55);
    c = mix(c, blue, wisps * 0.35 * (0.5 + 0.5 * d.y));
    c = mix(c, gold, wisps * veil * 0.7);
    // Ljusare mot "galaxens ekvator" så det finns en riktning i rymden.
    c += gold * 0.12 * pow(1.0 - abs(d.y), 6.0);
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function Nebula() {
  const material = useRef<THREE.ShaderMaterial>(null);
  useFrame((state) => {
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh scale={[400, 400, 400]} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 24]} />
      <shaderMaterial
        ref={material}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={{ uTime: { value: 0 } }}
        side={THREE.BackSide}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
