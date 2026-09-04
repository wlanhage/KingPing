'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Mäktig 3D-titel.
 *
 * Extruderingen är gjord med staplade SDF-textlager i djupled i stället för
 * TextGeometry: `Text3D` kräver ett typeface-JSON per typsnitt, medan troika-texten
 * fungerar direkt med vilket typsnitt som helst och skalar utan kantighet. Med bloom
 * ovanpå läser stapeln som massiv guldrelief — och den kostar en bråkdel av en riktig
 * extrudering.
 */

const GOLD_FACE = '#ffe9a8';
const GOLD_SIDE = '#8a6a1f';

export type TitleAnchor = 'center' | 'left' | 'right';

export function Title3D({
  children,
  position = [0, 0, 0],
  size = 3,
  layers = 14,
  depth = 0.06,
  color = GOLD_FACE,
  sideColor = GOLD_SIDE,
  opacity = 1,
  anchorX = 'center',
  maxWidth,
}: {
  children: string;
  position?: [number, number, number];
  size?: number;
  layers?: number;
  depth?: number;
  color?: string;
  sideColor?: string;
  opacity?: number;
  anchorX?: TitleAnchor;
  maxWidth?: number;
}) {
  // Baklagren först så framsidan ritas sist och hamnar överst.
  const stack = useMemo(() => Array.from({ length: layers }, (_, i) => layers - 1 - i), [layers]);

  return (
    <group position={position}>
      {stack.map((i) => {
        const isFace = i === 0;
        const t = i / Math.max(1, layers - 1);
        return (
          <Text
            key={i}
            position={[0, 0, -i * depth]}
            fontSize={size}
            color={isFace ? color : sideColor}
            anchorX={anchorX}
            anchorY='middle'
            maxWidth={maxWidth}
            letterSpacing={0.02}
            outlineWidth={0}
          >
            {children}
            <meshStandardMaterial
              attach='material'
              color={isFace ? color : sideColor}
              emissive={isFace ? color : sideColor}
              // Framsidan glöder; sidorna mörknar bakåt så reliefen får djup.
              emissiveIntensity={isFace ? 1.5 : 0.25 * (1 - t)}
              metalness={0.85}
              roughness={0.3}
              transparent={opacity < 1}
              opacity={opacity}
              toneMapped={false}
            />
          </Text>
        );
      })}
    </group>
  );
}

/**
 * Titel som kameran passerar igenom: den rusar mot betraktaren och tonar ut precis
 * när den sveper förbi, vilket ger känslan av att flyga in i texten.
 */
export function FlyThroughTitle({
  children,
  progressRef,
  start,
  end,
  size = 4,
  y = 0,
  fromZ = -40,
  toZ = 14,
}: {
  children: string;
  progressRef: { current: number };
  start: number;
  end: number;
  size?: number;
  y?: number;
  fromZ?: number;
  toZ?: number;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const raw = (progressRef.current - start) / Math.max(0.0001, end - start);
    const t = Math.min(1, Math.max(0, raw));
    const active = raw > -0.15 && raw < 1.15;
    group.current.visible = active;
    if (!active) return;
    group.current.position.z = fromZ + (toZ - fromZ) * t;
    group.current.position.y = y;
    // Tonar in snabbt, ut mot slutet när den sveper förbi kameran.
    const fade = Math.min(1, t / 0.15) * Math.min(1, (1 - t) / 0.25);
    group.current.scale.setScalar(0.85 + t * 0.35);
    group.current.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const mat = mesh.material as THREE.Material | undefined;
      if (mat && 'opacity' in mat) {
        (mat as THREE.MeshStandardMaterial).transparent = true;
        (mat as THREE.MeshStandardMaterial).opacity = fade;
      }
    });
  });

  return (
    <group ref={group} visible={false}>
      <Title3D size={size}>{children}</Title3D>
    </group>
  );
}
