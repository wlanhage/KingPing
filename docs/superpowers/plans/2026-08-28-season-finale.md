# Säsongsfinalen "Krönikan" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En skrollbar säsongsfinal på `/seasons/[slug]/final`: kallöppning → statresa → Kronans vandring (vävgraf med skrubbning) → vinnarkröning → epilog, med Williams intro+loop-musik, cinema-läge och en visas-en-gång-dörr på Tronsalen.

**Architecture:** All data härleds server-side i `lib/domain/finale.ts` (återanvänder säsongsscopade `getLeaderboard` m.m. — inga migrationer). Vävens geometri är ren matte i `lib/domain/weave.ts` (enhetstestad). Klienten är `components/finale/*` med GSAP ScrollTrigger/MotionPath + Lenis; ljudet är Web Audio (sömlös intro→loop). Reduced motion ger en statisk variant.

**Tech Stack:** Next.js 15 App Router, React 19, Prisma 7 (Neon — läs-endast här), GSAP + Lenis (nya deps), Web Audio API, vitest.

**Spec:** `docs/superpowers/specs/2026-08-28-season-finale-design.md`

**Verifiering i browser:** dev-servern heter `dev` (port 3030, `.claude/launch.json`). Ingen säsong är avslutad ännu — använd `?preview=1` (byggs i Task 4) för att rendera finalen för pågående `s1` mot riktig data. INGA schemaändringar och inga skrivningar mot databasen i denna feature.

---

### Task 1: Beroenden

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installera gsap och lenis**

Run: `npm install gsap lenis`
Expected: båda hamnar under dependencies, inga peer-varningar som stoppar.

- [ ] **Step 2: Verifiera att typecheck fortfarande är ren**

Run: `npx tsc --noEmit`
Expected: tom output.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add gsap and lenis for the season finale"
```

---

### Task 2: Vävgeometrin (ren matte, TDD)

**Files:**
- Create: `lib/domain/weave.ts`
- Test: `tests/weave.test.ts`

Geometrin är hjärtat i Kronans vandring: spelarkort i två kolumner, kvadratiska
Bézier-kurvor per tronskifte där upprepade byten mellan samma par får växande bågar,
och motsatt riktning får motsatt bågsida.

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// tests/weave.test.ts
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
```

- [ ] **Step 2: Kör testerna, förvänta fail**

Run: `npx vitest run tests/weave.test.ts`
Expected: FAIL — `Cannot find module '../lib/domain/weave'`.

- [ ] **Step 3: Implementera geometrin**

```ts
// lib/domain/weave.ts
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

function curvePath(x1: number, y1: number, x2: number, y2: number, pairIndex: number): string {
  const mx = (x1 + x2) / 2; const my = (y1 + y2) / 2;
  const dx = x2 - x1; const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Normalen (-dy, dx) vänder redan när färdriktningen vänder — därför INGET extra
  // riktningstecken här. Ett sådant skulle ge en andra flip som tar ut den första,
  // så båda riktningarna bågnade åt samma håll.
  const mag = 36 + pairIndex * 30;
  const cx = mx + (-dy / len) * mag; const cy = my + (dx / len) * mag;
  const r = (n: number) => Math.round(n * 10) / 10;
  // Mellanslag efter M: testets parser läser M som eget token.
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
```

- [ ] **Step 4: Kör testerna, förvänta pass**

Run: `npx vitest run tests/weave.test.ts`
Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/weave.ts tests/weave.test.ts
git commit -m "Add weave geometry for the crown journey graph"
```

---

### Task 3: Finale-summaryn (TDD på de rena delarna)

**Files:**
- Create: `lib/domain/finale.ts`
- Test: `tests/finale.test.ts`

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// tests/finale.test.ts
import { describe, expect, it } from 'vitest';
import { extractTransfers } from '../lib/domain/finale';

const E = (winnerId: string, previousKingId: string | null, i: number, note: string | null = null) => ({
  winnerId, previousKingId, occurredAt: new Date(2026, 0, 1 + i), eventType: 'NEW_KING',
  streakCount: 1, previousStreakCount: 0, announcementText: `a${i}`, note, isFridayFinal: false,
});

describe('extractTransfers', () => {
  it('första kröningen blir ett byte från tomma tronen', () => {
    const { transfers } = extractTransfers([E('calle', null, 0)]);
    expect(transfers).toHaveLength(1);
    expect(transfers[0].fromId).toBeNull();
    expect(transfers[0].toId).toBe('calle');
  });

  it('samma kung igen blir försvar, inte byte', () => {
    const { transfers, defences, timeline } = extractTransfers([E('calle', null, 0), E('calle', 'calle', 1), E('axel', 'calle', 2)]);
    expect(transfers).toHaveLength(2);
    expect(defences).toEqual({ calle: 1 });
    expect(timeline.map((t) => t.kind)).toEqual(['transfer', 'defence', 'transfer']);
  });

  it('händelser sorteras i tidsordning oavsett indata', () => {
    const { transfers } = extractTransfers([E('axel', 'calle', 5), E('calle', null, 0)]);
    expect(transfers[0].toId).toBe('calle');
  });
});
```

- [ ] **Step 2: Kör testerna, förvänta fail**

Run: `npx vitest run tests/finale.test.ts`
Expected: FAIL — modulen finns inte.

- [ ] **Step 3: Implementera summaryn**

