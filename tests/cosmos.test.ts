import { describe, expect, it } from 'vitest';
import { buildCosmos, cameraAt, departureT, novaIntensity, ORBIT, STATION, stationT, trailProgress } from '../components/finale/v2/space/scene';
import type { WeaveTransfer } from '../lib/domain/weave';

const standings = [
  { id: 'axel', name: 'Axel', totalWins: 17, rank: 1 },
  { id: 'lanhage', name: 'Lanhage', totalWins: 12, rank: 2 },
  { id: 'hansson', name: 'Hansson', totalWins: 3, rank: 3 },
  { id: 'calle', name: 'Calle', totalWins: 1, rank: 4 },
  { id: 'oliver', name: 'Oliver', totalWins: 0, rank: 5 },
];
const T = (fromId: string | null, toId: string, i: number): WeaveTransfer => ({
  fromId, toId, eventType: 'NEW_KING', occurredAt: new Date(2026, 0, 1 + i).toISOString(), announcementText: `t${i}`,
});
const transfers = [T(null, 'calle', 0), T('calle', 'axel', 1), T('axel', 'lanhage', 2), T('lanhage', 'axel', 3), T('axel', 'lanhage', 4)];

describe('buildCosmos', () => {
  const c = buildCosmos(standings, transfers, { axel: 4 });

  it('en planet per spelare, ett spår per tronskifte', () => {
    expect(c.planets).toHaveLength(5);
    expect(c.trails).toHaveLength(5);
  });

  it('vinnaren har innersta banan och är markerad', () => {
    const winner = c.planets.find((p) => p.isWinner)!;
    expect(winner.id).toBe('axel');
    expect(winner.orbit).toBe(ORBIT.INNER);
    expect(c.planets.filter((p) => p.isWinner)).toHaveLength(1);
  });

  it('banradien växer med rankingen', () => {
    const orbits = [...c.planets].sort((a, b) => a.rank - b.rank).map((p) => p.orbit);
    for (let i = 1; i < orbits.length; i++) expect(orbits[i]).toBeGreaterThan(orbits[i - 1]);
  });

  it('planeterna ligger på sina banradier (projicerat i XZ)', () => {
    for (const p of c.planets) {
      const r = Math.hypot(p.position[0], p.position[2]);
      expect(Math.abs(r - p.orbit)).toBeLessThan(1e-9);
    }
  });

  it('första kröningens spår utgår från solen', () => {
    const first = c.trails.find((t) => t.fromId === null)!;
    const start = first.curve.getPoint(0);
    expect(start.length()).toBeLessThan(1e-9);
  });

  it('spårets slutpunkt är mottagarens planet', () => {
    const t = c.trails.find((t) => t.toId === 'lanhage')!;
    const end = t.curve.getPoint(1);
    const planet = c.planets.find((p) => p.id === 'lanhage')!;
    expect(end.distanceTo({ x: planet.position[0], y: planet.position[1], z: planet.position[2] } as never)).toBeLessThan(1e-9);
  });

  it('upprepade byten mellan samma par lyfts högre för varje gång', () => {
    const pair = c.trails.filter((t) => [t.fromId, t.toId].sort().join('|') === 'axel|lanhage');
    expect(pair.length).toBe(3);
    const peaks = pair.map((t) => t.curve.getPoint(0.5).y);
    expect(peaks[1]).toBeGreaterThan(peaks[0]);
    expect(peaks[2]).toBeGreaterThan(peaks[1]);
  });

  it('försvar följer med på planeten', () => {
    expect(c.planets.find((p) => p.id === 'axel')!.defences).toBe(4);
  });

  it('tål tom säsong', () => {
    const empty = buildCosmos([], [], {});
    expect(empty.planets).toHaveLength(0);
    expect(empty.trails).toHaveLength(0);
    expect(Number.isFinite(empty.extent)).toBe(true);
  });
});

