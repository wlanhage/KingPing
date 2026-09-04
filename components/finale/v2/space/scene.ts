import * as THREE from 'three';
import { buildWeave, type WeavePlayer, type WeaveTransfer } from '@/lib/domain/weave';

/**
 * Galaxens rena matte: omloppsbanor för spelarna, ljusspår mellan dem, kamerastationer
 * och warp-intensitet. Inga React- eller DOM-beroenden — allt här enhetstestas.
 *
 * Solen står i origo (tronen). Planeternas banradie följer rankingen: vinnaren närmast
 * solen, eftersom det är dit kameran ska warpa i finalen.
 */

export const ORBIT = { INNER: 6, STEP: 3.2, TILT: 0.35 } as const;

/** Sidans progress där varje station börjar. Håll i synk med planens tabell. */
export const STATION = { COLD_OPEN: 0, NUMBERS: 0.15, GALAXY: 0.35, WARP: 0.8, SUPERNOVA: 0.92 } as const;

export type Planet = {
  id: string;
  name: string;
  wins: number;
  defences: number;
  rank: number;
  radius: number;      // planetens egen storlek
  orbit: number;       // banradie
  angle: number;       // startvinkel på banan
  position: [number, number, number];
  isWinner: boolean;
};

export type Trail = {
  order: number;
  fromId: string | null;
  toId: string;
  pairIndex: number;
  curve: THREE.QuadraticBezierCurve3;
};

export type Cosmos = {
  planets: Planet[];
  trails: Trail[];
  sun: [number, number, number];
  extent: number;
};

/** Gyllene vinkeln sprider planeterna jämnt runt solen oavsett antal. */
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

function orbitPosition(orbit: number, angle: number): [number, number, number] {
  return [Math.cos(angle) * orbit, Math.sin(angle) * orbit * ORBIT.TILT, Math.sin(angle) * orbit];
}

export function buildCosmos(
  standings: { id: string; name: string; totalWins: number; rank: number }[],
  transfers: WeaveTransfer[],
  defences: Record<string, number>,
): Cosmos {
  const ranked = [...standings].sort((a, b) => a.rank - b.rank);
  const planets: Planet[] = ranked.map((p, i) => {
    const orbit = ORBIT.INNER + i * ORBIT.STEP;
    const angle = i * GOLDEN;
    return {
      id: p.id,
      name: p.name,
      wins: p.totalWins,
      defences: defences[p.id] ?? 0,
      rank: p.rank,
      radius: 0.55 + Math.min(1.1, p.totalWins * 0.06),
      orbit,
      angle,
      position: orbitPosition(orbit, angle),
      isWinner: i === 0,
    };
  });

  const byId = new Map(planets.map((p) => [p.id, p]));
  // Återanvänder vävens pairIndex-logik för att få växande bågar mellan täta par.
  const weave = buildWeave(
    planets.map((p): WeavePlayer => ({ id: p.id, name: p.name, wins: p.wins })),
    transfers,
    defences,
  );

  const trails: Trail[] = weave.curves.map((c) => {
    const from = c.fromId ? byId.get(c.fromId)?.position ?? [0, 0, 0] : [0, 0, 0];
    const to = byId.get(c.toId)?.position ?? [0, 0, 0];
    const mid = new THREE.Vector3((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2);
    // Kontrollpunkten lyfts uppåt med växande höjd per upprepat byte, så en fejd
    // blir ett knippe bågar som alla syns.
    const lift = 2.2 + c.pairIndex * 1.6;
    const ctrl = mid.clone().add(new THREE.Vector3(0, lift, 0));
    return {
      order: c.order,
      fromId: c.fromId,
      toId: c.toId,
      pairIndex: c.pairIndex,
      curve: new THREE.QuadraticBezierCurve3(new THREE.Vector3(...from), ctrl, new THREE.Vector3(...to)),
    };
  });

  const extent = planets.length ? Math.max(...planets.map((p) => p.orbit)) : ORBIT.INNER;
  return { planets, trails, sun: [0, 0, 0], extent };
}

/** Andel av spår `order` som är ritad vid galax-progress `t` (0–1 inom galaxstationen). */
export function trailProgress(order: number, total: number, t: number): number {
  if (total <= 0) return 0;
  const span = 1 / total;
  return Math.min(1, Math.max(0, (t - order * span) / (span * 0.85)));
}

/** Normaliserar sidprogress till 0–1 inom en station. */
export function stationT(progress: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (progress - start) / Math.max(0.0001, end - start)));
}