```ts
// lib/domain/finale.ts
import { prisma } from '../prisma';
import { getLeaderboard } from './riket';
import { clampedReignMs, listSeasons, winOccurredAtFilter, type SeasonWindow } from './season';
import type { WeaveTransfer } from './weave';

export type FinaleEventRow = {
  winnerId: string; previousKingId: string | null; occurredAt: Date; eventType: string;
  streakCount: number; previousStreakCount: number | null; announcementText: string;
  note: string | null; isFridayFinal: boolean;
};

export type FinaleTimelineItem =
  | { kind: 'transfer'; transfer: WeaveTransfer }
  | { kind: 'defence'; playerId: string; occurredAt: string };

/** Delar säsongens vinster i tronskiften (kurvor) och försvar (pulser). Ren funktion. */
export function extractTransfers(events: FinaleEventRow[]): {
  transfers: WeaveTransfer[]; defences: Record<string, number>; timeline: FinaleTimelineItem[];
} {
  const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const transfers: WeaveTransfer[] = [];
  const defences: Record<string, number> = {};
  const timeline: FinaleTimelineItem[] = [];
  for (const e of sorted) {
    if (e.previousKingId === e.winnerId) {
      defences[e.winnerId] = (defences[e.winnerId] ?? 0) + 1;
      timeline.push({ kind: 'defence', playerId: e.winnerId, occurredAt: e.occurredAt.toISOString() });
    } else {
      const t: WeaveTransfer = { fromId: e.previousKingId, toId: e.winnerId, eventType: e.eventType, occurredAt: e.occurredAt.toISOString(), announcementText: e.announcementText };
      transfers.push(t);
      timeline.push({ kind: 'transfer', transfer: t });
    }
  }
  return { transfers, defences, timeline };
}

export type FinaleSummary = {
  season: { slug: string; name: string; theme: string; startedAt: string; endedAt: string | null };
  standings: Awaited<ReturnType<typeof getLeaderboard>>;
  transfers: WeaveTransfer[];
  defences: Record<string, number>;
  timeline: FinaleTimelineItem[];
  peaks: {
    longestStreak: { playerId: string; name: string; streak: number } | null;
    biggestBreak: { announcementText: string; brokenStreak: number; byName: string } | null;
  };
  wrapped: { crownings: number; transfers: number; defences: number; players: number; shortestReignMs: number | null; averageReignMs: number | null };
  notes: { text: string; byName: string }[];
  nextSeason: { name: string; theme: string } | null;
};

export async function buildFinaleSummary(season: SeasonWindow): Promise<FinaleSummary> {
  const [standings, events, reigns, seasons] = await Promise.all([
    getLeaderboard(season),
    prisma.winEvent.findMany({ where: { occurredAt: winOccurredAtFilter(season) }, orderBy: { occurredAt: 'asc' } }) as Promise<FinaleEventRow[]>,
    prisma.reign.findMany(),
    listSeasons(),
  ]);
  const name = (id: string | null | undefined) => standings.find((s) => s.id === id)?.name ?? 'okänd';
  const { transfers, defences, timeline } = extractTransfers(events);

  const topStreakEvent = [...events].sort((a, b) => b.streakCount - a.streakCount)[0] ?? null;
  const breakEvent = [...events].filter((e) => (e.previousStreakCount ?? 0) >= 2 && e.previousKingId !== e.winnerId)
    .sort((a, b) => (b.previousStreakCount ?? 0) - (a.previousStreakCount ?? 0))[0] ?? null;

  const clamped = reigns.map((r) => clampedReignMs(r, season)).filter((ms) => ms > 0);
  const wrapped = {
    crownings: events.length,
    transfers: transfers.length,
    defences: Object.values(defences).reduce((a, b) => a + b, 0),
    players: standings.length,
    shortestReignMs: clamped.length ? Math.min(...clamped) : null,
    averageReignMs: clamped.length ? Math.round(clamped.reduce((a, b) => a + b, 0) / clamped.length) : null,
  };

  const next = season.endedAt
    ? seasons.filter((s) => s.startedAt.getTime() >= season.endedAt!.getTime() && s.slug !== season.slug)
        .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())[0] ?? null
    : null;

  return {
    season: { slug: season.slug, name: season.name, theme: season.theme, startedAt: season.startedAt.toISOString(), endedAt: season.endedAt?.toISOString() ?? null },
    standings,
    transfers, defences, timeline,
    peaks: {
      longestStreak: topStreakEvent && topStreakEvent.streakCount >= 2 ? { playerId: topStreakEvent.winnerId, name: name(topStreakEvent.winnerId), streak: topStreakEvent.streakCount } : null,
      biggestBreak: breakEvent ? { announcementText: breakEvent.announcementText, brokenStreak: breakEvent.previousStreakCount ?? 0, byName: name(breakEvent.winnerId) } : null,
    },
    wrapped,
    notes: events.filter((e) => e.note?.trim()).map((e) => ({ text: e.note!.trim(), byName: name(e.winnerId) })),
    nextSeason: next ? { name: next.name, theme: next.theme } : null,
  };
}
```

- [ ] **Step 4: Kör alla tester + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: alla gröna (40 gamla + 7 väv + 3 nya), tom tsc-output.

- [ ] **Step 5: Commit**

```bash
git add lib/domain/finale.ts tests/finale.test.ts
git commit -m "Add finale summary builder on top of season-scoped data"
```

---

### Task 4: Route, pågår-ännu-vakt och preview-flagga

**Files:**
- Create: `app/seasons/[slug]/final/page.tsx`
- Create: `components/finale/SeasonFinale.tsx` (minimal shell, byggs ut i Task 7)

- [ ] **Step 1: Skapa server-sidan**

```tsx
// app/seasons/[slug]/final/page.tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildFinaleSummary } from '@/lib/domain/finale';
import { getSeasonBySlug } from '@/lib/domain/season';
import { SeasonFinale } from '@/components/finale/SeasonFinale';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const season = await getSeasonBySlug((await params).slug);
  return { title: season ? `Krönikan · ${season.name}` : 'Krönikan' };
}

export default async function FinalePage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const season = await getSeasonBySlug(slug);
  if (!season) notFound();

  // ?preview=1 låter oss rendera finalen för en pågående säsong under utveckling
  // (fönstret klipps då vid "nu"). Utan flaggan är pågående säsonger låsta.
  if (!season.endedAt && sp.preview !== '1') {
    return (
      <main className='page-stack'>
        <section className='card finale-ongoing'>
          <h1 className='title-xl'>Säsongen pågår ännu</h1>
          <p className='subtitle'>Krönikan för {season.name} skrivs medan ni spelar. Den slås upp när säsongen avslutas.</p>
          <p><Link className='btn' href='/'>Tillbaka till tronsalen</Link></p>
        </section>
      </main>
    );
  }

  const summary = await buildFinaleSummary(season);
  return <SeasonFinale summary={summary} cinema={sp.cinema === '1'} />;
}
```

- [ ] **Step 2: Skapa den minimala klientshellen**

```tsx
// components/finale/SeasonFinale.tsx
'use client';
import type { FinaleSummary } from '@/lib/domain/finale';

// Minimal shell — byggs ut med Lenis/GSAP, akter och ljud i senare tasks.
export function SeasonFinale({ summary, cinema }: { summary: FinaleSummary; cinema: boolean }) {
  return (
    <div className='finale'>
      <section className='finale-act'>
        <h1 className='title-xl'>{summary.season.name}</h1>
        <p className='subtitle'>{summary.wrapped.crownings} kröningar · {summary.wrapped.players} spelare {cinema ? '· cinema' : ''}</p>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verifiera i browser**

Starta preview-servern `dev`. Kontrollera:
- `http://localhost:3030/seasons/s1/final` → "Säsongen pågår ännu"-vyn.
- `http://localhost:3030/seasons/s1/final?preview=1` → shellen med riktiga siffror.
- `http://localhost:3030/seasons/finns-ej/final` → 404.

- [ ] **Step 4: Commit**

```bash
git add app/seasons components/finale/SeasonFinale.tsx
git commit -m "Add finale route with ongoing-season guard and dev preview flag"
```

---

### Task 5: Dörren och återse-länken på Tronsalen

**Files:**
- Create: `components/finale/FinaleDoor.tsx`
- Modify: `app/page.tsx` (hämta senaste avslutade säsong, montera dörr + länk)
- Modify: `app/globals.css` (dörrens stilar)

- [ ] **Step 1: Skapa dörren**