describe('kamera', () => {
  const c = buildCosmos(standings, transfers, {});
  const winner = c.planets.find((p) => p.isWinner)!;

  it('ändliga värden genom hela sidan', () => {
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const pose = cameraAt(p, c, winner);
      for (const v of [...pose.position.toArray(), ...pose.lookAt.toArray(), pose.fov, pose.warp]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('warp är noll före warpstationen, toppar i den och är noll vid supernovan', () => {
    expect(cameraAt(0.5, c, winner).warp).toBe(0);
    expect(cameraAt((STATION.WARP + STATION.SUPERNOVA) / 2, c, winner).warp).toBeGreaterThan(0.9);
    expect(cameraAt((STATION.SUPERNOVA + STATION.DEPARTURE) / 2, c, winner).warp).toBe(0);
  });

  it('avfärden: warpen tänds igen och kameran lämnar galaxen', () => {
    const before = cameraAt(STATION.DEPARTURE - 0.001, c, winner);
    const late = cameraAt(0.995, c, winner);
    expect(before.warp).toBe(0);
    expect(late.warp).toBeGreaterThan(0.5);
    expect(late.position.length()).toBeGreaterThan(before.position.length() * 3);
    expect(departureT(STATION.DEPARTURE)).toBe(0);
    expect(departureT(1)).toBe(1);
  });

  it('FOV vidgas under warpen', () => {
    expect(cameraAt(0.5, c, winner).fov).toBe(50);
    expect(cameraAt((STATION.WARP + STATION.SUPERNOVA) / 2, c, winner).fov).toBeGreaterThan(70);
  });

  it('kameran står nära vinnaren vid supernovan — men utanför planeten', () => {
    const end = cameraAt(STATION.SUPERNOVA, c, winner).position;
    const dist = end.distanceTo({ x: winner.position[0], y: winner.position[1], z: winner.position[2] } as never);
    expect(dist).toBeGreaterThan(winner.radius * 2);
    expect(dist).toBeLessThan(12);
  });

  it('kameran backar ut under supernovan så eftertexterna får luft', () => {
    const at = (p: number) => cameraAt(p, c, winner).position.distanceTo({ x: winner.position[0], y: winner.position[1], z: winner.position[2] } as never);
    expect(at(1)).toBeGreaterThan(at(STATION.SUPERNOVA) * 2);
  });

  it('blicken vrids åt vänster om vinnaren när eftertexterna kommer', () => {
    const early = cameraAt(STATION.SUPERNOVA + 0.005, c, winner).lookAt.x;
    const late = cameraAt(STATION.DEPARTURE - 0.005, c, winner).lookAt.x;
    expect(Math.abs(early - winner.position[0])).toBeLessThan(0.5);
    expect(late).toBeLessThan(winner.position[0] - 4);
  });

  it('kameran börjar långt utanför galaxen', () => {
    expect(cameraAt(0, c, winner).position.length()).toBeGreaterThan(c.extent * 3);
  });

  it('fungerar utan vinnare', () => {
    const pose = cameraAt(0.9, c, null);
    expect(Number.isFinite(pose.position.x)).toBe(true);
  });
});

describe('hjälpfunktioner', () => {
  it('stationT klampar till 0–1', () => {
    expect(stationT(0, 0.2, 0.4)).toBe(0);
    expect(stationT(0.3, 0.2, 0.4)).toBeCloseTo(0.5);
    expect(stationT(1, 0.2, 0.4)).toBe(1);
  });

  it('spåren ritas i ordning', () => {
    expect(trailProgress(0, 10, 0.5)).toBe(1);
    expect(trailProgress(9, 10, 0.5)).toBe(0);
    expect(trailProgress(0, 0, 0.5)).toBe(0);
  });

  it('supernovan flammar snabbt och klingar av långsamt', () => {
    expect(novaIntensity(STATION.SUPERNOVA - 0.01)).toBe(0);
    const peak = novaIntensity(STATION.SUPERNOVA + 0.025);
    const late = novaIntensity(0.96);
    expect(peak).toBeGreaterThan(0.9);
    expect(late).toBeGreaterThan(0.3);
    expect(late).toBeLessThan(peak);
  });
});
