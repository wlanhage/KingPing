import { ballistic, decay, ease, rng, span } from './anim';
import type { Mood } from './props';
import type { Vec3 } from './types';

/**
 * Rundan i repris som ren data: vem som slår, vem som missar och var alla står vid tiden t.
 * Ordningen spelarna åker ut i är sann (WinEvent.standings). Allt annat är påhittat men seedat
 * på rundans id, så samma runda spelas upp likadant varje gång. Ingen React, ingen three.
 */

export const LIVES = 3;
/** Taket för hela reprisen. Många spelare ger snabbare rally, inte längre film. */
export const MAX_DURATION = 45;

// Nominella tider i sekunder. Varven komprimeras om hela reprisen inte ryms under taket.
const INTRO = 3.0;
const HIT = 0.4;
const MISS_PAUSE = 0.8;
const OUT_PAUSE = 2.0;
const FINAL_INTRO = 1.8;
const FINAL_HIT = 0.5;
const CROWN_DELAY = 1.1;
const CROWN_FALL = 0.9;
const OUTRO = 4.2;

/** Bordet ligger längs x mitt i salen. Spelarna springer på en ellips runt det; vinkel 0 är östra kortsidan. */
export const TABLE = { length: 3.0, width: 1.7, height: 0.76 };
export const RING = { a: 3.4, b: 2.4 };
/** Racketfigurerna är lite mindre än i scenerna, så att tolv ryms runt bordet. */
export const SCALE = 0.8;
export const BENCH_Z = -4.4;
export const BALL_R = 0.07;
const CONTACT = { x: 2.9, y: 1.0 };
/** Var på vägen bollen studsar: på mottagarens halva. */
const BOUNCE = 0.72;
const TAU = Math.PI * 2;

export const PALETTE = ['#d8232a', '#2b6cd8', '#2fa35a', '#e0a526', '#8e44ad', '#e0662b', '#16a3a3', '#e05a8a', '#8a95a8', '#b5651d'];