```tsx
// components/finale/FinaleDoor.tsx
'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const seenKey = (slug: string) => `kp-finale-seen-${slug}`;

/**
 * Helskärmsdörr som visas EN gång per avslutad säsong och webbläsare.
 * Båda knapparna sätter seen-flaggan — dörren tjatar aldrig. Klicket på
 * "Träd in" är också användargesten som senare tillåter ljud i finalen.
 */
export function FinaleDoor({ slug, name }: { slug: string; name: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try { if (!window.localStorage.getItem(seenKey(slug))) setShow(true); } catch {}
  }, [slug]);

  function markSeen() {
    try { window.localStorage.setItem(seenKey(slug), '1'); } catch {}
    setShow(false);
  }

  if (!show) return null;
  return (
    <div className='finale-door' role='dialog' aria-modal='true' aria-label='Säsongen är över'>
      <div className='finale-door-panel'>
        <p className='finale-door-eyebrow'>Hör upp</p>
        <h2 className='finale-door-title'>{name} är över</h2>
        <p className='finale-door-sub'>Krönikan är skriven. Träd in och se hur kronan vandrade.</p>
        <div className='finale-door-actions'>
          <button type='button' className='btn-ghost' onClick={markSeen}>Inte nu</button>
          <Link href={`/seasons/${slug}/final`} className='crown-btn' onClick={markSeen}>Träd in i krönikan</Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Montera på Tronsalen**

I `app/page.tsx`: lägg till importer och hämta senaste avslutade säsong.

```tsx
import { listSeasons } from '@/lib/domain/season';
import { FinaleDoor } from '@/components/finale/FinaleDoor';
```

I komponentkroppen (efter `const kingdom = ...`):

```tsx
  const seasons = await listSeasons();
  const endedSeason = seasons.filter((s) => s.endedAt).sort((a, b) => b.endedAt!.getTime() - a.endedAt!.getTime())[0] ?? null;
```

Sist i `<main>` (efter kröningspanelen):

```tsx
      {endedSeason && (
        <>
          <p className='finale-rewatch'>
            <Link href={`/seasons/${endedSeason.slug}/final`}>📜 Återse krönikan · {endedSeason.name}</Link>
          </p>
          <FinaleDoor slug={endedSeason.slug} name={endedSeason.name} />
        </>
      )}
```

(`Link` importeras redan inte i filen — lägg till `import Link from 'next/link';`.)

- [ ] **Step 3: CSS för dörren**

Lägg sist i `app/globals.css`:

```css
/* ─────────────────────────  SÄSONGSFINALEN: dörr + återse  ───────────────────────── */
.finale-door { position: fixed; inset: 0; z-index: 130; display: grid; place-items: center; padding: 1rem; background: rgba(3, 4, 8, .9); backdrop-filter: blur(6px); }
.finale-door-panel { max-width: 480px; text-align: center; padding: 2.2rem 1.8rem; border: 1px solid var(--border); border-top: 2px solid rgba(231, 194, 92, .55); border-radius: 18px; background: var(--panel); box-shadow: 0 30px 90px rgba(0, 0, 0, .6); }
.finale-door-eyebrow { margin: 0; letter-spacing: .24em; text-transform: uppercase; font-size: .75rem; color: var(--muted); font-family: var(--font-display), Georgia, serif; }
.finale-door-title { margin: .4rem 0 .5rem; font-family: var(--font-title), Georgia, serif; font-size: clamp(1.6rem, 5vw, 2.4rem); color: var(--gold); }
.finale-door-sub { margin: 0 0 1.4rem; color: var(--muted); line-height: 1.5; }
.finale-door-actions { display: flex; gap: .6rem; justify-content: center; flex-wrap: wrap; }
.finale-rewatch { text-align: center; }
.finale-rewatch a { color: var(--muted); }
.finale-rewatch a:hover { color: var(--gold); }
```

- [ ] **Step 4: Verifiera i browser**

Ingen säsong är avslutad → Tronsalen ska se ut exakt som innan (ingen dörr, ingen länk).
Verifiera även att typecheck är ren: `npx tsc --noEmit`.
Dörrens flöde aktiveras först vid ett riktigt säsongsslut; logiken är trivial nog att
granskas i kod (visas bara utan flagga, båda knapparna sätter flaggan).

- [ ] **Step 5: Commit**

```bash
git add components/finale/FinaleDoor.tsx app/page.tsx app/globals.css
git commit -m "Add once-per-season finale door and rewatch link on the throne room"
```

---

### Task 6: Ljudmotorn — intro en gång, sedan sömlös loop

**Files:**
- Create: `components/finale/finale-audio.ts`
- Test: `tests/finale-audio.test.ts`

- [ ] **Step 1: Skriv fallerande test för källupplösningen**

```ts
// tests/finale-audio.test.ts
import { describe, expect, it } from 'vitest';
import { resolveFinaleAudioSources } from '../components/finale/finale-audio';

describe('resolveFinaleAudioSources', () => {
  it('säsongsvariant har företräde före standardfilen', () => {
    const s = resolveFinaleAudioSources('s1');
    expect(s.intro).toEqual(['/audio/finale-intro-s1.mp3', '/audio/finale-intro.mp3']);
    expect(s.loop).toEqual(['/audio/finale-loop-s1.mp3', '/audio/finale-loop.mp3']);
  });
});
```

Run: `npx vitest run tests/finale-audio.test.ts` — Expected: FAIL (modul saknas).

- [ ] **Step 2: Implementera motorn**

```ts
// components/finale/finale-audio.ts
'use client';

/**
 * Finalens musik: ett intro som spelas en gång och därefter en loop tills sidan
 * lämnas eller ljudet mutas. Sömlösheten kräver Web Audio — <audio loop> har
 * hörbara glapp. Loopkällan schemaläggs sample-exakt vid introts slut.
 * Saknas filerna (404) körs finalen tyst utan fel.
 */

const MUTE_KEY = 'kp-finale-muted';

export function resolveFinaleAudioSources(slug: string) {
  return {
    intro: [`/audio/finale-intro-${slug}.mp3`, '/audio/finale-intro.mp3'],
    loop: [`/audio/finale-loop-${slug}.mp3`, '/audio/finale-loop.mp3'],
  };
}

export type FinaleAudio = {
  start: () => Promise<void>;
  stop: () => void;
  setMuted: (muted: boolean) => void;
  isMutedInitially: () => boolean;
  /** Intro + två loopvarv, för cinema-lägets tempo. null tills filerna laddats. */
  suggestedSeconds: () => number | null;
};

