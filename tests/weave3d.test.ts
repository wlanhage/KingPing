import { describe, expect, it } from 'vitest';
import { buildWeave3D, cameraAt, curveProgress, DEPTH } from '../components/finale/weave3d/scene';
import type { WeavePlayer, WeaveTransfer } from '../lib/domain/weave';

const P = (id: string, wins = 0): WeavePlayer => ({ id, name: id, wins });
const T = (fromId: string | null, toId: string, i: number): WeaveTransfer => ({
  fromId, toId, eventType: 'NEW_KING', occurredAt: new Date(2026, 0, 1 + i).toISOString(), announcementText: `t${i}`,
});
const players = ['axel', 'lanhage', 'calle', 'hansson', 'aymen', 'oliver', 'holmberg'].map((p) => P(p));
const transfers = [T(null, 'axel', 0), T('axel', 'lanhage', 1), T('lanhage', 'axel', 2), T('axel', 'calle', 3)];

describe('buildWeave3D', () => {
  it('ett kort per spelare och en kurva per tronskifte', () => {
    const s = buildWeave3D(players, transfers, { axel: 3 });
    expect(s.cards).toHaveLength(7);
    expect(s.curves).toHaveLength(4);
  });

  it('alla koordinater är ändliga och inom rimlig rymd', () => {
    const s = buildWeave3D(players, transfers, {});
    for (const c of s.cards) {
      for (const v of c.position) {
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThan(60);
      }
    }
  });

  it('korten sprids i djupled så kameran har något att flyga igenom', () => {
    const s = buildWeave3D(players, transfers, {});
    const zs = s.cards.map((c) => c.position[2]);
    expect(Math.max(...zs) - Math.min(...zs)).toBeGreaterThan(DEPTH * 0.5);
  });

  it('vänster och höger sida hamnar på olika sidor om origo i X', () => {
    const s = buildWeave3D(players, transfers, {});
    const left = s.cards.filter((c) => c.side === 'left');
    const right = s.cards.filter((c) => c.side === 'right');
    expect(Math.max(...left.map((c) => c.position[0]))).toBeLessThan(0);
    expect(Math.min(...right.map((c) => c.position[0]))).toBeGreaterThan(0);
  });

  it('kurvans slutpunkt ligger vid mottagarens kort i X och Y', () => {
    const s = buildWeave3D(players, transfers, {});
    const curve = s.curves.find((c) => c.toId === 'lanhage')!;
    const card = s.cards.find((c) => c.id === 'lanhage')!;
    const end = curve.curve.getPoint(1);
    // Ankaret sitter på kortets kant, så tillåt halva kortbredden i avvikelse.
    expect(Math.abs(end.x - card.position[0])).toBeLessThan(5);
    expect(Math.abs(end.y - card.position[1])).toBeLessThan(3);
  });

  it('första kröningen utgår från tronen', () => {
    const s = buildWeave3D(players, transfers, {});
    const first = s.curves.find((c) => c.fromId === null)!;
    const start = first.curve.getPoint(0);
    expect(Math.abs(start.x - s.throne[0])).toBeLessThan(0.001);
    expect(Math.abs(start.y - s.throne[1])).toBeLessThan(0.001);
  });

  it('klarar en säsong utan tronskiften', () => {
    const s = buildWeave3D(players, [], {});
    expect(s.curves).toHaveLength(0);
    expect(s.cards).toHaveLength(7);
    expect(Number.isFinite(s.radius)).toBe(true);
  });
});

describe('cameraAt', () => {
  it('ger ändliga positioner över hela resan', () => {
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const { position, lookAt } = cameraAt(t, 30);
      for (const v of [position.x, position.y, position.z, lookAt.x, lookAt.y, lookAt.z]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('kameran kommer närmare väven på mitten än i början', () => {
    const start = cameraAt(0, 30).position.length();
    const mid = cameraAt(0.5, 30).position.length();
    expect(mid).toBeLessThan(start);
  });

  it('klampar utanför 0–1 i stället för att spåra ur', () => {
    expect(cameraAt(-5, 30).position.equals(cameraAt(0, 30).position)).toBe(true);
    expect(cameraAt(9, 30).position.equals(cameraAt(1, 30).position)).toBe(true);
  });
});

describe('curveProgress', () => {
  it('kurvorna ritas i tur och ordning', () => {
    // Vid t=0.5 ska tidiga kurvor vara klara och sena inte påbörjade.
    expect(curveProgress(0, 10, 0.5)).toBe(1);
    expect(curveProgress(9, 10, 0.5)).toBe(0);
  });

  it('går från 0 till 1 inom sin egen lucka', () => {
    expect(curveProgress(2, 10, 0.2)).toBe(0);
    expect(curveProgress(2, 10, 0.28)).toBeGreaterThan(0);
    expect(curveProgress(2, 10, 0.3)).toBe(1);
  });

  it('inga kurvor ger noll i stället för division med noll', () => {
    expect(curveProgress(0, 0, 0.5)).toBe(0);
  });
});
