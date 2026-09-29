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