/** Ett slag, eller en miss, av den som står vid kortsidan `end` (0 = öster, 1 = väster). */
export type Turn = { at: number; end: 0 | 1; player: string; kind: 'hit' | 'miss' | 'out' };
/** Ett varv: samma spelare i ringen, från första serven till nästa utslagning. */
export type Segment = { ring: string[]; e0: 0 | 1; m: number; delta: number; turns: Turn[] };
export type RoundPlan = {
  lives: number;
  /** Placeringen, vinnaren först — samma som WinEvent.standings. */
  standings: string[];
  segments: Segment[];
  final: { at: number; winner: string; runnerUp: string; winnerEnd: 0 | 1; turns: Turn[] };
  crownAt: number;
  duration: number;
};
export type Actor = { pos: Vec3; heading: number; swing: number; lives: number; mood: Mood; crown: boolean; seated: boolean };
export type StageState = { actors: Record<string, Actor>; ball: Vec3 | null; crownDrop: Vec3 | null };

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Svenska ordningstal: 1:a, 2:a, 3:e … 11:e, 12:e, 21:a. */
export function ordinal(n: number): string {
  const a = (n % 10 === 1 || n % 10 === 2) && n % 100 !== 11 && n % 100 !== 12;
  return `${n}:${a ? 'a' : 'e'}`;
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Hur långt ringen roterar per slag. Slagen växlar kortsida, så varje slag måste föra en spelare
 * till motsatt ände: rotationen är π + 2πm/k. m väljs så att ringen rör sig så lite som möjligt och
 * ändå låter ALLA slå — med gcd(m, k) ≠ 1 skulle bara varannan (eller var tredje) nå bordet.
 */
export function ringStep(k: number): { m: number; delta: number } {
  let best = { m: 0, delta: Infinity };
  for (let m = 1 - k; m < 0; m++) {
    if (gcd(-m, k) !== 1) continue;
    const delta = (((Math.PI + (TAU * m) / k) % TAU) + TAU) % TAU;
    if (delta > 1e-9 && delta < best.delta) best = { m, delta };
  }
  return best;
}

/** Vilken plats i ringen som står vid kortsidan vid varvets slag nummer j. */
export const hitterAt = (j: number, k: number, m: number) => (((-m * j) % k) + k) % k;

export function planRound(standings: string[], seed: number, lives = LIVES): RoundPlan {
  if (standings.length < 2) throw new Error('En repris kräver minst två spelare.');
  const rand = rng(seed);
  const [winner, runnerUp] = standings;

  // 1. En omgång missar per utslagning. Den som ska ut har sina liv minus ett att tappa; någon till
  // kan tappa ett liv på vägen, men aldrig sitt sista — då hade fel spelare åkt ut.
  const left = new Map(standings.map((id) => [id, lives]));
  const alive = new Set(standings);
  const rounds = standings.slice(2).reverse().map((victim) => {
    const pending = new Map<string, number>();
    for (const id of alive) {
      // ponytail: ungefär en extra miss per utslagning oavsett antal spelare, annars svämmar tolv över
      const spare = id === victim ? left.get(id)! - 1 : left.get(id)! >= 2 && rand() < 1 / alive.size ? 1 : 0;
      if (spare) pending.set(id, spare);
      left.set(id, left.get(id)! - spare);
    }
    alive.delete(victim);
    return { victim, pending };
  });

  // 2. Varven, i nominell tid från första serven. Den på tur slår — eller missar, om hen har en miss
  // kvar i omgången och bollen gått minst två slag. Utslagningen kommer sist i omgången.
  const segments: Segment[] = [];
  let ring = shuffle(standings, rand);
  let e0: 0 | 1 = 0;
  let clock = 0;
  for (const { victim, pending } of rounds) {
    const k = ring.length;
    const { m, delta } = ringStep(k);
    const segment: Segment = { ring, e0, m, delta, turns: [] };
    let rally = 0;
    for (let j = 0; ; j++) {
      const player = ring[hitterAt(j, k, m)];
      const end = ((e0 + j) % 2) as 0 | 1;
      const due = rally >= 2 && (pending.size ? pending.has(player) : player === victim);
      if (!due) {
        segment.turns.push({ at: clock, end, player, kind: 'hit' });
        rally++;
        clock += HIT;
        continue;
      }
      rally = 0;
      if (pending.size) {
        const rest = pending.get(player)! - 1;
        if (rest) pending.set(player, rest); else pending.delete(player);
        segment.turns.push({ at: clock, end, player, kind: 'miss' });
        clock += MISS_PAUSE;
        continue;
      }
      segment.turns.push({ at: clock, end, player, kind: 'out' });
      clock += OUT_PAUSE;
      // Nästa varv: samma ordning utan den utslagna, med nästa på tur först och vid motsatt kortsida.
      const after = ring[hitterAt(j + 1, k, m)];
      const others = ring.filter((id) => id !== player);
      ring = [...others.slice(others.indexOf(after)), ...others.slice(0, others.indexOf(after))];
      e0 = (1 - end) as 0 | 1;
      break;
    }
    segments.push(segment);
  }

  // 3. Komprimera varven om de inte ryms: taket gäller hela reprisen, inte bara varven.
  const exchanges = 4 + Math.floor(rand() * 4);
  const fixed = INTRO + FINAL_INTRO + exchanges * FINAL_HIT + CROWN_DELAY + OUTRO;
  const f = clock > 0 ? Math.min(1, (MAX_DURATION - fixed) / clock) : 1;
  for (const s of segments) for (const turn of s.turns) turn.at = INTRO + turn.at * f;

  // 4. Finalen: vinnaren och tvåan vid var sin kortsida, varannan gång. Tvåan missar sist.
  const finalAt = INTRO + clock * f;
  const turns: Turn[] = Array.from({ length: exchanges + 1 }, (_, i) => ({
    at: finalAt + FINAL_INTRO + i * FINAL_HIT,
    end: (i % 2) as 0 | 1,
    player: (exchanges - i) % 2 === 0 ? runnerUp : winner,
    kind: i === exchanges ? 'miss' : 'hit',
  }));
  const crownAt = turns[exchanges].at + CROWN_DELAY;
  return {
    lives,
    standings,
    segments,
    final: { at: finalAt, winner, runnerUp, winnerEnd: ((exchanges + 1) % 2) as 0 | 1, turns },
    crownAt,
    duration: crownAt + OUTRO,
  };
}

const onRing = (theta: number): Vec3 => [RING.a * Math.cos(theta), 0, RING.b * Math.sin(theta)];
const angleIn = (s: Segment, id: string, h: number) => s.e0 * Math.PI + (TAU * s.ring.indexOf(id)) / s.ring.length + s.delta * h;
const lastTurn = (s: Segment) => s.turns[s.turns.length - 1];
const mix = (a: Vec3, b: Vec3, p: number): Vec3 => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p];
const shortArc = (d: number) => ((((d + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const faceTable = (p: Vec3) => Math.atan2(-p[0], -p[2]);
const contactX = (end: 0 | 1) => (end === 0 ? CONTACT.x : -CONTACT.x);

/** Hur många slag ringen roterat vid tiden t: heltal vid varje slag, linjärt emellan. */
function turnsElapsed(s: Segment, t: number): number {
  const { turns } = s;
  if (t <= turns[0].at) return 0;
  for (let j = 1; j < turns.length; j++) if (t < turns[j].at) return j - 1 + (t - turns[j - 1].at) / (turns[j].at - turns[j - 1].at);
  return turns.length - 1;
}

/** Bänkplats i (0 = först ut) av `seats`, framför läktaren. */
export const seatPos = (i: number, seats: number): Vec3 => [(i - (seats - 1) / 2) * 1.25, 0.3, BENCH_Z];

/** Bollen: i en båge med studs på mottagarens halva, eller förbi den som missade och bort över golvet. */
function ballAt(a: Turn, b: Turn | undefined, index: number, t: number): Vec3 | null {
  if (a.kind === 'hit') {
    if (!b) return null;
    const p = (t - a.at) / (b.at - a.at);
    const x = contactX(a.end) + (contactX(b.end) - contactX(a.end)) * p;
    const top = TABLE.height + BALL_R;
    if (p < BOUNCE) { const q = p / BOUNCE; return [x, CONTACT.y + (top - CONTACT.y) * q + Math.sin(q * Math.PI) * 0.45, 0]; }
    const q = (p - BOUNCE) / (1 - BOUNCE);
    return [x, top + (CONTACT.y - top) * q + Math.sin(q * Math.PI) * 0.3, 0];
  }
  const dt = t - a.at;
  if (dt > 0.9) return null;
  const dir = a.end === 0 ? 1 : -1;
  return [contactX(a.end) + dir * dt * 4, ballistic(dt, CONTACT.y, 1.5, 20, BALL_R).y, (index % 2 ? 1 : -1) * dt * 1.5];
}

/** Var alla står, hur de ser ut och var bollen är vid tiden t. Samma t ger alltid samma bild. */
export function stageAt(plan: RoundPlan, t: number): StageState {
  const { segments, final } = plan;
  const turns = [...segments.flatMap((s) => s.turns), ...final.turns];
  const pos = new Map<string, Vec3>();
  const headings = new Map<string, number>();
  const seated = new Set<string>();

  // Ringen: det pågående varvet, eller glidningen in i nästa medan den utslagna går av.
  const i = segments.findIndex((s) => t <= lastTurn(s).at);
  if (i >= 0) {
    const s = segments[i];
    const prev = segments[i - 1];
    if (!prev || t >= s.turns[0].at) {
      const h = turnsElapsed(s, t);
      for (const id of s.ring) pos.set(id, onRing(angleIn(s, id, h)));
    } else {
      const p = ease(span(t, lastTurn(prev).at, s.turns[0].at), 'inOut');
      for (const id of s.ring) {
        const from = angleIn(prev, id, prev.turns.length - 1);
        pos.set(id, onRing(from + shortArc(angleIn(s, id, 0) - from) * p));
      }
    }
  }

  // Finalen: de två sista går längs ringen till var sin kortsida. Längs ringen, inte rakt: den raka
  // vägen från andra sidan går tvärs genom bordet.
  const last = segments[segments.length - 1];
  if (!last || t > lastTurn(last).at) {
    const p = ease(span(t, final.at, final.turns[0].at - 0.25), 'inOut');
    for (const id of [final.winner, final.runnerUp]) {
      const target = (id === final.winner ? final.winnerEnd : 1 - final.winnerEnd) * Math.PI;
      const from = last ? angleIn(last, id, last.turns.length - 1) : target;
      pos.set(id, onRing(from + shortArc(target - from) * p));
    }
  }

  // De utslagna: kvar vid kortsidan ett ögonblick, sedan till bänken.
  segments.forEach((s, seat) => {
    const out = lastTurn(s);
    if (t < out.at) return;
    const from = onRing(angleIn(s, out.player, s.turns.length - 1));
    const to = seatPos(seat, segments.length);
    const p = ease(span(t, out.at + 0.5, out.at + 1.7), 'inOut');
    pos.set(out.player, mix(from, to, p));
    if (p >= 1) { seated.add(out.player); headings.set(out.player, 0); }
    else if (p > 0) headings.set(out.player, Math.atan2(to[0] - from[0], to[2] - from[2]));
  });

  const actors: Record<string, Actor> = {};
  for (const id of plan.standings) {
    const p = pos.get(id)!;
    const mine = turns.filter((x) => x.player === id && x.at <= t);
    const lastHit = mine.findLast((x) => x.kind === 'hit');
    const lastMiss = mine.findLast((x) => x.kind !== 'hit');
    const out = mine.find((x) => x.kind === 'out');
    const mood: Mood = out ? (t - out.at < 0.5 ? 'shock' : 'sad')
      : t >= plan.crownAt ? (id === final.winner ? 'happy' : 'sad')
      : lastMiss && t - lastMiss.at < 0.8 ? 'shock'
      : t >= final.at ? 'grim' : 'happy';
    actors[id] = {
      pos: p,
      heading: headings.get(id) ?? faceTable(p),
      swing: lastHit ? decay(t - lastHit.at, 0.5, 0.3) * (lastHit.end === 0 ? -1 : 1) : 0,
      // Finalens miss kostar inget liv: där syns inga livsprickar.
      lives: plan.lives - mine.filter((x) => x.kind !== 'hit' && !final.turns.includes(x)).length,
      mood,
      crown: id === final.winner && t >= plan.crownAt + CROWN_FALL,
      seated: seated.has(id),
    };
  }

  let k = -1;
  for (let j = 0; j < turns.length && turns[j].at <= t; j++) k = j;
  const ball = k < 0 ? null : ballAt(turns[k], turns[k + 1], k, t);

  const fall = span(t, plan.crownAt, plan.crownAt + CROWN_FALL);
  const w = pos.get(final.winner)!;
  const crownDrop: Vec3 | null = t >= plan.crownAt && fall < 1 ? [w[0], 6 + (1.78 * SCALE - 6) * ease(fall, 'bounce'), w[2]] : null;
  return { actors, ball, crownDrop };
}

/** Hur vilda ewokerna är, 0–1: en topp vid varje utslagning, stående i finalen, extas vid kronan. */
export function cheer(plan: RoundPlan, t: number): number {
  if (t >= plan.crownAt) return 1;
  let c = t >= plan.final.at ? 0.35 : 0.12;
  for (const s of plan.segments) c = Math.max(c, decay(t - lastTurn(s).at, 1, 1.8));
  return c;
}
