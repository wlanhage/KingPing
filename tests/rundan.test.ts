import { describe, expect, it } from 'vitest';
import { cheer, droidAt, droidTrips, DUEL, hitterAt, LIVES, MAX_DURATION, ordinal, outfit, parries, planRound, ringStep, slowmo, stageAt, TABLE, wieldsSaber, type RoundPlan } from '../components/stage/rundan';
import { rundanScene } from '../components/stage/scenes/rundan';
import type { SceneCtx } from '../components/stage/types';

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
  it('ingen går någonsin genom bordet, inte heller finalisterna på väg till sina kortsidor', () => {
    for (const seed of seeds) {
      const plan = planRound(ids(6), seed);
      for (let t = 0; t <= plan.duration; t += 0.05) {
        for (const [id, a] of Object.entries(stageAt(plan, t).actors)) {
          const inside = Math.abs(a.pos[0]) < TABLE.length / 2 + 0.3 && Math.abs(a.pos[2]) < TABLE.width / 2 + 0.3;
          // expect i den här loopen blir 300 000 anrop och spränger tidsgränsen i CI
          if (inside) expect.fail(`${id} vid t=${t.toFixed(2)}, seed ${seed}`);
        }
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

describe('rundanScene', () => {
  const ctx: SceneCtx = { winner: 'P0', deposed: null, streak: 1, previousStreak: 0, days: null, cosmic: false, crowningWord: 'kröning', tyrannyWord: '' };
  it.each([2, 3, 7, 12])('%i spelare: kamera, ord och ljud håller genom hela reprisen', (n) => {
    const plan = planRound(ids(n), 77);
    const cast = Object.fromEntries(ids(n).map((id) => [id, { name: id.toUpperCase(), color: '#ffffff' }]));
    const scene = rundanScene(plan, cast);
    expect(scene.duration).toBeCloseTo(slowmo(plan).real(plan.duration), 9);
    expect(scene.duration).toBeLessThanOrEqual(MAX_DURATION + 1e-9);
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

describe('outfit', () => {
  it.each([1, 2, 3, 4, 6, 7, 12])('%i spelare: alla klädda, ett skepp, podracers och blasters enligt antalet', (n) => {
    const o = outfit(ids(n));
    const gears = ids(n).map((id) => o[id].gear);
    const count = (g: string) => gears.filter((x) => x === g).length;
    expect(count('falcon')).toBe(n >= 2 ? 1 : 0);
    expect(count('pod')).toBe(n >= 7 ? 2 : n >= 3 ? 1 : 0);
    if (n >= 4) expect(count('blaster')).toBeGreaterThanOrEqual(1);
  });
  it('beror på id:na, inte på ordningen (placeringen)', () => {
    const a = outfit(ids(8));
    const b = outfit([...ids(8)].reverse());
    expect(b).toEqual(a);
  });
});

describe('outfit med meriter', () => {
  it('skeppet till längst regeringstid, grön sabel till mästaren, padawaner utan att ändra prylarna', () => {
    const o = outfit(ids(6), { falcon: 'p3', master: 'p4', padawans: ['p5', 'p4'] });
    expect(o.p3.gear).toBe('falcon');
    expect(Object.values(o).filter((k) => k.gear === 'falcon')).toHaveLength(1);
    expect(o.p4).toMatchObject({ gear: 'saber', master: true, padawan: false, saber: '#3dff6e' });
    expect(o.p5.padawan).toBe(true);
  });
  it('meriter för någon som inte spelade ignoreras', () => {
    const o = outfit(ids(4), { falcon: 'x', master: 'y' });
    expect(Object.values(o).filter((k) => k.gear === 'falcon')).toHaveLength(1);
    expect(Object.values(o).some((k) => k.master)).toBe(false);
  });
});

describe('finalens duell', () => {
  it('finalisterna möts framför bordet vända mot varandra, ungefär en meter isär', () => {
    for (const seed of seeds) {
      const plan = planRound(ids(6), seed);
      const s = stageAt(plan, plan.final.at + (DUEL.meet + DUEL.part) / 2);
      const [a, b] = [s.actors[plan.final.winner], s.actors[plan.final.runnerUp]];
      expect(a.pos[2]).toBeGreaterThan(TABLE.width / 2);
      expect(Math.abs(a.pos[0] - b.pos[0])).toBeGreaterThan(0.6);
      expect(Math.abs(a.pos[0] - b.pos[0])).toBeLessThan(1.4);
      // vänd mot den andra (sidled) och lite mot kameran (+z)
      expect(Math.sign(Math.sin(a.heading))).toBe(-Math.sign(a.pos[0] - b.pos[0]));
      expect(Math.cos(a.heading)).toBeGreaterThan(0.2);
    }
  });
});

describe('ultrarapid', () => {
  it.each([2, 3, 7, 12])('%i spelare: warp och real är varandras inverser och går framåt', (n) => {
    for (const seed of seeds.slice(0, 10)) {
      const plan = planRound(ids(n), seed);
      const { warp, real } = slowmo(plan);
      let prev = -1;
      for (let s = 0; s <= plan.duration; s += 0.05) {
        expect(warp(real(s))).toBeCloseTo(s, 9);
        expect(real(s)).toBeGreaterThan(prev);
        prev = real(s);
      }
      // varje utslagning går långsamt: en sekund verklig tid nära missen är mindre än en halv i scenen
      const out = plan.segments[0]?.turns.at(-1)?.at ?? plan.final.turns.at(-1)!.at;
      expect(warp(real(out) + 0.5) - out).toBeLessThan(0.25);
    }
  });
});

describe('parader', () => {
  it('bara träffar, bara av den som har sabel just då', () => {
    for (const seed of seeds) {
      const plan = planRound(ids(7), seed);
      const kit = outfit(ids(7));
      for (const x of parries(plan, kit)) {
        expect(x.kind).toBe('hit');
        expect(wieldsSaber(plan, kit, x.player, x.at)).toBe(true);
      }
    }
    const plan = planRound(ids(7), 5);
    expect(parries(plan, outfit(ids(7))).length).toBeGreaterThan(0);
  });
});

describe('droiden', () => {
  it('en tur per miss, en i taget, och bollen hämtas efter att den landat', () => {
    for (const seed of seeds.slice(0, 10)) {
      const plan = planRound(ids(6), seed);
      const trips = droidTrips(plan);
      const misses = [...plan.segments.flatMap((s) => s.turns), ...plan.final.turns].filter((x) => x.kind !== 'hit');
      expect(trips).toHaveLength(misses.length);
      trips.forEach((x, i) => {
        expect(x.pick).toBeGreaterThan(x.lands);
        if (i) expect(x.leave).toBeGreaterThanOrEqual(trips[i - 1].home);
        expect(x.ball.every(Number.isFinite)).toBe(true);
      });
      for (let t = 0; t <= plan.duration + 20; t += 0.1) {
        const d = droidAt(trips, t);
        const inside = Math.abs(d.pos[0]) < TABLE.length / 2 + 0.3 && Math.abs(d.pos[2]) < TABLE.width / 2 + 0.3;
        expect(inside, `droiden genom bordet vid ${t.toFixed(1)}`).toBe(false);
      }
    }
  });
});
