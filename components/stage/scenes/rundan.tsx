'use client';
import { Billboard, MeshReflectorMaterial, Text } from '@react-three/drei';
import { Crown, Ewok, Racket, lerp3 } from '../props';
import { ease, rng, span } from '../anim';
import { Coruscant } from './senate';
import { BALL_R, BENCH_Z, cheer, ordinal, PALETTE, SCALE, stageAt, TABLE, type Actor, type RoundPlan, type Turn } from '../rundan';
import type { CameraPose, CueName, Scene, Word } from '../types';

/*
 * RUNDAN I REPRIS. En sal i Jeditemplet på Coruscant, ewoks på läktaren.
 *   intro     In genom salen från fönstren och läktaren ner mot bordet. Antal spelare och liv.
 *   varven    Ringen roterar runt bordet, den vid kortsidan slår. Miss: en livsprick slocknar.
 *             Utslagning: närbild, till bänken, ewokerna jublar.
 *   finalen   "FINALEN", de två sista vid var sin kortsida. Tvåan missar.
 *   kronan    Kronan faller på vinnaren. YUB NUB!
 */

export type Cast = Record<string, { name: string; color: string }>;

const WALL_Z = -9.4;
const COLUMNS = [-6.5, -3, 0.5, 4].flatMap((z) => [[-8.5, z], [8.5, z]] as [number, number][]);
const STEPS = [{ z: -5.7, top: 0.35 }, { z: -6.6, top: 0.75 }, { z: -7.5, top: 1.15 }];
const FURS = ['#5a3d26', '#6b4a2e', '#3f2b1d', '#7a5a3a', '#8a7a6a'];
const HOODS = ['#b36b4a', '#c9a27a', '#8a8f5a', '#7a6a8a', '#a0523a'];
const EWOKS = (() => {
  const r = rng(1983);
  return STEPS.flatMap((_, row) => Array.from({ length: 9 }, (_, i) => ({
    x: (i - 4) * 1.05 + (row % 2) * 0.5 + (r() - 0.5) * 0.25,
    row,
    fur: FURS[Math.floor(r() * FURS.length)],
    hood: HOODS[Math.floor(r() * HOODS.length)],
    ph: r() * Math.PI * 2,
    scale: 0.9 + r() * 0.2,
  })));
})();

/** Salen: templets golvemblem under bordet, pelargångar, och höga fönster mot Coruscant i fonden. */
function Hall({ t }: { t: number }) {
  const stone = <meshStandardMaterial color='#3a3f52' roughness={0.85} />;
  return (
    <group>
      <fog attach='fog' args={['#0b0d18', 16, 70]} />
      <ambientLight intensity={0.3} color='#8f9bd0' />
      <hemisphereLight args={['#6a78c0', '#20140c', 0.45]} />
      <spotLight position={[0, 9, 2]} angle={0.55} penumbra={0.8} intensity={160} color='#ffe6c4' />
      <pointLight position={[0, 5, -8]} intensity={60} color='#9a7cff' distance={18} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -3]}>
        <planeGeometry args={[40, 50]} />
        <MeshReflectorMaterial blur={[400, 120]} resolution={512} mixBlur={1} mixStrength={1.2} roughness={0.7} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color='#1d2233' metalness={0.15} mirror={0} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}><circleGeometry args={[5.2, 64]} /><meshStandardMaterial color='#b48a3c' roughness={0.6} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}><ringGeometry args={[3.0, 3.25, 64]} /><meshStandardMaterial color='#6e2b22' roughness={0.6} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}><circleGeometry args={[2.3, 64]} /><meshStandardMaterial color='#7a3128' roughness={0.6} /></mesh>
      {COLUMNS.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 4.5, 0]}><cylinderGeometry args={[0.45, 0.5, 9, 20]} />{stone}</mesh>
          <mesh position={[0, 0.2, 0]}><boxGeometry args={[1.3, 0.4, 1.3]} />{stone}</mesh>
          <mesh position={[0, 8.8, 0]}><boxGeometry args={[1.3, 0.4, 1.3]} />{stone}</mesh>
        </group>
      ))}
      {[-10, 10].map((x) => <mesh key={x} position={[x, 4.6, -3]}><boxGeometry args={[0.4, 9.2, 16]} />{stone}</mesh>)}
      <mesh position={[0, 9.2, -3]}><boxGeometry args={[20, 0.4, 16]} /><meshStandardMaterial color='#151826' roughness={1} /></mesh>
      {[-9, -4.5, 0, 4.5, 9].map((x) => <mesh key={x} position={[x, 4.6, WALL_Z]}><boxGeometry args={[0.9, 9.2, 0.5]} />{stone}</mesh>)}
      <mesh position={[0, 0.6, WALL_Z]}><boxGeometry args={[20, 1.2, 0.5]} />{stone}</mesh>
      <mesh position={[0, 8.9, WALL_Z]}><boxGeometry args={[20, 0.6, 0.5]} />{stone}</mesh>
      {[-6.75, -2.25, 2.25, 6.75].map((x) => <mesh key={x} position={[x, 4.8, WALL_Z]}><planeGeometry args={[3.6, 7.4]} /><meshBasicMaterial color='#9ec5ff' transparent opacity={0.08} side={2} /></mesh>)}
      {/* templet ligger högt: staden syns under och bortom fönstren */}
      <group position={[0, 12, 0]}><Coruscant t={t} tower={false} /></group>
    </group>
  );
}

