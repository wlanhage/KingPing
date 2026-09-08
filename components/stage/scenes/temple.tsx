'use client';
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import { Racket, lerp3 } from '../props';
import { decay, ease, kf, span } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * TEMPLET, strax före Order 66.
 *   0.0–2.4  En racket står ensam i mörkret. Kameran kryper in bakom honom, låg.
 *   2.4–4.8  Klipp: hans blick. En klunga små racketar ser upp på honom med stora ögon.
 *   4.8–7.2  Klipp: tillbaka på honom, nära och underifrån. Ögonen skiftar. Sabeln tänds
 *            uppifrån och ner mot golvet; rött ljus kryper uppför pelarna.
 *   7.2–8.2  Klipp: ynglingarna i rött ljus. Hoppet byts mot chock.
 *   8.2–9.6  Klipp: bakom honom igen. Han går mot dem. Svart.
 */

const HIM: Vec3 = [0, 0, -4];
const IGNITE = 5.7;
const KIDS: { p: Vec3; c: string }[] = [
  { p: [2.2, 0, -8.6], c: '#3b7ddb' }, { p: [3.1, 0, -9.4], c: '#e08a2b' }, { p: [1.5, 0, -9.6], c: '#4caf50' },
  { p: [2.9, 0, -8.0], c: '#9b59b6' }, { p: [3.9, 0, -8.7], c: '#e05a8a' }, { p: [2.3, 0, -10.3], c: '#f1c40f' }, { p: [3.6, 0, -10.0], c: '#3b7ddb' },
];
const KID_CENTER: Vec3 = [2.8, 0, -9.2];
/** Riktning ett barn vänder ansiktet: rotation kring y så att +z pekar mot honom. */
const faceHim = (p: Vec3) => Math.atan2(HIM[0] - p[0], HIM[2] - p[2]);
const himFacesKids = Math.atan2(KID_CENTER[0] - HIM[0], KID_CENTER[2] - HIM[2]);

function Temple({ red }: { red: number }) {
  const columns = Array.from({ length: 7 }, (_, i) => -2 + i * -3.4);
  return (
    <group>
      <fog attach='fog' args={['#03030a', 9, 42]} />
      <ambientLight intensity={0.2} color='#6b7fe0' />
      {/* månljus genom ett högt fönster: kallt, brett nog att nå honom och golvet runt honom */}
      <spotLight position={[2.5, 11, -1]} angle={0.5} penumbra={0.8} intensity={220} color='#7d95ea' />
      {/* kantljus framför honom så kåpans siluett tecknas när kameran står bakom */}
      <spotLight position={[1.5, 5, -10]} angle={0.7} penumbra={1} intensity={90} color='#8fa8ff' />
      <pointLight position={[-3.5, 3, -7]} intensity={26} color='#4a5fc0' distance={16} />
      <pointLight position={[4, 2.5, -11]} intensity={22} color='#5a70d0' distance={14} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]}>
        <planeGeometry args={[40, 60]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={512} mixBlur={1} mixStrength={1.6} roughness={0.6} depthScale={1.1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color='#15152a' metalness={0.2} mirror={0} />
      </mesh>
      {columns.map((z) => [-4.6, 4.6].map((x) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <mesh position={[0, 5, 0]}><cylinderGeometry args={[0.55, 0.65, 10, 20]} /><meshStandardMaterial color='#232130' roughness={0.85} emissive='#ff2a2a' emissiveIntensity={red * 0.08} /></mesh>
          <mesh position={[0, 0.25, 0]}><boxGeometry args={[1.5, 0.5, 1.5]} /><meshStandardMaterial color='#2a2838' roughness={0.9} /></mesh>
        </group>
      )))}
      <mesh position={[0, 5, -24]}><boxGeometry args={[40, 10, 1]} /><meshStandardMaterial color='#0d0c16' roughness={1} /></mesh>
      <Sparkles count={220} scale={[14, 6, 26]} position={[0, 3, -8]} size={1.4} speed={0.12} opacity={0.35} color='#aab6ff' />
    </group>
  );
}

