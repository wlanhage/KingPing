'use client';
import { MeshReflectorMaterial, Sparkles } from '@react-three/drei';
import { Crown, Racket, lerp3 } from '../props';
import { ballistic, decay, ease, kf, span } from '../anim';
import type { Scene, Vec3 } from '../types';

/*
 * TANTIVE IV. En vanlig kröning: dörren sprängs, rebellerna ligger, Vader kliver in genom röken.
 *   0.0–3.2  Korridoren, lågt. Dörren sprängs. En siluett i röken som går in.
 *   3.2–5.4  Från sidan: de fallna, den störtade med kronan bredvid sig. Vinnaren stannar över honom.
 *   5.4–7.8  Nära: "Var är kronan?" — "Vi… har ingen krona." Den störtade lyfts från golvet.
 *   7.8–9.4  Slängs åt sidan. Kronan stiger från golvet till vinnarens huvud.
 */

const DOOR_Z = -14;
const DEPOSED: Vec3 = [0.8, 0.36, -5.2];
const CROWN_FLOOR: Vec3 = [1.6, 0.14, -4.9];
const STAND: Vec3 = [0, 0, -6.4];
const BLAST = 0.6;
const CHOKE = 6.6, FLING = 7.9;

function Corridor({ blast }: { blast: number }) {
  const frames = [-1, -4, -7, -10, -13];
  const flash = Math.max(0, 1 - blast / 0.35);
  return (
    <group>
      <fog attach='fog' args={['#cfd5de', 10, 34]} />
      <ambientLight intensity={0.55} color='#e8eefc' />
      <hemisphereLight args={['#ffffff', '#5a6a88', 0.6]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -7]}>
        <planeGeometry args={[6, 26]} />
        <MeshReflectorMaterial blur={[300, 100]} resolution={512} mixBlur={1} mixStrength={0.8} roughness={0.75} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color='#4a5670' metalness={0.2} mirror={0} />
      </mesh>
      {[-2.6, 2.6].map((x) => <mesh key={x} position={[x, 1.8, -7]}><boxGeometry args={[0.6, 3.6, 26]} /><meshStandardMaterial color='#dfe3ea' roughness={0.6} /></mesh>)}
      <mesh position={[0, 3.6, -7]}><boxGeometry args={[6, 0.4, 26]} /><meshStandardMaterial color='#c7cdd8' roughness={0.7} /></mesh>
      {frames.map((z) => (
        <group key={z} position={[0, 0, z]}>
          {[-2.15, 2.15].map((x) => <mesh key={x} position={[x, 1.7, 0]}><boxGeometry args={[0.3, 3.4, 0.5]} /><meshStandardMaterial color='#b3bac8' roughness={0.6} /></mesh>)}
          <mesh position={[0, 3.25, 0]}><boxGeometry args={[4.6, 0.3, 0.5]} /><meshStandardMaterial color='#b3bac8' roughness={0.6} /></mesh>
          <mesh position={[0, 3.35, 0]}><boxGeometry args={[2.6, 0.04, 0.3]} /><meshBasicMaterial color='#f3f6ff' toneMapped={false} /></mesh>
          <pointLight position={[0, 3.0, 0]} intensity={18} color='#f3f6ff' distance={9} decay={2} />
        </group>
      ))}
      {/* den sprängda dörren: svart öppning, glöd och rök bakom */}
      <mesh position={[0, 1.7, DOOR_Z - 0.2]}><boxGeometry args={[4.4, 3.4, 0.3]} /><meshStandardMaterial color='#0a0c12' roughness={1} /></mesh>
      <pointLight position={[0, 1.4, DOOR_Z + 1]} intensity={blast > 0 ? 60 + flash * 500 : 0} color='#ffb070' distance={16} decay={2} />
      {flash > 0 && <mesh position={[0, 1.6, DOOR_Z + 0.4]}><sphereGeometry args={[1.2 + (1 - flash) * 2.5, 16, 16]} /><meshBasicMaterial color='#fff2d0' transparent opacity={flash} toneMapped={false} /></mesh>}
      {blast > 0 && <Sparkles count={220} scale={[5, 3.4, 6]} position={[0, 1.7, DOOR_Z + 2.5]} size={14} speed={0.35} opacity={Math.min(0.6, blast * 0.5)} color='#c9ced8' />}
      {blast > 0 && blast < 3 && <Sparkles count={60} scale={[3, 2, 2]} position={[0, 1.2, DOOR_Z + 1]} size={3} speed={3} opacity={0.9} color='#ffcf70' />}
    </group>
  );
}