export function createFinaleAudio(slug: string): FinaleAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let started = false;
  let hidden = false;
  let muted = false;
  let durations: { intro: number; loop: number } | null = null;

  const gainTarget = () => (muted ? 0 : hidden ? 0.12 : 0.7);
  const applyGain = () => {
    if (ctx && master) master.gain.linearRampToValueAtTime(gainTarget(), ctx.currentTime + 0.25);
  };

  async function fetchBuffer(c: AudioContext, urls: string[]): Promise<AudioBuffer | null> {
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        return await c.decodeAudioData(await res.arrayBuffer());
      } catch { /* prova nästa källa */ }
    }
    return null;
  }

  const onVisibility = () => { hidden = document.hidden; applyGain(); };

  return {
    isMutedInitially() {
      try { muted = window.localStorage.getItem(MUTE_KEY) === '1'; } catch {}
      return muted;
    },
    async start() {
      if (started) return;
      started = true;
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = gainTarget();
      master.connect(ctx.destination);
      document.addEventListener('visibilitychange', onVisibility);
      const src = resolveFinaleAudioSources(slug);
      const [intro, loop] = await Promise.all([fetchBuffer(ctx, src.intro), fetchBuffer(ctx, src.loop)]);
      if (!ctx) return; // stop() hann köras under laddningen
      durations = { intro: intro?.duration ?? 0, loop: loop?.duration ?? 0 };
      const t0 = ctx.currentTime + 0.08;
      if (intro) {
        const s = ctx.createBufferSource();
        s.buffer = intro; s.connect(master); s.start(t0);
      }
      if (loop) {
        const s = ctx.createBufferSource();
        s.buffer = loop; s.loop = true; s.connect(master);
        s.start(t0 + (intro?.duration ?? 0)); // sample-exakt vid introts slut
      }
    },
    stop() {
      document.removeEventListener('visibilitychange', onVisibility);
      void ctx?.close().catch(() => {});
      ctx = null; master = null;
    },
    setMuted(m: boolean) {
      muted = m;
      try { window.localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch {}
      applyGain();
    },
    suggestedSeconds() {
      if (!durations || (durations.intro === 0 && durations.loop === 0)) return null;
      return Math.min(180, Math.max(60, durations.intro + durations.loop * 2));
    },
  };
}
```

- [ ] **Step 3: Kör test + typecheck**

Run: `npx vitest run tests/finale-audio.test.ts && npx tsc --noEmit`
Expected: 1 passed, tom tsc-output.

- [ ] **Step 4: Commit**

```bash
git add components/finale/finale-audio.ts tests/finale-audio.test.ts
git commit -m "Add finale audio engine: intro once, seamless Web Audio loop"
```

---

### Task 7: SeasonFinale-roten — start-cover, Lenis + GSAP, reduced motion, bas-CSS

**Files:**
- Modify: `components/finale/SeasonFinale.tsx` (ersätt shellen helt)
- Modify: `app/globals.css` (finalens bas-stilar)

**Beslut som kodas här:** covern visas ALLTID (även efter dörren) — klicket på covern är
den lokala användargesten som startar ljudet, vilket gör flödet robust oavsett hur man
kom till sidan. Lenis + ScrollTrigger kopplas via det kända mönstret; allt städas i
`ctx.revert()`/`lenis.destroy()` vid unmount.

- [ ] **Step 1: Ersätt SeasonFinale med den riktiga roten**

```tsx
// components/finale/SeasonFinale.tsx
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';
import type { FinaleSummary } from '@/lib/domain/finale';
import { getTheme, themeCssVars } from '@/lib/theme';
import { createFinaleAudio } from './finale-audio';
import { ColdOpen } from './ColdOpen';
import { NumbersAct } from './NumbersAct';
import { CrownWeave } from './CrownWeave';
import { Epilogue } from './Epilogue';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);

