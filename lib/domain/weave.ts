/**
 * Ren geometri för Kronans vandring: spelarkort i två kolumner och en kvadratisk
 * Bézier per tronskifte. Upprepade byten mellan samma (oordnade) par får växande
 * bågar; motsatt riktning bågnar åt motsatt håll. Ingen DB, inga sidoeffekter.
 */

export type WeavePlayer = { id: string; name: string; wins: number };
export type WeaveTransfer = { fromId: string | null; toId: string; eventType: string; occurredAt: string; announcementText: string };
export type WeaveCard = WeavePlayer & { side: 'left' | 'right'; slot: number; x: number; y: number; defences: number };
export type WeaveCurve = { d: string; fromId: string | null; toId: string; order: number; pairIndex: number };
export type WeaveLayout = { width: number; height: number; throne: { x: number; y: number }; cards: WeaveCard[]; curves: WeaveCurve[] };

export const WEAVE = { W: 1000, CARD_W: 200, CARD_H: 64, GAP: 32, TOP: 150, LX: 40, RX: 760, THRONE: { x: 500, y: 96 } } as const;

const pairKey = (a: string | null, b: string) => [a ?? '·throne', b].sort().join('|');

function splitSides(players: WeavePlayer[], transfers: WeaveTransfer[]): { left: string[]; right: string[] } {
  const pairCount = new Map<string, number>();
  const activity = new Map<string, number>();
  for (const t of transfers) {
    if (t.fromId) pairCount.set(pairKey(t.fromId, t.toId), (pairCount.get(pairKey(t.fromId, t.toId)) ?? 0) + 1);
    for (const id of [t.fromId, t.toId]) if (id) activity.set(id, (activity.get(id) ?? 0) + 1);
  }
  const topPair = [...pairCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0].split('|') ?? [];
  const left: string[] = [];
  const right: string[] = [];
  if (topPair.length === 2) { left.push(topPair[0]); right.push(topPair[1]); }
  const rest = players.map((p) => p.id).filter((id) => !left.includes(id) && !right.includes(id))
    .sort((a, b) => (activity.get(b) ?? 0) - (activity.get(a) ?? 0));
  for (const id of rest) (left.length <= right.length ? left : right).push(id);
  return { left, right };
}

/**
 * Kontrollpunkten läggs vinkelrätt mot färdriktningen. Normalen vänder med riktningen,
 * så ett byte tillbaka bågnar åt motsatt håll av sig självt — lägg inte till ett extra
 * riktningstecken här, det tar ut normalen och båda bågarna hamnar på samma sida.
 */
function curvePath(x1: number, y1: number, x2: number, y2: number, pairIndex: number): string {
  const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
  const dx = x2 - x1; const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const mag = 36 + pairIndex * 30;
  const cx = mx + (-dy / len) * mag; const cy = my + (dx / len) * mag;
  const r = (n: number) => Math.round(n * 10) / 10;
  return `M ${r(x1)} ${r(y1)} Q ${r(cx)} ${r(cy)} ${r(x2)} ${r(y2)}`;
}

export function buildWeave(players: WeavePlayer[], transfers: WeaveTransfer[], defences: Record<string, number>): WeaveLayout {
  const { left, right } = splitSides(players, transfers);
  const slotY = (slot: number) => WEAVE.TOP + slot * (WEAVE.CARD_H + WEAVE.GAP);
  const cards: WeaveCard[] = players.map((p) => {
    const li = left.indexOf(p.id); const ri = right.indexOf(p.id);
    const side: 'left' | 'right' = li >= 0 ? 'left' : 'right';
    const slot = li >= 0 ? li : ri;
    return { ...p, side, slot, x: side === 'left' ? WEAVE.LX : WEAVE.RX, y: slotY(slot), defences: defences[p.id] ?? 0 };
  });
  const byId = new Map(cards.map((c) => [c.id, c]));
  const anchorUse = new Map<string, number>();
  const anchor = (id: string | null): { x: number; y: number } => {
    if (!id) return WEAVE.THRONE;
    const c = byId.get(id)!;
    const n = anchorUse.get(id) ?? 0;
    anchorUse.set(id, n + 1);
    const ax = c.side === 'left' ? c.x + WEAVE.CARD_W : c.x;
    return { x: ax, y: c.y + 12 + (n % 5) * 10 };
  };
  const pairSeen = new Map<string, number>();
  const curves: WeaveCurve[] = transfers.map((t, order) => {
    const key = pairKey(t.fromId, t.toId);
    const pairIndex = pairSeen.get(key) ?? 0;
    pairSeen.set(key, pairIndex + 1);
    const from = anchor(t.fromId); const to = anchor(t.toId);
    return { d: curvePath(from.x, from.y, to.x, to.y, pairIndex), fromId: t.fromId, toId: t.toId, order, pairIndex };
  });
  const maxSlots = Math.max(left.length, right.length, 1);
  const height = Math.max(600, slotY(maxSlots - 1) + WEAVE.CARD_H + 140);
  return { width: WEAVE.W, height, throne: WEAVE.THRONE, cards, curves };
}
