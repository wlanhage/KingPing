import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../lib/prisma';
import { recordWin } from '../lib/domain/riket';
import { POST } from '../app/api/wins/route';
import { recordDuel } from '../lib/duel/server';

describe.runIf(process.env.KINGPING_WIN_INTEGRATION === '1')('durable round recording on disposable PostgreSQL', () => {
  const prefix = crypto.randomUUID();
  const a = `quality-a-${prefix}`, b = `quality-b-${prefix}`;
  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL ?? '');
    if (url.hostname !== '127.0.0.1' || url.pathname !== '/kingping_quality') throw new Error('Requires disposable localhost kingping_quality DB');
    // The red regression run may have left duplicate open reigns in this disposable DB.
    await prisma.reign.updateMany({ where: { endedAt: null }, data: { endedAt: new Date() } });
    await prisma.player.createMany({ data: [{ id: a, name: `Quality A ${prefix}` }, { id: b, name: `Quality B ${prefix}` }] });
  });
  afterAll(async () => { await prisma.$disconnect(); });
  it('saves the final score with the round, and a plain duel without touching the throne', async () => {
    const { win } = await recordWin(a, undefined, { requestId: crypto.randomUUID(), standings: [a, b], ignoreCooldown: true, finalScore: [11, 7] });
    expect([win.finalWinnerPoints, win.finalRunnerUpPoints]).toEqual([11, 7]);
    const reignsBefore = await prisma.reign.count();
    const requestId = crypto.randomUUID();
    const duel = await recordDuel({ winnerId: b, loserId: a, winnerPoints: 11, loserPoints: 9, requestId });
    expect(await recordDuel({ winnerId: b, loserId: a, winnerPoints: 11, loserPoints: 9, requestId })).toEqual(duel);
    await expect(recordDuel({ winnerId: a, loserId: b, requestId })).rejects.toMatchObject({ status: 409 });
    expect(await prisma.reign.count()).toBe(reignsBefore);
    expect(await prisma.duel.count({ where: { requestId } })).toBe(1);
  });
  it('replays a concurrent duplicate exactly once including the announcement and audit', async () => {
    const requestId = crypto.randomUUID();
    const before = await prisma.auditLog.count({ where: { action: 'WIN_RECORDED' } });
    const results = await Promise.all([
      recordWin(a, 'Nice', { requestId, standings: [a, b], ignoreCooldown: true }),
      recordWin(a, 'Nice', { requestId, standings: [a, b], ignoreCooldown: true }),
    ]);
    expect(results[0].win.id).toBe(results[1].win.id);
    expect(results[0].a.id).toBe(results[1].a.id);
    expect(results.filter((r) => r.replayed)).toHaveLength(1);
    expect(await prisma.winEvent.count({ where: { requestId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'WIN_RECORDED' } })).toBe(before + 1);
    await expect(recordWin(b, 'Nice', { requestId, standings: [b, a], ignoreCooldown: true })).rejects.toMatchObject({ status: 409 });
  });
  it('returns the original result on retry during cooldown even after the winner goes AFK', async () => {
    const requestId = crypto.randomUUID();
    const saved = await recordWin(a, '', { requestId, standings: [a, b], ignoreCooldown: true });
    await recordWin(b, undefined, { ignoreCooldown: true });
    await prisma.player.update({ where: { id: a }, data: { isActive: false } });
    const req = new Request('http://localhost/api/wins', { method: 'POST', body: JSON.stringify({ winnerId: a, requestId, standings: [a, b] }) });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect((await res.json()).win.id).toBe(saved.win.id);
    await prisma.player.update({ where: { id: a }, data: { isActive: true } });
  });
  it('reads the king and streak after the lock when different winners arrive concurrently', async () => {
    const results = await Promise.all([
      recordWin(a, undefined, { requestId: crypto.randomUUID(), standings: [a, b], ignoreCooldown: true }),
      recordWin(b, undefined, { requestId: crypto.randomUUID(), standings: [b, a], ignoreCooldown: true }),
    ]);
    const events = [...results].sort((x, y) => x.win.occurredAt.getTime() - y.win.occurredAt.getTime());
    expect(events[1].win.previousKingId).toBe(events[0].win.winnerId);
    expect(await prisma.reign.count({ where: { endedAt: null } })).toBe(1);
    expect(events[1].win.streakCount).toBe(1);
  });
  it('does not exhaust its pool during a burst of concurrent retries', async () => {
    const requestId = crypto.randomUUID();
    const attempts = await Promise.allSettled(Array.from({ length: 12 }, () => recordWin(a, 'Burst', { requestId, standings: [a, b], ignoreCooldown: true })));
    expect(attempts.filter((r) => r.status === 'rejected')).toEqual([]);
    const successes = attempts.filter((r) => r.status === 'fulfilled');
    expect(new Set(successes.map((r) => r.value.win.id)).size).toBe(1);
  }, 45000);
  it('rejects a distinct submission during cooldown with a typed retry duration', async () => {
    await expect(recordWin(a, undefined, { standings: [a, b], requestId: crypto.randomUUID() })).rejects.toMatchObject({ status: 429, remainingMs: expect.any(Number) });
  });
});
