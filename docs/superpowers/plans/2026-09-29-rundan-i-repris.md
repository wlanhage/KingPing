# Rundan i repris Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Varje runda med sparad placering kan spelas upp som en 3D-rekonstruktion i Jeditemplet på Coruscant, med ewoks på läktaren, på en egen delbar sida `/rundor/[id]`.

**Architecture:** En ren planerare (`components/stage/rundan.ts`) gör placeringen till en seedad tidslinje av slag, missar och utslagningar, och räknar ut var alla står vid tiden t. En data-byggd `Scene` (`components/stage/scenes/rundan.tsx`) ritar det; `StageShow` får en `scenes`-prop så att den kan spela en scen som inte ligger i registret. Sidan är en serverkomponent med placeringen som lista och en klientknapp som laddar three.js först vid klick.

**Tech Stack:** Next.js 15 (app router, serverkomponenter), React 19, @react-three/fiber + drei, Prisma, vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-rundan-i-repris-design.md`

## Global Constraints

- All UI-text och kodkommentarer på svenska, i repots ton (kommentarer förklarar *varför*).
- Inga nya beroenden.
- Liv: standard `3`. Tak för hela reprisen: `45` s.
- Samma runda spelas alltid upp likadant: all slump seedas på rundans id.
- Utslagningsordningen följer `WinEvent.standings` baklänges, alltid.
- three.js får inte hamna i sidans första bundle: laddas med `next/dynamic` och `ssr: false`, som i `Coronation.tsx`.
- Kör med Node 22: `export PATH=/Users/axel/.nvm/versions/node/v22.22.3/bin:$PATH` före `npm`/`npx`.

---

### Task 1: Planeraren — placering till tidslinje och positioner

**Files:**
- Create: `components/stage/rundan.ts`
- Create: `tests/rundan.test.ts`
- Modify: `docs/superpowers/specs/2026-09-29-rundan-i-repris-design.md` (taket 40 → 45 s)

**Interfaces:**
- Consumes: `rng`, `ease`, `span`, `decay`, `ballistic` från `components/stage/anim.ts`; `type Mood` från `components/stage/props.tsx`; `type Vec3` från `components/stage/types.ts`.
- Produces:
  - `LIVES = 3`, `MAX_DURATION = 45`, `TABLE = { length, width, height }`, `RING = { a, b }`, `SCALE = 0.8`, `BENCH_Z = -4.4`, `BALL_R = 0.07`, `PALETTE: string[]`
  - `type Turn = { at: number; end: 0 | 1; player: string; kind: 'hit' | 'miss' | 'out' }`
  - `type Segment = { ring: string[]; e0: 0 | 1; m: number; delta: number; turns: Turn[] }`
  - `type RoundPlan = { lives; standings; segments: Segment[]; final: { at; winner; runnerUp; winnerEnd: 0 | 1; turns: Turn[] }; crownAt; duration }`
  - `type Actor = { pos: Vec3; heading: number; swing: number; lives: number; mood: Mood; crown: boolean; seated: boolean }`
  - `type StageState = { actors: Record<string, Actor>; ball: Vec3 | null; crownDrop: Vec3 | null }`
  - `planRound(standings: string[], seed: number, lives = LIVES): RoundPlan`
  - `stageAt(plan: RoundPlan, t: number): StageState`
  - `cheer(plan: RoundPlan, t: number): number` (0–1)
  - `ringStep(k: number): { m: number; delta: number }`, `hitterAt(j: number, k: number, m: number): number`
  - `seatPos(i: number, seats: number): Vec3`, `ordinal(n: number): string`

- [ ] **Step 1: Write the failing tests**

`tests/rundan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cheer, hitterAt, LIVES, MAX_DURATION, ordinal, planRound, ringStep, stageAt, type RoundPlan } from '../components/stage/rundan';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const lapTurns = (plan: RoundPlan) => plan.segments.flatMap((s) => s.turns);
const seeds = Array.from({ length: 40 }, (_, i) => i * 7919 + 1);
const finite = (v: number) => Number.isFinite(v);