export function SeasonFinale({ summary, cinema }: { summary: FinaleSummary; cinema: boolean }) {
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [reduced, setReduced] = useState(false);
  const audioRef = useRef<ReturnType<typeof createFinaleAudio> | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const cinemaTween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const audio = createFinaleAudio(summary.season.slug);
    audioRef.current = audio;
    setMuted(audio.isMutedInitially());
    return () => audio.stop();
  }, [summary.season.slug]);

  // Lenis + ScrollTrigger-koppling. Startas först efter covern så sidan ligger still.
  useEffect(() => {
    if (!started || reduced) return;
    const lenis = new Lenis({ lerp: 0.12 });
    lenisRef.current = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [started, reduced]);

  function begin() {
    setStarted(true);
    void audioRef.current?.start();
    if (cinema && !reduced) {
      // Autoskroll för TV:n: hela resan i lagom takt; avbryts av all interaktion.
      window.setTimeout(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const secs = audioRef.current?.suggestedSeconds() ?? 90;
        const proxy = { y: window.scrollY };
        cinemaTween.current = gsap.to(proxy, {
          y: max, duration: secs, ease: 'none',
          onUpdate: () => lenisRef.current?.scrollTo(proxy.y, { immediate: true }),
        });
        const stop = () => { cinemaTween.current?.kill(); cinemaTween.current = null; };
        window.addEventListener('wheel', stop, { once: true });
        window.addEventListener('pointerdown', stop, { once: true });
        window.addEventListener('keydown', (e) => { if (e.key === ' ') stop(); }, { once: true });
      }, 800);
    }
  }

  function toggleMute() {
    setMuted((m) => { audioRef.current?.setMuted(!m); return !m; });
  }

  const acts = useMemo(() => ({ summary, reduced }), [summary, reduced]);
  // Finalen renderas i SIN säsongs tema, inte det aktiva (spec-krav): säsongens
  // tema-variabler sätts på wrappern och vinner därmed över layoutens <html>-vars.
  const seasonVars = useMemo(() => themeCssVars(getTheme(summary.season.theme).colors) as React.CSSProperties, [summary.season.theme]);

  return (
    <div className='finale' style={seasonVars} data-reduced={reduced || undefined} data-started={started || undefined}>
      {!started && (
        <div className='finale-cover'>
          <p className='finale-door-eyebrow'>Krönikan</p>
          <h1 className='finale-cover-title'>{summary.season.name}</h1>
          <button type='button' className='crown-btn' onClick={begin}>Träd in</button>
          <p className='finale-cover-hint'>Skrolla dig genom säsongen{cinema ? ' — eller luta dig tillbaka' : ''}.</p>
        </div>
      )}
      {started && (
        <>
          <ColdOpen {...acts} />
          <NumbersAct {...acts} />
          <CrownWeave {...acts} />
          <Epilogue {...acts} />
          <button type='button' className='finale-mute' onClick={toggleMute} aria-pressed={muted}>
            {muted ? '🔇' : '🔊'}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Skapa tomma akt-komponenter så bygget går igenom**

Skapa fyra filer med samma mönster (fylls i Task 8–13):

```tsx
// components/finale/ColdOpen.tsx
'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function ColdOpen({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act finale-coldopen' data-act='coldopen'><h1 className='finale-cover-title'>{summary.season.name}</h1></section>;
}
```

```tsx
// components/finale/NumbersAct.tsx
'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function NumbersAct({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act' data-act='numbers'><p className='subtitle'>{summary.wrapped.crownings} kröningar</p></section>;
}
```

```tsx
// components/finale/CrownWeave.tsx
'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function CrownWeave({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act' data-act='weave'><p className='subtitle'>{summary.transfers.length} tronskiften</p></section>;
}
```

```tsx
// components/finale/Epilogue.tsx
'use client';
import type { FinaleSummary } from '@/lib/domain/finale';
export function Epilogue({ summary }: { summary: FinaleSummary; reduced: boolean }) {
  return <section className='finale-act' data-act='epilogue'><p className='subtitle'>{summary.standings.length} riddare</p></section>;
}
```

- [ ] **Step 3: Bas-CSS**

Lägg sist i `app/globals.css`:

```css
/* Finalens grundlayout */
.finale { position: relative; }
.finale-act { min-height: 100vh; display: grid; place-items: center; padding: 2rem 1rem; text-align: center; }
.finale-cover { position: fixed; inset: 0; z-index: 120; display: grid; place-content: center; gap: 1rem; text-align: center; background: radial-gradient(circle at 50% 30%, rgba(231, 194, 92, .1), rgba(3, 4, 8, .97) 65%); }
.finale-cover-title { margin: 0; font-family: var(--font-title), Georgia, serif; font-size: clamp(2.2rem, 8vw, 4.4rem); color: var(--gold); text-shadow: 0 0 34px rgba(231, 194, 92, .5); }
.finale-cover-hint { color: var(--muted); font-size: .85rem; }
.finale-mute { position: fixed; right: 14px; bottom: 14px; z-index: 110; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border); background: var(--panel); color: var(--text); cursor: pointer; font-size: 1.1rem; }
.finale-mute:hover { border-color: rgba(231, 194, 92, .6); }
```

- [ ] **Step 4: Verifiera i browser**

`/seasons/s1/final?preview=1`: covern visas → "Träd in" → akterna staplas, mute-knapp
nere till höger, skroll är mjuk (Lenis). Konsolen fri från fel (ljudfiler saknas =
tyst, inga errors). `npx tsc --noEmit` ren.

- [ ] **Step 5: Commit**

```bash
git add components/finale app/globals.css
git commit -m "Add finale shell: start cover, Lenis+GSAP wiring, audio hookup, cinema autoscroll"
```

---

### Task 8: Akt 1 — kallöppningen

**Files:**
- Modify: `components/finale/ColdOpen.tsx` (ersätt helt)
- Modify: `app/globals.css`

- [ ] **Step 1: Implementera akten**

```tsx
// components/finale/ColdOpen.tsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { FinaleSummary } from '@/lib/domain/finale';

export function ColdOpen({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const from = new Date(summary.season.startedAt).toLocaleDateString('sv-SE');
  const to = summary.season.endedAt ? new Date(summary.season.endedAt).toLocaleDateString('sv-SE') : 'nu';

  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=1400', pin: true, scrub: 0.5 } })
        .from('.coldopen-title', { autoAlpha: 0, y: 40, duration: 1 })
        .from('.coldopen-dates', { autoAlpha: 0, duration: 0.6 }, '>-0.2')
        .from('.coldopen-line', { autoAlpha: 0, y: 24, stagger: 0.5, duration: 0.8 })
        .to({}, { duration: 0.6 });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} className='finale-act finale-coldopen' data-act='coldopen'>
      <div>
        <h1 className='finale-cover-title coldopen-title'>{summary.season.name}</h1>
        <p className='coldopen-dates'>{from} — {to}</p>
        <p className='coldopen-line'>{summary.wrapped.crownings} kröningar.</p>
        <p className='coldopen-line'>{summary.wrapped.players} riddare.</p>
        <p className='coldopen-line coldopen-throne'>En tron.</p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: CSS**

```css
.finale-coldopen { background: #030407; }
.coldopen-dates { color: var(--muted); letter-spacing: .18em; }
.coldopen-line { font-family: var(--font-display), Georgia, serif; font-size: clamp(1.2rem, 3.4vw, 1.9rem); margin: .5rem 0; }
.coldopen-throne { color: var(--gold); }
```

- [ ] **Step 3: Verifiera i browser**

Akten pinnas; skroll tonar in rubrik → datum → tre rader i tur och ordning; baklänges-skroll spolar tillbaka.

- [ ] **Step 4: Commit**

```bash
git add components/finale/ColdOpen.tsx app/globals.css
git commit -m "Add finale act 1: cold open"
```

---

### Task 9: Akt 3 — resan i siffror

**Files:**
- Modify: `components/finale/NumbersAct.tsx` (ersätt helt)
- Modify: `app/globals.css`

Tre pinnade moment: streakberget (med `coro-dragon`-drakarna som redan finns i CSS),
största störtandet (riktigt utrop), wrapped-räknare. Moment utan data hoppas över.

- [ ] **Step 1: Implementera akten**

```tsx
// components/finale/NumbersAct.tsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { FinaleSummary } from '@/lib/domain/finale';
import { formatDuration } from '@/lib/format';

export function NumbersAct({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const { peaks, wrapped, notes } = summary;

  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.numbers-panel').forEach((panel) => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: panel, start: 'top top', end: '+=1200', pin: true, scrub: 0.5 } });
        tl.from(panel.querySelectorAll('.numbers-reveal'), { autoAlpha: 0, y: 30, stagger: 0.4, duration: 0.8 });
        panel.querySelectorAll<HTMLElement>('.numbers-counter').forEach((el) => {
          const target = Number(el.dataset.target ?? '0');
          const obj = { v: 0 };
          tl.to(obj, { v: target, duration: 1, snap: { v: 1 }, onUpdate: () => { el.textContent = String(Math.round(obj.v)); } }, '<');
        });
        tl.from(panel.querySelectorAll('.coro-dragon'), { x: '-20vw', autoAlpha: 0, stagger: 0.2, duration: 0.8 }, '<');
        tl.to({}, { duration: 0.5 });
      });
    }, ref);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <section ref={ref} className='finale-numbers' data-act='numbers'>
      {peaks.longestStreak && (
        <div className='finale-act numbers-panel numbers-mountain'>
          <div>
            {[0, 1, 2].map((i) => <span key={i} className='coro-dragon numbers-dragon' style={{ top: `${14 + i * 12}%` }} aria-hidden>🐉</span>)}
            <p className='numbers-reveal coldopen-dates'>Säsongens längsta välde</p>
            <h2 className='numbers-reveal finale-cover-title'>{peaks.longestStreak.name}</h2>
            <p className='numbers-reveal numbers-big'><span className='numbers-counter' data-target={peaks.longestStreak.streak}>0</span> raka vinster</p>
          </div>
        </div>
      )}
      {peaks.biggestBreak && (
        <div className='finale-act numbers-panel numbers-break'>
          <div>
            <p className='numbers-reveal coldopen-dates'>Det stora störtandet</p>
            <p className='numbers-reveal numbers-quote'>&ldquo;{peaks.biggestBreak.announcementText.split('\n').pop()}&rdquo;</p>
            <p className='numbers-reveal'>En dynasti på <span className='numbers-counter numbers-big' data-target={peaks.biggestBreak.brokenStreak}>0</span> föll för {peaks.biggestBreak.byName}.</p>
          </div>
        </div>
      )}
      <div className='finale-act numbers-panel'>
        <div>
          <p className='numbers-reveal coldopen-dates'>Säsongen i siffror</p>
          <dl className='numbers-grid'>
            <div className='numbers-reveal'><dt>Tronskiften</dt><dd><span className='numbers-counter' data-target={wrapped.transfers}>0</span></dd></div>
            <div className='numbers-reveal'><dt>Försvar</dt><dd><span className='numbers-counter' data-target={wrapped.defences}>0</span></dd></div>
            {wrapped.shortestReignMs !== null && <div className='numbers-reveal'><dt>Kortaste regering</dt><dd>{formatDuration(wrapped.shortestReignMs)} 💀</dd></div>}
            {wrapped.averageReignMs !== null && <div className='numbers-reveal'><dt>Snittregering</dt><dd>{formatDuration(wrapped.averageReignMs)}</dd></div>}
          </dl>
          {notes.length > 0 && (
            <p className='numbers-reveal numbers-note'>&ldquo;{notes[notes.length - 1].text}&rdquo; — {notes[notes.length - 1].byName}</p>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: CSS**

```css
.numbers-panel { position: relative; overflow: hidden; }
.numbers-dragon { position: absolute; left: 8%; font-size: clamp(2rem, 5vw, 3rem); filter: drop-shadow(0 0 12px rgba(231, 100, 40, .55)); }
.numbers-big { font-family: var(--font-display), Georgia, serif; font-size: clamp(1.6rem, 5vw, 2.6rem); color: var(--gold); }
.numbers-quote { max-width: 34ch; margin: .6rem auto; font-style: italic; font-size: clamp(1.1rem, 3vw, 1.5rem); line-height: 1.5; }
.numbers-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; max-width: 640px; margin: 1.2rem auto; }
.numbers-grid dt { color: var(--muted); font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; }
.numbers-grid dd { margin: .2rem 0 0; font-size: 1.6rem; font-weight: 700; color: var(--gold); }
.numbers-note { color: var(--muted); font-style: italic; }
```

- [ ] **Step 3: Verifiera i browser + typecheck**

Panelerna pinnas i tur och ordning, räknarna tickar med skrollen, drakarna flyger in på
streakberget. `npx tsc --noEmit` ren.

- [ ] **Step 4: Commit**

```bash
git add components/finale/NumbersAct.tsx app/globals.css
git commit -m "Add finale act 3: season in numbers"
```

---

### Task 10: Väven — statisk SVG-rendering

**Files:**
- Modify: `components/finale/CrownWeave.tsx` (ersätt helt)
- Modify: `app/globals.css`

Först hela vävens statiska utseende (kort, tron, kurvor, krona, räknare). Uppspelning
i Task 11, vinnarsekvens i Task 12.

- [ ] **Step 1: Implementera den statiska väven**

```tsx
// components/finale/CrownWeave.tsx
'use client';
import { useMemo, useRef, useState } from 'react';
import type { FinaleSummary } from '@/lib/domain/finale';
import { buildWeave, WEAVE } from '@/lib/domain/weave';

export function CrownWeave({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const rootRef = useRef<HTMLElement | null>(null);
  const layout = useMemo(() => buildWeave(
    summary.standings.map((s) => ({ id: s.id, name: s.name, wins: s.totalWins })),
    summary.transfers,
    summary.defences,
  ), [summary]);
  const winner = summary.standings[0] ?? null;
  const [, setCoronate] = useState(false); // används i Task 12

  return (
    <section ref={rootRef} className='finale-act finale-weave' data-act='weave'>
      <div className='weave-stage'>
        <p className='coldopen-dates weave-heading'>Kronans vandring</p>
        <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className='weave-svg' role='img' aria-label='Kronans vandring genom säsongen'>
          <g className='weave-throne'>
            <rect x={layout.throne.x - 60} y={layout.throne.y - 56} width={120} height={44} rx={6} />
            <text x={layout.throne.x} y={layout.throne.y - 34} textAnchor='middle' dominantBaseline='central'>Tronen</text>
          </g>
          {layout.curves.map((c) => (
            <path key={c.order} className='weave-curve' data-order={c.order} d={c.d} data-to={c.toId} data-from={c.fromId ?? ''} />
          ))}
          {layout.cards.map((card) => (
            <g key={card.id} className={`weave-card${winner && card.id === winner.id ? ' is-winner' : ''}`} data-player={card.id} data-side={card.side}>
              <rect x={card.x} y={card.y} width={WEAVE.CARD_W} height={WEAVE.CARD_H} rx={8} />
              <text className='weave-name' x={card.x + 16} y={card.y + 22} dominantBaseline='central'>{card.name}</text>
              <text className='weave-meta' x={card.x + 16} y={card.y + 44} dominantBaseline='central'>
                <tspan className='weave-wins' data-player={card.id}>{card.wins}</tspan> vinster{card.defences > 0 ? ` · 🛡 ` : ''}
                {card.defences > 0 && <tspan className='weave-shield' data-player={card.id}>{card.defences}</tspan>}
              </text>
            </g>
          ))}
          <g id='weave-crown' aria-hidden><text textAnchor='middle' dominantBaseline='central'>♛</text></g>
        </svg>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: CSS**

```css
.finale-weave { align-items: start; }
.weave-stage { width: min(1100px, 96vw); margin: 0 auto; }
.weave-heading { margin-bottom: .6rem; }
.weave-svg { width: 100%; height: auto; overflow: visible; }
.weave-throne rect { fill: none; stroke: var(--border); stroke-dasharray: 5 4; }
.weave-throne text { fill: var(--muted); font-family: var(--font-display), Georgia, serif; font-size: 15px; letter-spacing: .12em; }
.weave-curve { fill: none; stroke: var(--gold); stroke-width: 1.6; opacity: .8; }
.weave-card rect { fill: var(--panel); stroke: var(--border); }
.weave-card.is-winner rect { stroke: var(--gold); }
.weave-name { fill: var(--text); font-family: var(--font-display), Georgia, serif; font-size: 18px; font-weight: 700; }
.weave-meta { fill: var(--muted); font-size: 13px; }
#weave-crown text { font-size: 26px; fill: var(--gold); filter: drop-shadow(0 0 8px rgba(231, 194, 92, .8)); }
#weave-crown { opacity: 0; }
.finale[data-reduced] #weave-crown { opacity: 0; }
```

- [ ] **Step 3: Verifiera i browser**

`?preview=1`: väven visas komplett — alla kurvor ritade, fejdparet mitt emot varandra,
växande bågar mellan täta par, försvarssköldar på korten. (Kronan är dold — den hör
till uppspelningen.)

- [ ] **Step 4: Commit**

```bash
git add components/finale/CrownWeave.tsx app/globals.css
git commit -m "Add crown weave static SVG render"
```

---

### Task 11: Väven — pinnad uppspelning med skrubbning

**Files:**
- Modify: `components/finale/CrownWeave.tsx`

- [ ] **Step 1: Lägg till uppspelningseffekten**

Lägg till importerna och effekten i `CrownWeave.tsx`:

```tsx
import { useEffect } from 'react';
import gsap from 'gsap';
```

Effekt (efter `layout`-memo:n; körs inte vid reduced motion — då står väven färdigritad):

```tsx
  useEffect(() => {
    if (reduced || !rootRef.current) return;
    const ctx = gsap.context(() => {
      const svg = rootRef.current!.querySelector('svg')!;
      const pathByOrder = new Map<number, SVGPathElement>();
      svg.querySelectorAll<SVGPathElement>('.weave-curve').forEach((p) => {
        const L = p.getTotalLength();
        gsap.set(p, { strokeDasharray: L, strokeDashoffset: L });
        pathByOrder.set(Number(p.dataset.order), p);
      });
      const card = (id: string) => svg.querySelector(`.weave-card[data-player="${id}"]`);
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: rootRef.current, start: 'top top',
          end: () => `+=${summary.timeline.length * 320 + 2200}`,
          pin: true, scrub: 0.6,
        },
      });
      tl.set('#weave-crown', { opacity: 1 });
      const winsSoFar = new Map<string, number>();
      const shieldsSoFar = new Map<string, number>();
      let order = 0;
      for (const ev of summary.timeline) {
        if (ev.kind === 'transfer') {
          const p = pathByOrder.get(order)!;
          const toId = ev.transfer.toId;
          winsSoFar.set(toId, (winsSoFar.get(toId) ?? 0) + 1);
          tl.to(p, { strokeDashoffset: 0, duration: 1, ease: 'none' }, '>')
            .to('#weave-crown', { motionPath: { path: p, align: p, alignOrigin: [0.5, 0.5] }, duration: 1, ease: 'none' }, '<')
            .fromTo(card(toId), { scale: 1, transformOrigin: 'center' }, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1 }, '>')
            .set(svg.querySelector(`.weave-wins[data-player="${toId}"]`), { textContent: String(winsSoFar.get(toId)) }, '<');
          order += 1;
        } else {
          shieldsSoFar.set(ev.playerId, (shieldsSoFar.get(ev.playerId) ?? 0) + 1);
          winsSoFar.set(ev.playerId, (winsSoFar.get(ev.playerId) ?? 0) + 1);
          tl.fromTo(card(ev.playerId), { scale: 1, transformOrigin: 'center' }, { scale: 1.08, duration: 0.2, yoyo: true, repeat: 1 }, '>')
            .set(svg.querySelector(`.weave-shield[data-player="${ev.playerId}"]`), { textContent: String(shieldsSoFar.get(ev.playerId)) }, '<')
            .set(svg.querySelector(`.weave-wins[data-player="${ev.playerId}"]`), { textContent: String(winsSoFar.get(ev.playerId)) }, '<');
        }
      }
      tl.addLabel('winnerSeq'); // Task 12 hänger på här
      tl.to({}, { duration: 3 }); // luft för vinnarsekvensen
      // Startläge för räknarna: noll tills uppspelningen fyller dem.
      svg.querySelectorAll('.weave-wins').forEach((el) => { el.textContent = '0'; });
      svg.querySelectorAll('.weave-shield').forEach((el) => { el.textContent = '0'; });
    }, rootRef);
    return () => ctx.revert();
  }, [reduced, summary]);