export const tantive: Scene = {
  key: 'tantive', duration: 11.0,
  words: (ctx) => [
    { at: 5.7, until: 7.0, text: 'Var är kronan? Vad har ni gjort med den?', style: 'subtitle' },
    { at: 7.1, until: 8.2, text: 'Vi… har ingen krona. Det här är ett diplomatiskt uppdrag.', style: 'subtitle' },
    { at: 9.9, text: `${ctx.crowningWord.toUpperCase()}!`, size: 2.2, color: '#c9d8ff' },
    { at: 10.5, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: BLAST, cue: 'boom' }, { at: 2.0, cue: 'breath' }, { at: 4.0, cue: 'breath' }, { at: 6.0, cue: 'breath' }, { at: FLING, cue: 'slam' }, { at: 9.9, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.5), span(t, 9.4, 9.9) * 0.94),
  camera: (t) => {
    if (t < 3.2) {
      const p = ease(span(t, 0, 3.2), 'inOut');
      return { position: lerp3([0.3, 0.8, 1.4], [0.2, 0.9, 0.2], p), lookAt: [0, 1.3, DOOR_Z], fov: 36, snap: true, shake: decay(t - BLAST, 0.05, 0.6) };
    }
    if (t < 5.4) {
      const p = ease(span(t, 3.2, 5.4), 'inOut');
      return { position: lerp3([2.8, 0.9, -5.2], [2.4, 0.9, -5.6], p), lookAt: [-0.3, 0.9, -7.2], fov: 38, snap: true };
    }
    if (t < FLING) return { position: [1.1, 0.5, -4.2], lookAt: [0.1, 1.2, -6.3], fov: 34, snap: true };
    return { position: [2.5, 1.7, -2.4], lookAt: [0.3, 0.9, -6.2], fov: 42, snap: true, shake: decay(t - FLING, 0.03, 0.4) };
  },
  Scene: ({ t }) => {
    const blast = Math.max(0, t - BLAST);
    const walk = ease(span(t, 1.8, 4.6), 'inOut');
    const vader: Vec3 = lerp3([0, 0, DOOR_Z + 0.6], STAND, walk);
    const walking = t > 1.8 && t < 4.6;
    const turn = ease(span(t, 5.6, 6.4), 'inOut') * Math.atan2(DEPOSED[0] - STAND[0], DEPOSED[2] - STAND[2]);
    // strypgreppet: den störtade lyfts, kippar, slängs in i väggen
    const lift = span(t, CHOKE, 7.6);
    const flung = Math.max(0, t - FLING);
    const flungFall = ballistic(flung, 1.4, 2.5, 16, 0.36, 0.3, 2);
    const deposedPos: Vec3 = flung > 0 ? [DEPOSED[0] + Math.min(flung, 0.6) * 3.2, flungFall.y, DEPOSED[2] - Math.min(flung, 0.6) * 2.5] : [DEPOSED[0], DEPOSED[1] + lift * 1.1 + (lift > 0 ? Math.sin(t * 30) * 0.03 : 0), DEPOSED[2]];
    const deposedRot: Vec3 = flung > 0 ? [-Math.PI / 2 + 0.3, 0, 0.6 + flung * 3] : [-Math.PI / 2 * (1 - lift), 0.6 * (1 - lift), lift > 0 ? Math.sin(t * 40) * 0.05 : 0];
    // kronan stiger från golvet till vinnarens huvud
    const rise = span(t, 8.3, 9.1);
    const crownPos: Vec3 = [CROWN_FLOOR[0] + (vader[0] - CROWN_FLOOR[0]) * rise, CROWN_FLOOR[1] + (1.78 - CROWN_FLOOR[1]) * rise + Math.sin(rise * Math.PI) * 0.6, CROWN_FLOOR[2] + (vader[2] - CROWN_FLOOR[2]) * rise];
    return (
      <>
        <Corridor blast={blast} />
        {/* fallna rebeller i korridoren */}
        <Racket position={[-1.3, 0.36, -8.4]} rotation={[-Math.PI / 2 + 0.2, 0, -0.4]} color='#e6e8ee' mood='sad' scale={0.9} />
        <Racket position={[-0.6, 0.36, -3.4]} rotation={[-Math.PI / 2 + 0.25, 0, 0.9]} color='#d8dde8' mood='sad' scale={0.9} />
        <Racket position={[1.7, 0.36, -9.8]} rotation={[-Math.PI / 2 + 0.15, 0, -1.2]} color='#e6e8ee' mood='sad' scale={0.9} />
        {/* den störtade, med kronan bredvid sig */}
        <Racket position={deposedPos} rotation={deposedRot} color='#cfd6e6' mood={lift > 0 ? 'shock' : 'sad'} scale={0.95} />
        {rise < 1 && <Crown position={crownPos} rotation={[rise * 4, rise * 6, (1 - rise) * 1.3]} scale={0.8} />}
        {/* vinnaren: in genom röken, tunga steg, vänd mot den störtade */}
        {t > 1.6 && <Racket position={[vader[0], walking ? Math.abs(Math.sin(t * 7)) * 0.05 : 0, vader[2]]} rotation={[0, turn, walking ? Math.sin(t * 7) * 0.03 : 0]} color='#111116' helmet arm={kf(t, [[CHOKE - 0.2, 0], [CHOKE + 0.3, 0.8, 'out'], [FLING, 0.8], [FLING + 0.4, 0, 'in']])} crown={rise >= 1} />}
      </>
    );
  },
};