/** Läktaren: tre steg ewoks. De gungar med rallyt och blir vilda när `hype` stiger. */
function Stand({ t, hype }: { t: number; hype: number }) {
  return (
    <group>
      {STEPS.map((s) => <mesh key={s.z} position={[0, s.top / 2, s.z]}><boxGeometry args={[11, s.top, 0.9]} /><meshStandardMaterial color='#4a3a2c' roughness={0.9} /></mesh>)}
      {EWOKS.map((e, i) => {
        const step = STEPS[e.row];
        const jump = Math.abs(Math.sin(t * 3 + e.ph)) * 0.04 + hype * Math.abs(Math.sin(t * 10 + e.ph)) * 0.35;
        return <Ewok key={i} position={[e.x, step.top + jump, step.z]} rotation={[0, Math.sin(e.ph) * 0.2, Math.sin(t * 2 + e.ph) * 0.08 * (1 + hype * 2)]} fur={e.fur} hood={e.hood} spear={0.25 + hype * (0.9 + 0.4 * Math.sin(t * 12 + e.ph))} scale={e.scale} />;
      })}
    </group>
  );
}

function Bench({ seats }: { seats: number }) {
  if (!seats) return null;
  const w = seats * 1.25 + 0.4;
  return (
    <group position={[0, 0, BENCH_Z]}>
      <mesh position={[0, 0.3, 0]}><boxGeometry args={[w, 0.08, 0.6]} /><meshStandardMaterial color='#8a6a45' roughness={0.8} /></mesh>
      {[-w / 2 + 0.2, w / 2 - 0.2].map((x) => <mesh key={x} position={[x, 0.15, 0]}><boxGeometry args={[0.12, 0.3, 0.5]} /><meshStandardMaterial color='#5a4530' roughness={0.8} /></mesh>)}
    </group>
  );
}

function Table() {
  const { length: L, width: W, height: H } = TABLE;
  const white = <meshBasicMaterial color='#f4f4f4' />;
  return (
    <group>
      <mesh position={[0, H - 0.03, 0]}><boxGeometry args={[L, 0.06, W]} /><meshStandardMaterial color='#1f4f8f' roughness={0.45} /></mesh>
      {[W / 2 - 0.015, -(W / 2 - 0.015)].map((z) => <mesh key={z} position={[0, H + 0.002, z]}><boxGeometry args={[L, 0.004, 0.03]} />{white}</mesh>)}
      {[L / 2 - 0.015, -(L / 2 - 0.015)].map((x) => <mesh key={x} position={[x, H + 0.002, 0]}><boxGeometry args={[0.03, 0.004, W]} />{white}</mesh>)}
      <mesh position={[0, H + 0.002, 0]}><boxGeometry args={[L, 0.004, 0.012]} />{white}</mesh>
      <mesh position={[0, H + 0.08, 0]}><boxGeometry args={[0.01, 0.16, W + 0.3]} /><meshStandardMaterial color='#101418' transparent opacity={0.75} /></mesh>
      <mesh position={[0, H + 0.165, 0]}><boxGeometry args={[0.015, 0.012, W + 0.3]} />{white}</mesh>
      {[1, -1].flatMap((sx) => [1, -1].map((sz) => (
        <mesh key={`${sx}${sz}`} position={[sx * (L / 2 - 0.2), (H - 0.06) / 2, sz * (W / 2 - 0.15)]}><boxGeometry args={[0.08, H - 0.06, 0.08]} /><meshStandardMaterial color='#222222' metalness={0.5} roughness={0.4} /></mesh>
      )))}
    </group>
  );
}