export const temple: Scene = {
  key: 'temple', duration: 10.6,
  words: (ctx) => [
    { at: 3.0, until: 5.0, text: `Mäster ${ctx.winner}… det är för många av dem. Vad ska vi göra?`, style: 'subtitle' },
    { at: 9.0, text: 'ORDER 66', size: 2.4, color: '#ff3b3b' },
    { at: 9.7, text: ctx.streak >= 2 ? `${ctx.winner} · ${ctx.streak} raka` : `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: IGNITE, cue: 'ignite' }, { at: 9.0, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.9), span(t, 8.9, 9.5) * 0.92),
  camera: (t) => {
    if (t < 2.4) {
      // bakom honom, lågt, sakta in
      const p = ease(span(t, 0, 2.4), 'out');
      return { position: lerp3([1.4, 0.7, -0.4], [0.9, 0.9, -1.6], p), lookAt: [0.1, 1.2, -5.5], fov: 38, snap: true };
    }
    if (t < 4.8) {
      // hans blick: ynglingarna underifrån, lätt dolly framåt
      const p = ease(span(t, 2.4, 4.8), 'inOut');
      return { position: lerp3([0.4, 1.35, -4.4], [1.2, 1.1, -5.6], p), lookAt: [KID_CENTER[0], 0.7, KID_CENTER[2]], fov: 34, snap: true };
    }
    if (t < 7.2) {
      // tillbaka på honom: halvnära, lätt underifrån, hela överkroppen och sabeln i bild
      const p = ease(span(t, 4.8, 7.2), 'inOut');
      return { position: lerp3([2.7, 0.75, -8.4], [2.2, 0.8, -7.6], p), lookAt: [0.1, 1.0, -4.2], fov: 36, snap: true, shake: decay(t - IGNITE, 0.012, 0.5) };
    }
    if (t < 8.2) {
      return { position: [0.5, 1.35, -4.6], lookAt: [KID_CENTER[0], 0.8, KID_CENTER[2]], fov: 34, snap: true };
    }
    const p = ease(span(t, 8.2, 9.6), 'in');
    return { position: lerp3([0.6, 0.9, -0.8], [1.4, 0.8, -3.2], p), lookAt: [KID_CENTER[0] * 0.6, 0.9, -9], fov: 40, snap: true };
  },
  Scene: ({ t }) => {
    const sith = span(t, 5.0, 5.6);
    // Bladet växer från fästet ner mot golvet; 1,05 lämnar spetsen strax ovanför stenen.
    const blade = kf(t, [[IGNITE, 0], [IGNITE + 0.38, 1.05, 'out']]);
    const flicker = blade > 0 ? 0.5 + 0.5 * Math.sin(t * 61) * Math.sin(t * 23) : 0;
    const walk = span(t, 8.3, 9.6);
    const himPos: Vec3 = lerp3(HIM, [1.2, 0, -6.2], ease(walk, 'in'));
    const step = walk > 0 ? Math.abs(Math.sin(walk * 22)) * 0.05 : 0;
    const red = span(t, IGNITE, IGNITE + 0.5);
    const scared = t >= 7.2;
    return (
      <>
        <Temple red={red} />
        <Racket position={[himPos[0], step, himPos[2]]} rotation={[0, himFacesKids, Math.sin(walk * 22) * 0.03]} color='#3a3745' hood mood='grim' eyes={sith > 0 ? '#ffb020' : '#111111'} eyeGlow={sith * 1.6} saber={blade} flicker={flicker} />
        {KIDS.map((k, i) => (
          <Racket key={i} position={k.p} rotation={[scared ? 0.05 : -0.28, faceHim(k.p) + (scared ? Math.sin(t * 9 + i) * 0.08 : Math.sin(t * 1.3 + i) * 0.04), 0]} scale={0.42} color={k.c} mood={scared ? 'shock' : 'hope'} />
        ))}
        {/* golvets rödsken från sabeln */}
        {blade > 0 && <pointLight position={[himPos[0] - 0.9, 0.2, himPos[2] + 0.2]} color='#ff2a2a' intensity={40 * red + flicker * 8} distance={12} decay={2} />}
      </>
    );
  },
};