describe('ringStep', () => {
  it.each([3, 4, 5, 6, 7, 8, 9, 10, 11, 12])('k=%i: alla i ringen når bordet, varannan gång vid varje kortsida', (k) => {
    const { m, delta } = ringStep(k);
    expect(delta).toBeGreaterThan(0);
    expect(new Set(Array.from({ length: k }, (_, j) => hitterAt(j, k, m))).size).toBe(k);
    for (let j = 0; j < 2 * k; j++) {
      const angle = (2 * Math.PI * hitterAt(j, k, m)) / k + delta * j;
      const off = (((angle - j * Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      expect(Math.min(off, 2 * Math.PI - off)).toBeLessThan(1e-9);
    }
  });
});

describe('planRound', () => {
  it.each([2, 3, 4, 6, 7, 12])('%i spelare: utslagningarna följer placeringen baklänges', (n) => {
    for (const seed of seeds) {
      const outs = lapTurns(planRound(ids(n), seed)).filter((t) => t.kind === 'out').map((t) => t.player);
      expect(outs).toEqual(ids(n).slice(2).reverse());
    }
  });
  it('varje utslagen missar exakt LIVES gånger, och sista missen är utslagningen', () => {
    for (const seed of seeds) {
      const turns = lapTurns(planRound(ids(7), seed));
      for (const id of ids(7).slice(2)) {
        const mine = turns.filter((t) => t.player === id && t.kind !== 'hit');
        expect(mine).toHaveLength(LIVES);
        expect(mine.at(-1)!.kind).toBe('out');
        expect(mine.slice(0, -1).every((t) => t.kind === 'miss')).toBe(true);
      }
    }
  });
  it('finalisterna har alltid liv kvar till finalen', () => {
    for (const seed of seeds) {
      const turns = lapTurns(planRound(ids(7), seed));
      for (const id of ['p0', 'p1']) {
        expect(turns.filter((t) => t.player === id && t.kind !== 'hit').length).toBeLessThan(LIVES);
        expect(turns.some((t) => t.player === id && t.kind === 'out')).toBe(false);
      }
    }
  });
  it('ingen missar förrän bollen gått minst två slag', () => {
    for (const seed of seeds) for (const s of planRound(ids(6), seed).segments) {
      let rally = 0;
      for (const turn of s.turns) {
        if (turn.kind === 'hit') rally++;
        else { expect(rally).toBeGreaterThanOrEqual(2); rally = 0; }
      }
    }
  });
  it('samma seed ger samma plan, en annan seed en annan', () => {
    expect(planRound(ids(6), 42)).toEqual(planRound(ids(6), 42));
    expect(planRound(ids(6), 42)).not.toEqual(planRound(ids(6), 43));
  });
  it('två spelare går direkt till finalen', () => {
    const plan = planRound(ids(2), 1);
    expect(plan.segments).toEqual([]);
    expect(plan.final.winner).toBe('p0');
    expect(plan.final.turns.at(-1)).toMatchObject({ player: 'p1', kind: 'miss' });
  });
  it('finalen: de två slår varannan gång från var sin kortsida, tvåan missar sist', () => {
    for (const seed of seeds) {
      const { final } = planRound(ids(5), seed);
      final.turns.forEach((t, i) => {
        if (i) expect(t.player).not.toBe(final.turns[i - 1].player);
        expect(t.end).toBe(t.player === final.winner ? final.winnerEnd : 1 - final.winnerEnd);
      });
      expect(final.turns.at(-1)).toMatchObject({ player: 'p1', kind: 'miss' });
      expect(final.turns.slice(0, -1).every((t) => t.kind === 'hit')).toBe(true);
    }
  });
  it('tiden går framåt och hela reprisen ryms under taket', () => {
    for (const n of [2, 3, 7, 12]) for (const seed of seeds) {
      const plan = planRound(ids(n), seed);
      const times = [...lapTurns(plan).map((t) => t.at), plan.final.at, ...plan.final.turns.map((t) => t.at), plan.crownAt, plan.duration];
      for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1]);
      expect(plan.duration).toBeLessThanOrEqual(MAX_DURATION + 1e-9);
    }
  });
  it('kräver minst två spelare', () => {
    expect(() => planRound(['p0'], 1)).toThrow();
  });
});

describe('stageAt', () => {
  it.each([2, 3, 7, 12])('%i spelare: positioner, boll, krona och jubel är ändliga tal hela vägen', (n) => {
    const plan = planRound(ids(n), 123);
    for (let t = 0; t <= plan.duration + 0.5; t += 0.05) {
      const s = stageAt(plan, t);
      expect(Object.keys(s.actors)).toHaveLength(n);
      for (const a of Object.values(s.actors)) expect([...a.pos, a.heading, a.swing].every(finite), `t=${t.toFixed(2)}`).toBe(true);
      if (s.ball) expect(s.ball.every(finite)).toBe(true);
      if (s.crownDrop) expect(s.crownDrop.every(finite)).toBe(true);
      expect(finite(cheer(plan, t))).toBe(true);
    }
  });
  it('den som slår står vid rätt kortsida i samma ögonblick', () => {
    for (const seed of seeds) {
      const plan = planRound(ids(6), seed);
      for (const turn of [...lapTurns(plan), ...plan.final.turns]) {
        const [x, , z] = stageAt(plan, turn.at).actors[turn.player].pos;
        expect(Math.sign(x)).toBe(turn.end === 0 ? 1 : -1);
        expect(Math.abs(z)).toBeLessThan(1e-6);
      }
    }
  });
  it('till slut: de utslagna sitter utan liv på bänken och vinnaren bär kronan', () => {
    const plan = planRound(ids(5), 11);
    const end = stageAt(plan, plan.duration);
    for (const id of ['p2', 'p3', 'p4']) expect(end.actors[id]).toMatchObject({ lives: 0, seated: true });
    expect(end.actors.p0.crown).toBe(true);
    expect(end.actors.p1.crown).toBe(false);
  });
});

describe('ordinal', () => {
  it('svenska ordningstal', () => {
    expect([1, 2, 3, 4, 11, 12, 21, 22].map(ordinal)).toEqual(['1:a', '2:a', '3:e', '4:e', '11:e', '12:e', '21:a', '22:a']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/rundan.test.ts`
Expected: FAIL — `Cannot find module '../components/stage/rundan'`.

- [ ] **Step 3: Write the implementation**

`components/stage/rundan.ts`:

```ts
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
const FINAL_X = 3.3;
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

  // Finalen: de två sista går från ringen till var sin kortsida.
  const last = segments[segments.length - 1];
  if (!last || t > lastTurn(last).at) {
    const p = ease(span(t, final.at, final.turns[0].at - 0.25), 'inOut');
    for (const id of [final.winner, final.runnerUp]) {
      const end = id === final.winner ? final.winnerEnd : 1 - final.winnerEnd;
      const spot: Vec3 = [end === 0 ? FINAL_X : -FINAL_X, 0, 0];
      pos.set(id, last ? mix(onRing(angleIn(last, id, last.turns.length - 1)), spot, p) : spot);
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
```

In the spec, change `| Längd | ~20–40 s. …` to `| Längd | ~30–45 s. Många spelare = snabbare rally, inte längre film |` and rule 6 `inom 40 s` to `inom 45 s`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/rundan.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add components/stage/rundan.ts tests/rundan.test.ts docs/superpowers/specs/2026-09-29-rundan-i-repris-design.md
git commit -m "Rundan i repris: planeraren gör placeringen till slag, missar och positioner"
```

---

### Task 2: Scenens delar — ewoks, Coruscant utan torn, ljud och StageShow med egna scener

**Files:**
- Modify: `components/stage/types.ts` (CueName + `'pok' | 'cheer'`, `Scene.key`)
- Modify: `components/stage/StageShow.tsx` (prop `scenes`)
- Modify: `components/Coronation.tsx` (exportera `hasWebGL`, `playCueSound`; cues `pok`, `cheer`)
- Modify: `components/stage/scenes/senate.tsx` (exportera `Coruscant`, prop `tower`)
- Modify: `components/stage/props.tsx` (ny `Ewok`)

**Interfaces:**
- Produces:
  - `CueName` innehåller `'pok'` och `'cheer'`; `Scene.key: SceneKey | 'rundan'`
  - `StageShow({ ctx, sequence?, scenes?, onDone?, onCue?, onFail?, frozenT? })` — `scenes` vinner över `sequence`
  - `export function hasWebGL(): boolean`, `export function playCueSound(ctx: AudioContext, master: GainNode, cue: CueName): void` i `components/Coronation.tsx`
  - `export function Coruscant({ t, tower = true }: { t: number; tower?: boolean })` i `components/stage/scenes/senate.tsx`
  - `export function Ewok({ position, rotation, fur, hood, spear, scale })` i `components/stage/props.tsx`

- [ ] **Step 1: types.ts**

```ts
export type CueName = 'ignite' | 'slam' | 'hum' | 'door' | 'sizzle' | 'smash' | 'boom' | 'breath' | 'blast' | 'lightning' | 'scream' | 'pok' | 'cheer';
```

and in `Scene`:

```ts
export type Scene = {
  /** 'rundan' byggs ur en rundas data och ligger därför inte i SCENES. */
  key: SceneKey | 'rundan';
```

- [ ] **Step 2: StageShow.tsx**

```tsx
import type { CameraPose, CueName, Scene, SceneCtx, SceneKey } from './types';

const REST: CameraPose = { position: [0.8, 1.4, -1.5], lookAt: [0, 1, -6], fov: 40 };
const NO_SCENES: SceneKey[] = [];
```

```tsx
export function StageShow({ ctx, sequence = NO_SCENES, scenes: given, onDone, onCue, onFail, frozenT }: { ctx: SceneCtx; sequence?: SceneKey[]; scenes?: Scene[]; onDone?: () => void; onCue?: (cue: CueName) => void; onFail?: () => void; frozenT?: number }) {
  // Kröningen väljer scener ur registret; reprisen bygger sin egen ur rundans data.
  const scenes = useMemo(() => given ?? sequence.map((k) => SCENES[k]), [given, sequence]);
```

- [ ] **Step 3: Coronation.tsx**

`function hasWebGL()` → `export function hasWebGL()`, `function playCueSound(` → `export function playCueSound(`, and before the closing brace of its `switch`:

```ts
    case 'pok':
      // pingisbollen mot racket eller bord: kort och ljust
      tone(now, 0.05, 1500, 1100, 'sine', 0.22, 0.002);
      noise(now, 0.025, 3500, 0.12);
      break;
    case 'cheer':
      // ewokerna på läktaren: ett sorl och ett gäng pipiga yub nub
      noise(now, 1.3, 1100, 0.1);
      for (let i = 0; i < 9; i++) {
        const at = now + i * 0.09 + Math.random() * 0.05;
        const f = 700 + Math.random() * 600;
        tone(at, 0.14, f, f * 1.5, 'triangle', 0.07, 0.01);
      }
      break;
```

- [ ] **Step 4: senate.tsx**

```tsx
/** Coruscant om natten: torn under och bortom kontoret, ett hav av ljus, trafik i strimmor. Utan `tower` för salar som inte sitter i kanslerns torn. */
export function Coruscant({ t, tower = true }: { t: number; tower?: boolean }) {
```

and wrap the tower mesh: `{tower && <mesh position={[0, -30, -3]}>…</mesh>}`.

- [ ] **Step 5: props.tsx — Ewok**

Append:

```tsx
/**
 * En ewok: päls, läderhuva med öronen genom, stora blanka ögon och ett spjut i högerhanden.
 * `spear` är spjutarmens vinkel — publiken lyfter spjuten när den jublar. Ungefär en meter hög.
 */
export function Ewok({ position = [0, 0, 0] as Vec3, rotation = [0, 0, 0] as Vec3, fur = '#5a3d26', hood = '#b36b4a', spear = 0.25, scale = 1 }: { position?: Vec3; rotation?: Vec3; fur?: string; hood?: string; spear?: number; scale?: number }) {
  const pelt = <meshStandardMaterial color={fur} roughness={1} />;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0.34, 0]} scale={[1, 1.15, 0.9]}><sphereGeometry args={[0.3, 16, 14]} />{pelt}</mesh>
      {[-0.13, 0.13].map((x) => <mesh key={x} position={[x, 0.05, 0.08]} scale={[1, 0.6, 1.4]}><sphereGeometry args={[0.08, 10, 8]} />{pelt}</mesh>)}
      <mesh position={[0, 0.78, 0]}><sphereGeometry args={[0.27, 18, 16]} />{pelt}</mesh>
      {/* huvan: läder över hjässan och bakhuvudet, öppen framåt så ansiktet syns */}
      <mesh position={[0, 0.8, -0.02]} rotation={[-0.35, 0, 0]}><sphereGeometry args={[0.3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color={hood} roughness={0.8} side={2} /></mesh>
      {[-0.17, 0.17].map((x) => <mesh key={x} position={[x, 1.05, -0.04]}><sphereGeometry args={[0.07, 10, 8]} />{pelt}</mesh>)}
      {[-0.1, 0.1].map((x) => <mesh key={x} position={[x, 0.82, 0.22]}><sphereGeometry args={[0.055, 12, 10]} /><meshPhysicalMaterial color='#050505' roughness={0.1} clearcoat={1} /></mesh>)}
      <mesh position={[0, 0.71, 0.24]} scale={[1.2, 0.85, 1]}><sphereGeometry args={[0.08, 12, 10]} /><meshStandardMaterial color='#c9a57a' roughness={0.9} /></mesh>
      <mesh position={[0, 0.74, 0.31]}><sphereGeometry args={[0.028, 8, 8]} /><meshStandardMaterial color='#111111' /></mesh>
      <group position={[0.3, 0.45, 0.05]} rotation={[0, 0, -spear]}>
        <mesh position={[0, 0.45, 0]}><cylinderGeometry args={[0.018, 0.018, 1.1, 6]} /><meshStandardMaterial color='#8a6a45' roughness={0.9} /></mesh>
        <mesh position={[0, 1.05, 0]}><coneGeometry args={[0.04, 0.14, 6]} /><meshStandardMaterial color='#cfcfcf' metalness={0.6} roughness={0.4} /></mesh>
      </group>
    </group>
  );
}
```

- [ ] **Step 6: Verify nothing broke**

Run: `npx vitest run tests/stage.test.ts tests/rundan.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add components/stage/types.ts components/stage/StageShow.tsx components/Coronation.tsx components/stage/scenes/senate.tsx components/stage/props.tsx
git commit -m "Scenens delar för reprisen: ewoks, Coruscant utan torn, pok och jubel"
```

---

### Task 3: Scenen — Jeditemplet, läktaren, bordet och spelarna

**Files:**
- Create: `components/stage/scenes/rundan.tsx`
- Create: `components/stage/RundanShow.tsx`
- Modify: `lib/domain/heraldry.ts` (exportera `hash`)
- Test: `tests/rundan.test.ts` (nytt describe-block)

**Interfaces:**
- Consumes: allt från Task 1 och 2; `assignCharacters` från `lib/domain/heraldry.ts`.
- Produces:
  - `type Cast = Record<string, { name: string; color: string }>`
  - `rundanScene(plan: RoundPlan, cast: Cast): Scene`
  - `type ReplayPlayer = { id: string; name: string; createdAt: string }` (i `RundanShow.tsx`)
  - `RundanShow({ players: ReplayPlayer[]; seed: number; crowningWord: string; onDone; onCue; onFail })`
  - `export function hash(input: string): number` i `lib/domain/heraldry.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/rundan.test.ts` (and add `import { rundanScene } from '../components/stage/scenes/rundan';` and `import type { SceneCtx } from '../components/stage/types';` at the top):

```ts
describe('rundanScene', () => {
  const ctx: SceneCtx = { winner: 'P0', deposed: null, streak: 1, previousStreak: 0, days: null, cosmic: false, crowningWord: 'kröning', tyrannyWord: '' };
  it.each([2, 3, 7, 12])('%i spelare: kamera, ord och ljud håller genom hela reprisen', (n) => {
    const plan = planRound(ids(n), 77);
    const cast = Object.fromEntries(ids(n).map((id) => [id, { name: id.toUpperCase(), color: '#ffffff' }]));
    const scene = rundanScene(plan, cast);
    expect(scene.duration).toBe(plan.duration);
    for (let t = 0; t <= scene.duration + 0.5; t += 0.1) {
      const cam = scene.camera(t, ctx);
      expect([...cam.position, ...cam.lookAt].every(Number.isFinite), `kamera vid ${t.toFixed(1)}`).toBe(true);
      expect(Number.isFinite(scene.fade?.(t) ?? 0)).toBe(true);
    }
    expect(scene.words(ctx).filter((w) => w.text.includes('åker ut'))).toHaveLength(n - 2);
    // StageShow nycklar cues på tiden: två cues på samma tid och den andra hörs aldrig.
    const times = (scene.cues ?? []).map((c) => c.at);
    expect(new Set(times).size).toBe(times.length);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/rundan.test.ts`
Expected: FAIL — `Cannot find module '../components/stage/scenes/rundan'`.

- [ ] **Step 3: heraldry.ts**

`function hash(input: string): number {` → `export function hash(input: string): number {`

- [ ] **Step 4: scenes/rundan.tsx**

```tsx
'use client';
import { Billboard, MeshReflectorMaterial, Text } from '@react-three/drei';
import { Crown, Ewok, Racket, lerp3 } from '../props';
import { ease, rng, span } from '../anim';
import { Coruscant } from './senate';
import { BALL_R, BENCH_Z, cheer, ordinal, PALETTE, SCALE, stageAt, TABLE, type Actor, type RoundPlan, type Turn } from '../rundan';
import type { CameraPose, CueName, Scene, Word } from '../types';

/*
 * RUNDAN I REPRIS. En sal i Jeditemplet på Coruscant, ewoks på läktaren.
 *   intro     In genom salen från fönstren och läktaren ner mot bordet. Namnen, antal liv.
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
    // finalen från sidan, lågt, sakta närmare
    return { position: [0, 1.7, 5.6 - span(t, plan.final.at, plan.crownAt)], lookAt: [0, 0.95, 0], fov: 42, snap: true };
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
```

- [ ] **Step 5: RundanShow.tsx**

```tsx
'use client';
import { useMemo } from 'react';
import { assignCharacters } from '@/lib/domain/heraldry';
import { StageShow } from './StageShow';
import { rundanScene, type Cast } from './scenes/rundan';
import { PALETTE, planRound } from './rundan';
import type { CueName, SceneCtx } from './types';

export type ReplayPlayer = { id: string; name: string; createdAt: string };

/**
 * Reprisen i StageShow. Egen fil för att sidan ska kunna ladda den med next/dynamic — allt three.js
 * hänger på den här importen. Färgerna delas ut som figurerna: ingen i rundan delar färg med någon annan.
 */
export function RundanShow({ players, seed, crowningWord, onDone, onCue, onFail }: { players: ReplayPlayer[]; seed: number; crowningWord: string; onDone: () => void; onCue: (cue: CueName) => void; onFail: () => void }) {
  const scenes = useMemo(() => {
    const colour = assignCharacters(players, PALETTE.length);
    const cast: Cast = Object.fromEntries(players.map((p) => [p.id, { name: p.name, color: PALETTE[colour[p.id]] }]));
    return [rundanScene(planRound(players.map((p) => p.id), seed), cast)];
  }, [players, seed]);
  const ctx: SceneCtx = { winner: players[0].name, deposed: null, streak: 1, previousStreak: 0, days: null, cosmic: false, crowningWord, tyrannyWord: '' };
  return <StageShow ctx={ctx} scenes={scenes} onDone={onDone} onCue={onCue} onFail={onFail} />;
}
```

- [ ] **Step 6: Run the tests and typecheck**

Run: `npx vitest run tests/rundan.test.ts tests/stage.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add components/stage/scenes/rundan.tsx components/stage/RundanShow.tsx lib/domain/heraldry.ts tests/rundan.test.ts
git commit -m "Rundan i repris: scenen i Jeditemplet med ewoks på läktaren"
```

---

### Task 4: Sidan `/rundor/[id]`, delningsbilden och krönikans ▶ Repris

**Files:**
- Create: `lib/domain/round.ts`
- Create: `components/stage/RoundReplay.tsx`
- Create: `app/rundor/[id]/page.tsx`
- Create: `app/rundor/[id]/opengraph-image.tsx`
- Modify: `app/history/page.tsx`, `components/history/CrawlChronicle.tsx`
- Modify: `app/globals.css` (sist i filen)
- Modify: `usage.md`

**Interfaces:**
- Consumes: `RundanShow`, `ReplayPlayer` (Task 3); `hasWebGL`, `playCueSound` (Task 2); `hash` (Task 3); `ordinal` (Task 1).
- Produces: `getRound(id: string): Promise<{ id: string; occurredAt: Date; theme: string; standings: ReplayPlayer[] } | null>`; `CrawlItem.replayHref?: string`.

- [ ] **Step 1: lib/domain/round.ts**

```ts
import { prisma } from '../prisma';
import { isWinInSeason, listSeasons, resolveSeason } from './season';

/**
 * En runda för reprisen: placeringen med namn, vinnaren först, och temat från säsongen rundan
 * spelades i — en gammal runda visas i sin egen säsongs ord. null om id:t inte finns.
 */
export async function getRound(id: string) {
  const win = await prisma.winEvent.findUnique({ where: { id }, select: { id: true, occurredAt: true, standings: true } });
  if (!win) return null;
  const players = await prisma.player.findMany({ where: { id: { in: win.standings } }, select: { id: true, name: true, createdAt: true } });
  const byId = new Map(players.map((p) => [p.id, p]));
  const season = (await listSeasons()).find((s) => isWinInSeason(win.occurredAt, s)) ?? (await resolveSeason());
  return {
    id: win.id,
    occurredAt: win.occurredAt,
    theme: season.theme,
    // Spelare raderas aldrig; en okänd id i placeringen hoppas över i stället för att fälla sidan.
    standings: win.standings.flatMap((pid) => {
      const p = byId.get(pid);
      return p ? [{ id: p.id, name: p.name, createdAt: p.createdAt.toISOString() }] : [];
    }),
  };
}
```

- [ ] **Step 2: components/stage/RoundReplay.tsx**

```tsx
'use client';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { hash } from '@/lib/domain/heraldry';
import { hasWebGL, playCueSound } from '../Coronation';
import type { ReplayPlayer } from './RundanShow';
import type { CueName } from './types';

// three.js laddas först när någon trycker på play, som i kröningen.
const RundanShow = dynamic(() => import('./RundanShow').then((m) => m.RundanShow), { ssr: false });

export function RoundReplay({ roundId, players, crowningWord }: { roundId: string; players: ReplayPlayer[]; crowningWord: string }) {
  const [state, setState] = useState<'idle' | 'playing' | 'failed'>('idle');
  // null fram till mount: WebGL och reduced motion finns bara i webbläsaren.
  const [capable, setCapable] = useState<boolean | null>(null);
  const audio = useRef<{ ctx: AudioContext; master: GainNode } | null>(null);

  useEffect(() => { setCapable(hasWebGL() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches); }, []);
  useEffect(() => () => { void audio.current?.ctx.close().catch(() => {}); }, []);
  useEffect(() => {
    if (state !== 'playing') return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setState('idle'); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state]);

  // Ljudet måste startas i själva klicket, annars släpper webbläsaren inte fram det.
  function play() {
    if (!audio.current) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AC) {
        const ctx = new AC();
        const master = ctx.createGain();
        master.gain.value = 0.6;
        master.connect(ctx.destination);
        audio.current = { ctx, master };
      }
    }
    void audio.current?.ctx.resume();
    setState('playing');
  }
  const onCue = useCallback((cue: CueName) => { if (audio.current) playCueSound(audio.current.ctx, audio.current.master, cue); }, []);

  if (capable === false) return <p className='replay-note'>Reprisen spelas i 3D. Den kräver WebGL och visas inte när rörelser är avstängda — placeringen står ovanför.</p>;
  return (
    <>
      <button type='button' className='replay-play' onClick={play} disabled={!capable || state === 'playing'}>▶ Spela rundan</button>
      {state === 'failed' && <p className='replay-note'>3D-vyn tappade kontakten med grafikkortet. Placeringen står ovanför.</p>}
      {state === 'playing' && (
        <>
          <RundanShow players={players} seed={hash(roundId)} crowningWord={crowningWord} onDone={() => setState('idle')} onCue={onCue} onFail={() => setState('failed')} />
          <button type='button' className='replay-close' aria-label='Stäng reprisen' onClick={() => setState('idle')}>✕</button>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 3: app/rundor/[id]/page.tsx**

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRound } from '@/lib/domain/round';
import { formatDateTime } from '@/lib/format';
import { getTheme } from '@/lib/theme';
import { ordinal } from '@/components/stage/rundan';
import { RoundReplay } from '@/components/stage/RoundReplay';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const round = await getRound((await params).id);
  return { title: round?.standings[0] ? `Rundan i repris · ${round.standings[0].name}` : 'Rundan i repris' };
}

/** En runda i repris: placeringen som lista, och 3D-reprisen i Jeditemplet bakom en knapp. */
export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const round = await getRound((await params).id);
  if (!round) notFound();
  const theme = getTheme(round.theme);
  const players = round.standings;
  return (
    <main className='page-stack'>
      <section>
        <p className='replay-eyebrow'>Jeditemplet · Coruscant</p>
        <h1 className='title-xl'>Rundan i repris</h1>
        <p className='subtitle'>{formatDateTime(round.occurredAt)}{players.length >= 2 ? ` · ${players.length} spelare` : ''}</p>
      </section>
      {players.length < 2 ? (
        <section className='card'>
          <p style={{ margin: 0 }}>Den här rundan spelades in utan placering, så det finns inget att spela upp.</p>
        </section>
      ) : (
        <section className='card replay-card'>
          <ol className='replay-standings'>
            {players.map((p, i) => (
              <li key={p.id}>
                <span className='replay-place'>{ordinal(i + 1)}</span>
                <strong>{p.name}</strong>
                {i === 0 && <span aria-label='vinnare'>👑</span>}
                {i === players.length - 1 && players.length > 2 && <span className='muted'>åkte ut först</span>}
              </li>
            ))}
          </ol>
          <RoundReplay roundId={round.id} players={players} crowningWord={theme.verbs.crowning} />
        </section>
      )}
      <Link href='/history' className='replay-back'>← Till krönikan</Link>
    </main>
  );
}
```

- [ ] **Step 4: app/rundor/[id]/opengraph-image.tsx**

```tsx
import { ImageResponse } from 'next/og';
import { getRound } from '@/lib/domain/round';
import { formatDateTime } from '@/lib/format';
import { getTheme } from '@/lib/theme';
import { OG_SIZE, OgFrame, ogFonts } from '@/lib/og/frame';
import { ordinal } from '@/components/stage/rundan';

export const alt = 'Rundan i repris';
export const size = OG_SIZE;
export const contentType = 'image/png';

/** Delningsbild för en runda: vinnaren, när, och resten av placeringen. Så blir länken fin i Slack. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const round = await getRound((await params).id);
  const theme = getTheme(round?.theme);
  const c = theme.colors;
  const players = round?.standings ?? [];
  return new ImageResponse(
    (
      <OgFrame theme={theme}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 8, color: c.muted, textTransform: 'uppercase' }}>Rundan i repris · Jeditemplet</div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 84, lineHeight: 1.05, color: c.gold }}>{players[0] ? `👑 ${players[0].name}` : 'Rundan'}</div>
        {round && <div style={{ display: 'flex', marginTop: 14, fontSize: 28, color: c.text, opacity: 0.85 }}>{formatDateTime(round.occurredAt)}</div>}
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, fontSize: 30 }}>
          {players.slice(1, 8).map((p, i) => (
            <span key={p.id} style={{ display: 'flex', color: c.text }}><span style={{ color: c.muted, marginRight: 10 }}>{ordinal(i + 2)}</span>{p.name}</span>
          ))}
        </div>
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts(), emoji: 'twemoji' },
  );
}
```

- [ ] **Step 5: Krönikan**

`components/history/CrawlChronicle.tsx`:

```tsx
export type CrawlItem = { id: string; date: string; winner: string; text: string; replayHref?: string };
```

```tsx
<span className='crawl-item-meta'>{it.date} · {it.winner}{it.replayHref && <> · <a href={it.replayHref} className='crawl-replay'>▶ Repris</a></>}</span>
```

`app/history/page.tsx` — `import { RoundReplay }` behövs inte; ändra crawl-mappningen:

```tsx
items={events.map((e) => ({ id: e.id, date: formatDate(e.occurredAt), winner: e.winner.name, text: e.announcementText, replayHref: e.standings.length >= 2 ? `/rundor/${e.id}` : undefined }))}
```

och i listan:

```tsx
<div>
  <strong>{event.winner.name}</strong> — {event.announcementText}
  {event.standings.length >= 2 && <Link href={`/rundor/${event.id}`} className='replay-link'>▶ Repris</Link>}
</div>
```

- [ ] **Step 6: CSS (sist i app/globals.css)**

```css
/* Rundan i repris */
.replay-eyebrow { margin: 0 0 .3rem; font-size: .78rem; letter-spacing: .24em; text-transform: uppercase; color: var(--muted); }
.replay-card { display: grid; gap: 1.2rem; justify-items: start; }
.replay-standings { margin: 0; padding: 0; list-style: none; display: grid; gap: .45rem; }
.replay-standings li { display: flex; align-items: baseline; gap: .6rem; flex-wrap: wrap; }
.replay-place { min-width: 2.6rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.replay-play { padding: .75rem 1.4rem; border: 1px solid var(--gold); border-radius: 999px; background: var(--gold); color: #1a1200; font: 700 .9rem/1 var(--font-display), Georgia, serif; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }
.replay-play:disabled { opacity: .5; cursor: default; }
.replay-note { margin: 0; color: var(--muted); }
.replay-close { position: fixed; top: 1rem; right: 1rem; z-index: 140; width: 2.6rem; height: 2.6rem; border: 1px solid rgba(255,255,255,.4); border-radius: 999px; background: rgba(0,0,0,.5); color: #fff; font-size: 1.1rem; cursor: pointer; }
.replay-close:hover { border-color: #fff; background: rgba(255,255,255,.12); }
.replay-back { color: var(--muted); }
.replay-link { margin-left: .5rem; white-space: nowrap; }
.crawl-replay { color: inherit; text-decoration: underline; text-underline-offset: .2em; }
```

- [ ] **Step 7: usage.md** — efter Historik-avsnittet:

```md
## Rundan i repris (`/rundor/[id]`)
- Varje runda med sparad placering har ▶ Repris i krönikan.
- Sidan visar placeringen, och spelar upp rundan i 3D: Jeditemplet på Coruscant, ewoks på läktaren, tre liv var och final mellan de två sista. Ordningen är den riktiga; bollarna däremellan är påhittade men likadana varje gång.
- Länken går att klistra in i Slack — delningsbilden visar vinnaren och placeringen.
```

- [ ] **Step 8: Typecheck and full test suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: no type errors; all tests pass (tests that need a database may be skipped/fail the same way they do on `main` — compare with `git stash`-free baseline by running `npx vitest run` on main's files if unsure).

- [ ] **Step 9: Commit**

```bash
git add lib/domain/round.ts components/stage/RoundReplay.tsx app/rundor app/history/page.tsx components/history/CrawlChronicle.tsx app/globals.css usage.md
git commit -m "Rundan i repris: egen sida, delningsbild och ▶ Repris i krönikan"
```

---

### Task 5: Verifiering i webbläsaren

**Files:** inga (lokal `.env` är gitignorerad)

- [ ] **Step 1: Slängdatabas**

```bash
docker run -d --name kingping-repris -e POSTGRES_PASSWORD=pg -e POSTGRES_DB=kingping -p 5436:5432 postgres:16-alpine
```

`.env` (gitignorerad):

```
DATABASE_URL=postgresql://postgres:pg@localhost:5436/kingping
DIRECT_URL=postgresql://postgres:pg@localhost:5436/kingping
WIN_COOLDOWN_MS=0
```

```bash
npm ci && npx prisma migrate deploy && npx prisma db seed
```

- [ ] **Step 2: Starta dev-servern** med preview_start `{ name: 'dev' }` (port 3030).

- [ ] **Step 3: Spela in rundor med placering** via `POST /api/wins` med `{ winnerId, standings }` för 2, 4 och 7 spelare (id:n från `GET /api/players`).

- [ ] **Step 4: Kontrollera**
  - `/history` visar ▶ Repris på de nya rundorna, inte på seedens gamla.
  - `/rundor/<id>` visar placeringen och knappen; okänt id ger 404; en seedad runda utan placering ger förklaringen.
  - ▶ Spela rundan: intro över läktaren och fönstren, varv med liv som slocknar, utslagning med närbild och bänk, FINALEN, kronan, YUB NUB. Skärmbilder från varje.
  - Inga fel i konsolen; `/rundor/<id>/opengraph-image` ger en PNG.

- [ ] **Step 5: Städa**

```bash
docker rm -f kingping-repris
```