const smooth = (x: number) => x * x * (3 - 2 * x);

export type CameraPose = { position: THREE.Vector3; lookAt: THREE.Vector3; fov: number; warp: number };

/**
 * Kameran över hela sidan. `warp` (0–1) styr stjärnstreck, aberration och FOV-kick;
 * den toppar under warpstationen och faller till noll vid supernovan.
 */
export function cameraAt(progress: number, cosmos: Cosmos, winner: Planet | null): CameraPose {
  const p = Math.min(1, Math.max(0, progress));
  const R = cosmos.extent;

  const cold = stationT(p, STATION.COLD_OPEN, STATION.NUMBERS);
  const nums = stationT(p, STATION.NUMBERS, STATION.GALAXY);
  const gal = stationT(p, STATION.GALAXY, STATION.WARP);
  const warp = stationT(p, STATION.WARP, STATION.SUPERNOVA);
  const nova = stationT(p, STATION.SUPERNOVA, 1);

  const target = winner ? new THREE.Vector3(...winner.position) : new THREE.Vector3(0, 0, 0);

  // Station 1: långsam drift långt ute, blicken mot solen.
  let position = new THREE.Vector3(R * 2.6, R * 0.9, R * 3.2);
  let lookAt = new THREE.Vector3(0, 0, 0);
  let fov = 50;

  if (p >= STATION.NUMBERS) {
    // Station 2: svep runt galaxen på halva avståndet.
    const a = nums * Math.PI * 0.9;
    const d = R * (2.2 - 0.6 * smooth(nums));
    position = new THREE.Vector3(Math.sin(a) * d, R * (0.9 - 0.4 * nums), Math.cos(a) * d);
  }
  if (p >= STATION.GALAXY) {
    // Station 3: dykning in genom banorna, lägre och närmare för varje spår.
    const a = Math.PI * 0.9 + gal * Math.PI * 1.4;
    const d = R * (1.6 - 1.1 * smooth(gal));
    position = new THREE.Vector3(Math.sin(a) * d, R * (0.5 - 0.6 * Math.sin(gal * Math.PI)), Math.cos(a) * d);
    lookAt = new THREE.Vector3(0, 0, 0).lerp(target, gal * 0.6);
  }
  if (p >= STATION.WARP) {
    // Station 4: rak warp mot vinnaren, FOV vidgas.
    const from = position.clone();
    const to = target.clone().add(new THREE.Vector3(0, 1.2, 4.5));
    position = from.lerp(to, smooth(warp));
    lookAt = target.clone();
    fov = 50 + 35 * Math.sin(warp * Math.PI);
  }
  if (p >= STATION.SUPERNOVA) {
    // Station 5: backa sakta ut ur explosionen, blicken uppåt mot titeln.
    position = target.clone().add(new THREE.Vector3(0, 1.2 + nova * 2.5, 4.5 + nova * 9));
    lookAt = target.clone().add(new THREE.Vector3(0, 2.2 * nova, 0));
    fov = 50;
  }

  const warpAmount = p >= STATION.SUPERNOVA ? 0 : Math.sin(warp * Math.PI) * (p >= STATION.WARP ? 1 : 0) + cold * 0;
  return { position, lookAt, fov, warp: warpAmount };
}

/** Supernovans intensitet 0–1: snabb flamma, långsam avklingning. */
export function novaIntensity(progress: number): number {
  const t = stationT(progress, STATION.SUPERNOVA, 1);
  if (t <= 0) return 0;
  const attack = Math.min(1, t / 0.12);
  const decay = 1 - Math.max(0, (t - 0.12) / 0.88) * 0.65;
  return attack * decay;
}
