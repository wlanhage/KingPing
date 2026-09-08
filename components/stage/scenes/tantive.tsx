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
// Han går längs mitten; de fallna ligger vid väggarna så han aldrig kliver igenom någon.
// Den störtade ligger nästan fyra enheter från honom: lyftet ska se ut som kraften, inte som en hand.
const DEPOSED: Vec3 = [1.2, 0.36, -3.6];
const CROWN_FLOOR: Vec3 = [2.0, 0.14, -3.2];
const STAND: Vec3 = [0, 0, -7.2];
/** Där han slår i väggen efter kastet. */
const WALL_HIT: Vec3 = [2.05, 2.0, -1.6];
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
  key: 'tantive', duration: 13.2,
  words: (ctx) => [
    { at: 5.7, until: 7.0, text: 'Var är kronan? Vad har ni gjort med den?', style: 'subtitle' },
    { at: 7.1, until: 8.2, text: 'Vi… har ingen krona. Det här är ett diplomatiskt uppdrag.', style: 'subtitle' },
    { at: 12.1, text: `${ctx.crowningWord.toUpperCase()}!`, size: 2.2, color: '#c9d8ff' },
    { at: 12.7, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
  ],
  cues: [{ at: BLAST, cue: 'boom' }, { at: 2.0, cue: 'breath' }, { at: 4.0, cue: 'breath' }, { at: 6.0, cue: 'breath' }, { at: FLING + 0.22, cue: 'slam' }, { at: 9.1, cue: 'slam' }, { at: 10.4, cue: 'breath' }, { at: 12.1, cue: 'slam' }],
  fade: (t) => Math.max(1 - span(t, 0, 0.5), span(t, 11.6, 12.1) * 0.94),
  camera: (t) => {
    if (t < 3.2) {
      const p = ease(span(t, 0, 3.2), 'inOut');
      return { position: lerp3([0.3, 0.8, 1.4], [0.2, 0.9, 0.2], p), lookAt: [0, 1.3, DOOR_Z], fov: 36, snap: true, shake: decay(t - BLAST, 0.05, 0.6) };
    }
    if (t < 5.4) {
      const p = ease(span(t, 3.2, 5.4), 'inOut');
      // korridoren är 4,6 bred: alla kameror håller sig innanför ±2,1
      return { position: lerp3([2.0, 0.9, -3.4], [1.8, 0.9, -3.9], p), lookAt: [-0.4, 0.9, -7.8], fov: 42, snap: true };
    }
    // lyftet och kastet: utzoomat från sidan så avståndet mellan handen och den svävande syns
    if (t < FLING) return { position: [-1.9, 1.2, -1.6], lookAt: [0.7, 1.3, -5.6], fov: 50, snap: true };
    if (t < 9.0) return { position: [-1.8, 1.6, -0.4], lookAt: [1.0, 1.2, -4.8], fov: 54, snap: true, shake: decay(t - FLING - 0.22, 0.05, 0.5) };
    // kronan sätter sig: sakta inzoomning på honom, och bilden hålls kvar
    const p = ease(span(t, 9.0, 11.6), 'inOut');
    return { position: lerp3([-1.2, 1.5, -3.4], [-0.5, 1.7, -5.0], p), lookAt: [0, 1.7, STAND[2]], fov: 40 - p * 10, snap: true };
  },
  Scene: ({ t }) => {
    const blast = Math.max(0, t - BLAST);
    const walk = ease(span(t, 1.8, 4.6), 'inOut');
    const vader: Vec3 = lerp3([0, 0, DOOR_Z + 0.6], STAND, walk);
    const walking = t > 1.8 && t < 4.6;
    const turn = ease(span(t, 5.6, 6.4), 'inOut') * Math.atan2(DEPOSED[0] - STAND[0], DEPOSED[2] - STAND[2]);
    // kraftgreppet: den störtade lyfts högt och svävar sprattlande på avstånd, slungas sedan i väggen och faller
    const lift = ease(span(t, CHOKE, 7.4), 'out');
    const hover: Vec3 = [DEPOSED[0], DEPOSED[1] + lift * 1.9 + (lift > 0 ? Math.sin(t * 28) * 0.05 : 0), DEPOSED[2]];
    const flung = Math.max(0, t - FLING);
    const throwP = Math.min(1, flung / 0.22);
    const afterWall = Math.max(0, flung - 0.22);
    const wallFall = ballistic(afterWall, WALL_HIT[1], 1.0, 18, 0.36, 0.3, 2);
    const deposedPos: Vec3 = flung > 0 ? (throwP < 1 ? lerp3(hover, WALL_HIT, throwP) : [WALL_HIT[0] - Math.min(afterWall, 0.5) * 0.6, wallFall.y, WALL_HIT[2] - Math.min(afterWall, 0.5) * 0.8]) : hover;
    const deposedRot: Vec3 = flung > 0 ? [-Math.PI / 2 + 0.3, 0, 0.6 + flung * 14] : [-Math.PI / 2 * (1 - lift), 0.6 * (1 - lift), lift > 0 ? Math.sin(t * 40) * 0.08 : 0];
    // kronan stiger från golvet till vinnarens huvud
    const rise = ease(span(t, 8.3, 9.1), 'inOut');
    const crownPos: Vec3 = [CROWN_FLOOR[0] + (vader[0] - CROWN_FLOOR[0]) * rise, CROWN_FLOOR[1] + (2.12 - CROWN_FLOOR[1]) * rise + Math.sin(rise * Math.PI) * 0.6, CROWN_FLOOR[2] + (vader[2] - 0.05 - CROWN_FLOOR[2]) * rise];
    return (
      <>
        <Corridor blast={blast} />
        {/* fallna rebeller i korridoren */}
        <Racket position={[-2.0, 0.36, -8.6]} rotation={[-Math.PI / 2 + 0.2, 0, -0.4]} color='#e6e8ee' mood='sad' scale={0.85} />
        <Racket position={[-1.9, 0.36, -3.2]} rotation={[-Math.PI / 2 + 0.25, 0, 0.9]} color='#d8dde8' mood='sad' scale={0.85} />
        <Racket position={[1.9, 0.36, -10.0]} rotation={[-Math.PI / 2 + 0.15, 0, -1.2]} color='#e6e8ee' mood='sad' scale={0.85} />
        {/* den störtade, med kronan bredvid sig */}
        <Racket position={deposedPos} rotation={deposedRot} color='#cfd6e6' mood={lift > 0 ? 'shock' : 'sad'} scale={0.95} />
        {rise < 1 && <Crown position={crownPos} rotation={[rise * 4, rise * 6, (1 - rise) * 1.3]} scale={0.8} />}
        {/* vinnaren: in genom röken, tunga steg, vänd mot den störtade */}
        {t > 1.6 && <Racket position={[vader[0], walking ? Math.abs(Math.sin(t * 7)) * 0.05 : 0, vader[2]]} rotation={[0, turn, walking ? Math.sin(t * 7) * 0.03 : 0]} color='#b3202a' helmet arm={kf(t, [[CHOKE - 0.2, 0], [CHOKE + 0.3, 1.1, 'out'], [FLING, 1.1], [FLING + 0.15, 1.4, 'out'], [FLING + 0.6, 0, 'in']])} crown={rise >= 1} />}
      </>
    );
  },
};