```

- [ ] **Step 2: Verifiera i browser**

Väven pinnas. Skroll ritar kurvorna kronologiskt; kronan reser längs varje ny linje;
mottagarkortet pulserar och räknaren tickar; försvar pulserar med sköldräknare utan ny
linje. Baklängesskroll spolar tillbaka (kurvor "sugs tillbaka", räknare backar).
Reduced motion (emulera i devtools): väven står färdigritad, ingen pin.

- [ ] **Step 3: Commit**

```bash
git add components/finale/CrownWeave.tsx
git commit -m "Add scrubbed chronological playback to the crown weave"
```

---

### Task 12: Vinnarsekvensen + Coronation exakt en gång

**Files:**
- Modify: `components/finale/CrownWeave.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Lägg till vinnarpanel + sekvens + en-gångs-trigger**

I `CrownWeave.tsx`: importera Coronation och aktivera state:

```tsx
import { Coronation } from '@/components/Coronation';
```

Byt `const [, setCoronate] = useState(false);` mot:

```tsx
  const [coronate, setCoronate] = useState(false);
  const firedRef = useRef(false);
```

Efter `tl.addLabel('winnerSeq');` i effekten (ersätt `tl.to({}, { duration: 3 });`):

```tsx
      if (winner) {
        const winnerCard = card(winner.id)!;
        const others = svg.querySelectorAll(`.weave-card:not([data-player="${winner.id}"])`);
        tl.to(svg.querySelectorAll('.weave-curve'), { opacity: 0.1, duration: 0.6 }, 'winnerSeq')
          .to('#weave-crown', { opacity: 0, duration: 0.3 }, '<')
          .to(svg.querySelectorAll('.weave-card[data-side="left"]:not(.is-winner)'), { x: -340, opacity: 0.15, duration: 1 }, '>')
          .to(svg.querySelectorAll('.weave-card[data-side="right"]:not(.is-winner)'), { x: 340, opacity: 0.15, duration: 1 }, '<')
          .to(winnerCard, {
            duration: 1.2, transformOrigin: 'center',
            x: layout.width / 2 - (layout.cards.find((c) => c.id === winner.id)!.x + WEAVE.CARD_W / 2),
            y: layout.height / 2 - (layout.cards.find((c) => c.id === winner.id)!.y + WEAVE.CARD_H / 2),
            scale: 1.9,
          }, '>')
          .fromTo('.weave-winner-panel', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.8 }, '>');
        // Kröningen får bara fyras en gång per passage; backar man förbi tröskeln
        // laddas den om. (Spec: "exakt en gång per passage".)
        tl.eventCallback('onUpdate', () => {
          const pr = tl.scrollTrigger?.progress ?? 0;
          if (pr > 0.97 && !firedRef.current) { firedRef.current = true; setCoronate(true); }
          if (pr < 0.85 && firedRef.current) firedRef.current = false;
        });
        void others;
      }
```