/** En spelare: racketfiguren i sin färg, namnet ovanför och livsprickarna under namnet. */
function Player({ actor, name, color, max, showLives }: { actor: Actor; name: string; color: string; max: number; showLives: boolean }) {
  return (
    <group position={actor.pos}>
      <Racket rotation={[actor.seated ? -0.2 : 0, actor.heading, actor.swing]} scale={SCALE} color={color} mood={actor.mood} crown={actor.crown} />
      <Billboard position={[0, actor.crown ? 2.45 : 2.2, 0]}>
        <Text fontSize={0.24} color='#ffffff' outlineWidth={0.018} outlineColor='#000000' anchorX='center' anchorY='bottom'>{name}</Text>
        {showLives && Array.from({ length: max }, (_, i) => (
          <mesh key={i} position={[(i - (max - 1) / 2) * 0.19, -0.1, 0]}><sphereGeometry args={[0.055, 12, 10]} /><meshBasicMaterial color={i < actor.lives ? '#ffd24a' : '#3a3a48'} toneMapped={false} /></mesh>
        ))}
      </Billboard>
    </group>
  );
}

function Replay({ plan, cast, t }: { plan: RoundPlan; cast: Cast; t: number }) {
  const s = stageAt(plan, t);
  return (
    <>
      <Hall t={t} />
      <Stand t={t} hype={cheer(plan, t)} />
      <Bench seats={plan.segments.length} />
      <Table />
      {plan.standings.map((id) => <Player key={id} actor={s.actors[id]} name={cast[id]?.name ?? '?'} color={cast[id]?.color ?? PALETTE[0]} max={plan.lives} showLives={plan.segments.length > 0 && t < plan.final.at} />)}
      {s.ball && <mesh position={s.ball}><sphereGeometry args={[BALL_R, 16, 16]} /><meshStandardMaterial color='#fff6e6' emissive='#ffb35c' emissiveIntensity={0.8} /></mesh>}
      {s.crownDrop && <Crown position={s.crownDrop} scale={0.8 * SCALE} rotation={[0, t * 5, 0]} />}
    </>
  );
}

type Out = { turn: Turn; until: number };

function cameraAt(plan: RoundPlan, t: number, firstServe: number, outs: Out[]): CameraPose {
  if (t < firstServe) {
    // in genom salen: från fönstren och läktaren ner mot bordet
    const p = ease(span(t, 0, firstServe), 'inOut');
    return { position: lerp3([0, 6.8, 13], [0, 4.6, 8.8], p), lookAt: lerp3([0, 3.2, -9], [0, 0.8, -0.8], p), fov: 44, snap: true };
  }
  if (t >= plan.crownAt) {
    // kronan på vinnaren, sedan bakåt så att läktaren kommer med
    const w = stageAt(plan, t).actors[plan.final.winner].pos;
    const p = ease(span(t, plan.crownAt + 1.4, plan.duration), 'inOut');
    return { position: lerp3([w[0] * 0.7, 2.1, 3.4], [w[0] * 0.3, 3.6, 8.2], p), lookAt: lerp3([w[0], 1.3, w[2]], [w[0] * 0.5, 1.6, -3], p), fov: 38, snap: true };
  }
  if (t >= plan.final.at) {
    // finalen från sidan, lågt, sakta närmare; långt nog bak för att båda kortsidorna ryms i 4:3
    return { position: [0, 1.9, 8.0 - span(t, plan.final.at, plan.crownAt) * 0.8], lookAt: [0, 0.95, 0], fov: 42, snap: true };
  }
  const out = outs.find(({ turn }) => t >= turn.at && t < turn.at + 1.4);
  if (out) {
    // närbild på den som åkte ut, där hen stod när bollen gick förbi
    const v = stageAt(plan, out.turn.at).actors[out.turn.player].pos;
    return { position: [v[0] * 1.1, 1.9, v[2] + 3.2], lookAt: [v[0], 1.0, v[2]], fov: 34, snap: true };
  }
  // varven: vid bild som sakta driver i sidled; utan snap glider kameran mjukt tillbaka från närbilderna
  return { position: [Math.sin(t * 0.18) * 2.4, 4.4, 8.6], lookAt: [0, 0.8, -0.6], fov: 44 };
}

