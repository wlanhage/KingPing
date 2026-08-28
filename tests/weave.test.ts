import { describe, expect, it } from 'vitest';
import { buildWeave, type WeavePlayer, type WeaveTransfer } from '../lib/domain/weave';

const P = (id: string, wins = 0): WeavePlayer => ({ id, name: id.toUpperCase(), wins });
const T = (fromId: string | null, toId: string, i: number): WeaveTransfer => ({
  fromId, toId, eventType: 'NEW_KING', occurredAt: new Date(2026, 0, 1 + i).toISOString(), announcementText: `t${i}`,
});

const players = ['axel', 'lanhage', 'calle', 'hansson', 'aymen', 'oliver', 'holmberg'].map((p) => P(p));

describe('buildWeave', () => {
  it('en kurva per tronskifte, försvar blir inga kurvor', () => {
    const transfers = [T(null, 'calle', 0), T('calle', 'axel', 1)];
    const w = buildWeave(players, transfers, { axel: 3 });
    expect(w.curves).toHaveLength(2);
  });

  it('upprepade byten mellan samma par får växande pairIndex', () => {
    const transfers = [T('axel', 'lanhage', 0), T('lanhage', 'axel', 1), T('axel', 'lanhage', 2)];
    const w = buildWeave(players, transfers, {});
    expect(w.curves.map((c) => c.pairIndex)).toEqual([0, 1, 2]);
  });

  it('motsatta riktningar bågnar åt olika håll', () => {
    const transfers = [T('axel', 'lanhage', 0), T('lanhage', 'axel', 1)];
    const w = buildWeave(players, transfers, {});
    const cy = (d: string) => parseFloat(d.split('Q')[1].trim().split(/[ ,]+/)[1]);
    const midY = (d: string) => {
      const [m, q] = [d.split('Q')[0], d.split('Q')[1]];
      const y1 = parseFloat(m.trim().split(/[ ,]+/)[2]);
      const y2 = parseFloat(q.trim().split(/[ ,]+/)[3]);
      return (y1 + y2) / 2;
    };
    const a = cy(w.curves[0].d) - midY(w.curves[0].d);
    const b = cy(w.curves[1].d) - midY(w.curves[1].d);
    expect(a * b).toBeLessThan(0);
  });

  it('paret med flest byten hamnar på var sin sida', () => {
    const transfers = [T('axel', 'lanhage', 0), T('lanhage', 'axel', 1), T('axel', 'lanhage', 2), T('lanhage', 'calle', 3)];
    const w = buildWeave(players, transfers, {});
    const side = (id: string) => w.cards.find((c) => c.id === id)!.side;
    expect(side('axel')).not.toBe(side('lanhage'));
  });

  it('7 spelare delas 4 vänster / 3 höger', () => {
    const w = buildWeave(players, [T(null, 'axel', 0)], {});
    expect(w.cards.filter((c) => c.side === 'left')).toHaveLength(4);
    expect(w.cards.filter((c) => c.side === 'right')).toHaveLength(3);
  });

  it('första kröningen startar vid tronen', () => {
    const w = buildWeave(players, [T(null, 'calle', 0)], {});
    const x1 = parseFloat(w.curves[0].d.slice(1).trim().split(/[ ,]+/)[0]);
    expect(Math.abs(x1 - w.throne.x)).toBeLessThan(1);
  });

  it('försvarsräknare följer med på korten', () => {
    const w = buildWeave(players, [T(null, 'axel', 0)], { axel: 4 });
    expect(w.cards.find((c) => c.id === 'axel')!.defences).toBe(4);
  });
});