I JSX, före `</section>`-slutet (efter `.weave-stage`):

```tsx
      {winner && (
        <div className='weave-winner-panel'>
          <p className='coldopen-dates'>Säsongens härskare</p>
          <h2 className='finale-cover-title'>{winner.name}</h2>
          <p className='weave-winner-stats'>{winner.totalWins} vinster · längsta streak {winner.longestStreak}</p>
          <div className='weave-winner-badges'>
            {winner.badges.slice(0, 6).map((b: { id: string; definition: { emoji: string; name: string; rarity: string } }) => (
              <span key={b.id} className={`badge-codex-medallion rarity-${b.definition.rarity}`} title={b.definition.name}>{b.definition.emoji}</span>
            ))}
          </div>
        </div>
      )}
      {coronate && winner && (
        <Coronation
          event={{ winnerName: winner.name, deposedName: summary.standings[1]?.name ?? null, streakCount: winner.longestStreak, isNewRuler: true }}
          onDone={() => setCoronate(false)}
        />
      )}
```

(Notera: `deposedName` = tvåan — narren roastar silvermedaljören. Medvetet.)

- [ ] **Step 2: CSS**

```css
.weave-winner-panel { position: absolute; inset: auto 0 8vh; margin: 0 auto; max-width: 520px; opacity: 0; text-align: center; pointer-events: none; }
.weave-winner-stats { color: var(--text); font-size: 1.1rem; }
.weave-winner-badges { display: flex; gap: .5rem; justify-content: center; margin-top: .6rem; }
.finale-weave { position: relative; }
.finale[data-reduced] .weave-winner-panel { opacity: 1; position: static; pointer-events: auto; margin-top: 1.4rem; }
```