/** Reprisen som vanlig scen: samma form som Mustafar och Cloud City, men byggd ur rundans plan. */
export function rundanScene(plan: RoundPlan, cast: Cast): Scene {
  const name = (id: string) => cast[id]?.name ?? '?';
  const { final, crownAt, duration, standings } = plan;
  const firstServe = plan.segments[0]?.turns[0].at ?? final.turns[0].at;
  const outs: Out[] = plan.segments.map((s, i) => ({ turn: s.turns[s.turns.length - 1], until: plan.segments[i + 1]?.turns[0].at ?? final.at }));
  const turns = [...plan.segments.flatMap((s) => s.turns), ...final.turns];
  const bounces = turns.flatMap((a, i) => (a.kind === 'hit' && turns[i + 1] ? [a.at + (turns[i + 1].at - a.at) * 0.72] : []));
  // Finalparet i bokstavsordning: "vinnaren mot tvåan" hade avslöjat slutet.
  const [a, b] = [final.winner, final.runnerUp].map(name).sort((x, y) => x.localeCompare(y, 'sv'));
  const n = standings.length;
  return {
    key: 'rundan',
    duration,
    words: (ctx) => [
      { at: 0.4, until: firstServe - 0.2, text: 'Jeditemplet · Coruscant', style: 'subtitle' },
      { at: 0.9, until: firstServe - 0.2, text: n > 2 ? `${n} spelare · ${plan.lives} liv` : `${n} spelare`, style: 'name', size: 0.8 },
      ...outs.map(({ turn, until }): Word => ({ at: turn.at + 0.15, until, text: `${name(turn.player)} åker ut · ${ordinal(standings.indexOf(turn.player) + 1)} plats`, style: 'subtitle' })),
      { at: final.at, until: final.turns[0].at, text: 'FINALEN', size: 2.4 },
      { at: final.at + 0.3, until: final.turns[0].at, text: `${a} mot ${b}`, style: 'subtitle' },
      { at: crownAt + 0.3, text: 'YUB NUB!', size: 2.2, color: '#ffb35c' },
      { at: crownAt + 1.1, text: `${ctx.winner} · ${ctx.crowningWord}`, style: 'name', size: 0.9 },
    ],
    cues: [
      ...turns.filter((x) => x.kind === 'hit').map((x) => ({ at: x.at, cue: 'pok' as CueName })),
      ...bounces.map((at) => ({ at, cue: 'pok' as CueName })),
      ...outs.flatMap(({ turn }) => [{ at: turn.at, cue: 'slam' as CueName }, { at: turn.at + 0.25, cue: 'cheer' as CueName }]),
      { at: final.at, cue: 'slam' },
      { at: crownAt, cue: 'cheer' },
      { at: crownAt + 0.35, cue: 'slam' },
    ],
    fade: (t) => Math.max(1 - span(t, 0, 0.8), span(t, duration - 0.8, duration - 0.2) * 0.85),
    camera: (t) => cameraAt(plan, t, firstServe, outs),
    Scene: ({ t }) => <Replay plan={plan} cast={cast} t={t} />,
  };
}
