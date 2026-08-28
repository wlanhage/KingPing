import * as THREE from 'three';
import { buildWeave, WEAVE, type WeaveLayout, type WeavePlayer, type WeaveTransfer } from '@/lib/domain/weave';

/**
 * Lyfter den befintliga 2D-väven till 3D. Kurvmatten återanvänds oförändrad —
 * `buildWeave` ger redan råa Bézier-punkter — och det enda som händer här är en
 * projektion till världskoordinater plus ett djup per kort.
 *
 * Rena funktioner, inga React- eller DOM-beroenden, så scenen kan testas isolerat.
 */

/** Världen är ~40 enheter bred; 2D-rymden är 1000 enheter. */
export const SCALE = 0.04;
/** Hur djupt korten sprids i Z, så kameran har något att flyga igenom. */
export const DEPTH = 9;

export type Weave3DCard = {
  id: string;
  name: string;
  wins: number;
  defences: number;
  side: 'left' | 'right';
  position: [number, number, number];
};

export type Weave3DCurve = {
  order: number;
  fromId: string | null;
  toId: string;
  pairIndex: number;
  curve: THREE.QuadraticBezierCurve3;
};

export type Weave3DScene = {
  cards: Weave3DCard[];
  curves: Weave3DCurve[];
  throne: [number, number, number];
  /** Ungefärlig radie kring origo, för kamerans avstånd. */
  radius: number;
};

/** 2D-punkt → världskoordinat. Y speglas eftersom SVG växer nedåt men världen uppåt. */
function toWorld(x: number, y: number, z: number, layout: WeaveLayout): [number, number, number] {
  return [(x - layout.width / 2) * SCALE, -(y - layout.height / 2) * SCALE, z];
}

/**
 * Djupet är deterministiskt per kort (inte slumpat), så scenen ser likadan ut
 * varje gång och kameraflygningen kan förlita sig på den.
 */
function cardDepth(side: 'left' | 'right', slot: number): number {
  const dir = side === 'left' ? -1 : 1;
  return dir * (DEPTH * 0.5) + Math.sin(slot * 1.7) * (DEPTH * 0.35);
}

export function buildWeave3D(
  players: WeavePlayer[],
  transfers: WeaveTransfer[],
  defences: Record<string, number>,
): Weave3DScene {
  const layout = buildWeave(players, transfers, defences);

  const depthById = new Map<string, number>();
  const cards: Weave3DCard[] = layout.cards.map((c) => {
    const z = cardDepth(c.side, c.slot);
    depthById.set(c.id, z);
    return {
      id: c.id,
      name: c.name,
      wins: c.wins,
      defences: c.defences,
      side: c.side,
      position: toWorld(c.x + WEAVE.CARD_W / 2, c.y + WEAVE.CARD_H / 2, z, layout),
    };
  });

  const throne = toWorld(layout.throne.x, layout.throne.y, 0, layout);

  const curves: Weave3DCurve[] = layout.curves.map((c) => {
    const z0 = c.fromId ? depthById.get(c.fromId) ?? 0 : 0;
    const z1 = depthById.get(c.toId) ?? 0;
    // Kontrollpunkten buktar ut i Z också, annars blir kurvan platt i djupled
    // och flygningen genom väven ser tam ut.
    const zCtrl = (z0 + z1) / 2 + (c.pairIndex + 1) * 1.4 * (c.pairIndex % 2 === 0 ? 1 : -1);
    const [x0, y0] = toWorld(c.from.x, c.from.y, 0, layout);
    const [xc, yc] = toWorld(c.ctrl.x, c.ctrl.y, 0, layout);
    const [x1, y1] = toWorld(c.to.x, c.to.y, 0, layout);
    return {
      order: c.order,
      fromId: c.fromId,
      toId: c.toId,
      pairIndex: c.pairIndex,
      curve: new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x0, y0, z0),
        new THREE.Vector3(xc, yc, zCtrl),
        new THREE.Vector3(x1, y1, z1),
      ),
    };
  });

  const radius = Math.max(layout.width, layout.height) * SCALE * 0.75;
  return { cards, curves, throne, radius };
}

/**
 * Kamerabana: sveper från en vid överblick, in genom väven, och ut till en
 * frontal vy där vinnaren presenteras. `t` är 0–1 över hela vävakten.
 */
export function cameraAt(t: number, radius: number): { position: THREE.Vector3; lookAt: THREE.Vector3 } {
  const clamped = Math.min(1, Math.max(0, t));
  // Tre faser: överblick (0–0.25), genomflygning (0.25–0.8), frontal final (0.8–1).
  const orbit = clamped * Math.PI * 1.15;
  const dive = Math.sin(Math.min(1, clamped / 0.8) * Math.PI) * (DEPTH * 0.9);
  const dist = radius * (2.4 - 1.5 * Math.sin(Math.min(1, clamped / 0.85) * Math.PI));
  const height = 3.5 - 6 * Math.sin(clamped * Math.PI);

  const position = new THREE.Vector3(
    Math.sin(orbit) * dist * 0.55,
    height,
    Math.cos(orbit) * dist + dive * 0.5,
  );
  // Blicken glider mot mitten när finalen närmar sig.
  const lookAt = new THREE.Vector3(0, -clamped * 1.5, 0);
  return { position, lookAt };
}

/** Hur mycket av kurva `order` som ska vara ritad vid progress `t`. 0–1. */
export function curveProgress(order: number, total: number, t: number): number {
  if (total <= 0) return 0;
  const span = 1 / total;
  const start = order * span;
  // Varje kurva ritas över sin egen lucka, med lite överlapp så flödet inte hackar.
  return Math.min(1, Math.max(0, (t - start) / (span * 0.8)));
}