- [ ] **Step 3: Verifiera i browser**

Skrolla igenom hela väven: sista linjen → linjer tonas → halvorna glider isär →
vinnarkortet växer mot mitten → panel med stats/badges → Coronation fyras (konfetti +
fanfar + roast av tvåan). Skrolla tillbaka förbi ~85 % och fram igen → Coronation fyras
igen (en gång per passage). Reduced motion: panelen synlig statiskt, ingen Coronation.

- [ ] **Step 4: Commit**

```bash
git add components/finale/CrownWeave.tsx app/globals.css
git commit -m "Add winner sequence with once-per-passage coronation"
```

---

### Task 13: Akt 6 — epilog med temareveal och eftertexter

**Files:**
- Modify: `components/Coronation.tsx` (exportera JESTER_ROASTS)
- Modify: `components/finale/Epilogue.tsx` (ersätt helt)
- Modify: `app/globals.css`

- [ ] **Step 1: Exportera roastarna**

I `components/Coronation.tsx`, ändra `const JESTER_ROASTS = [` till
`export const JESTER_ROASTS = [` (raden med kommentaren ovanför behålls).

- [ ] **Step 2: Implementera epilogen**

```tsx
// components/finale/Epilogue.tsx
'use client';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { FinaleSummary } from '@/lib/domain/finale';
import { getTheme, themeCssVars } from '@/lib/theme';
import { JESTER_ROASTS } from '@/components/Coronation';

export function Epilogue({ summary, reduced }: { summary: FinaleSummary; reduced: boolean }) {
  const ref = useRef<HTMLElement | null>(null);
  const next = summary.nextSeason;
  const revealNext = next && next.theme !== summary.season.theme;

  useEffect(() => {
    if (reduced || !ref.current) return;
    const ctx = gsap.context(() => {
      if (revealNext) {
        // Crossfadea wrapperns tema-vars (inte <html>): wrappern bär säsongens tema
        // och dess vars vinner över layoutens — se SeasonFinale.
        const vars = themeCssVars(getTheme(next!.theme).colors);
        gsap.to('.finale', { ...vars, duration: 1.6, scrollTrigger: { trigger: '.epilogue-reveal', start: 'top 70%' } });
      }
      gsap.from('.epilogue-credit', { autoAlpha: 0, y: 26, stagger: 0.25, scrollTrigger: { trigger: '.epilogue-credits', start: 'top 75%', end: 'bottom bottom', scrub: 0.5 } });
    }, ref);
    return () => ctx.revert();
  }, [reduced, revealNext, next]);

  const theme = getTheme(summary.season.theme);
  const epithet = (rank: number) =>
    rank === 1 ? theme.epithets.rank1 : rank === 2 ? theme.epithets.rank2 : rank === 3 ? theme.epithets.rank3 : theme.roles.challenger;

  return (
    <section ref={ref} className='finale-act finale-epilogue' data-act='epilogue'>
      <div>
        {revealNext && (
          <div className='epilogue-reveal'>
            <p className='coldopen-dates'>Nästa kapitel</p>
            <h2 className='finale-cover-title'>{next!.name}</h2>
            <p className='subtitle'>Profetian säger att en ny mästare ska resa sig.</p>
          </div>
        )}
        <div className='epilogue-credits'>
          {summary.standings.map((row, i) => (
            <div key={row.id} className='epilogue-credit'>
              <p className='epilogue-name'>{row.name}</p>
              <p className='epilogue-role'>{epithet(row.rank)} · {row.totalWins} vinster</p>
              {i % 3 === 2 && <p className='epilogue-roast'>&ldquo;{JESTER_ROASTS[i % JESTER_ROASTS.length].replaceAll('{name}', row.name)}&rdquo;</p>}
            </div>
          ))}
          <div className='epilogue-credit'>
            <p className='epilogue-role'>Ingen pingisboll kom till skada under denna säsong.</p>
            <p className='epilogue-role'>Vad som kröns kan aldrig dö. 👑</p>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: CSS**

```css
.finale-epilogue { padding-bottom: 30vh; }
.epilogue-reveal { margin-bottom: 18vh; }
.epilogue-credits { display: grid; gap: 3.2rem; }
.epilogue-name { margin: 0; font-family: var(--font-display), Georgia, serif; font-size: 1.5rem; }
.epilogue-role { margin: .2rem 0 0; color: var(--muted); }
.epilogue-roast { margin: .5rem 0 0; font-style: italic; color: var(--muted); max-width: 40ch; margin-inline: auto; }
```

- [ ] **Step 4: Verifiera + typecheck + alla tester**

Browser: credits tonar in i takt med skroll; ingen temareveal syns nu (ingen nästa
säsong finns — blocket hoppar över sig själv). `npx tsc --noEmit && npx vitest run` gröna.

- [ ] **Step 5: Commit**

```bash
git add components/Coronation.tsx components/finale/Epilogue.tsx app/globals.css
git commit -m "Add finale epilogue: conditional theme reveal and credits"
```

---

### Task 14: Acceptanssvep och spec-avstämning

**Files:**
- Modify: `docs/superpowers/specs/2026-08-28-season-finale-design.md` (status)

- [ ] **Step 1: Gå igenom acceptanskriterierna i specen mot appen**

Kör hela flödet i browser (`?preview=1` samt `?preview=1&cinema=1`):
- Cover → ljudstart (tyst utan filer, inga konsolfel) → alla akter → väv → kröning → epilog.
- Cinema: autoskroll hela vägen; klick/space/hjul avbryter.
- Reduced motion (devtools-emulering): statisk, komplett, läsbar.
- `/seasons/s1/final` utan preview: "pågår ännu".
- Mute-knappen togglar och minns valet efter reload.
- Finalen renderas i sin egen säsongs palett även om en annan säsong med annat tema är
  aktiv (kontrollera med `season set-theme` temporärt om det behövs, återställ efteråt).
- `npx vitest run && npx tsc --noEmit` gröna.

- [ ] **Step 2: Uppdatera specens status till Genomförd (v1) med eventuella avvikelser noterade**

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-08-28-season-finale-design.md
git commit -m "Mark finale spec as implemented (v1)"
```

---

## Kvarstår utanför planen (medvetet)

- Williams musikexport: `finale-intro.mp3` + `finale-loop.mp3` läggs i `public/audio/`
  när Audacity-projekten är klara — allt fungerar tyst tills dess.
- v2-akterna (prologen, prisgalan), sonifiering, spelarkort/Slack-post.
- Merge av `seasonhandler` till `main` — beslutas separat.
