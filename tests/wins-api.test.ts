import { beforeEach, expect, it, vi } from 'vitest';
const db = vi.hoisted(() => ({ recordWin: vi.fn(), findFirst: vi.fn() }));
vi.mock('../lib/prisma', () => ({ prisma: { winEvent: { findFirst: db.findFirst } } }));
vi.mock('../lib/domain/riket', async (original) => ({ ...await original<typeof import('../lib/domain/riket')>(), recordWin: db.recordWin }));
import { POST } from '../app/api/wins/route';
import { WinError } from '../lib/domain/win-request';
beforeEach(() => { vi.clearAllMocks(); db.findFirst.mockResolvedValue(null); db.recordWin.mockResolvedValue({ win: { id: 'round' } }); });
const post = (body: unknown) => POST(new Request('http://localhost/api/wins', { method: 'POST', body: JSON.stringify(body) }));
it('passes the durable request key to recording without a pre-lock cooldown check', async () => {
  const requestId = crypto.randomUUID();
  db.findFirst.mockResolvedValue({ occurredAt: new Date() });
  expect((await post({ winnerId: 'a', standings: ['a', 'b'], requestId })).status).toBe(200);
  expect(db.recordWin).toHaveBeenCalledWith('a', undefined, { actor: 'web', standings: ['a', 'b'], requestId });
  expect(db.findFirst).not.toHaveBeenCalled();
});
it('returns typed cooldown feedback and Retry-After', async () => {
  db.recordWin.mockRejectedValue(new WinError('Vänta', 429, 60001));
  const res = await post({ winnerId: 'a' });
  expect(res.status).toBe(429);
  expect(res.headers.get('Retry-After')).toBe('61');
  expect(await res.json()).toMatchObject({ cooldown: true, remainingMs: 60001 });
});
it('returns a conflict for a reused key with different results', async () => {
  db.recordWin.mockRejectedValue(new WinError('Konflikt', 409));
  expect((await post({ winnerId: 'a' })).status).toBe(409);
});
it.each([{ winnerId: 'a', requestId: 'bad' }, { winnerId: 'a', note: 'a'.repeat(501) }, { winnerId: ' ' }])('rejects invalid payloads before writing (%j)', async (body) => {
  expect((await post(body)).status).toBe(400);
  expect(db.recordWin).not.toHaveBeenCalled();
});
it('keeps legacy winner-only calls valid', async () => {
  expect((await post({ winnerId: 'a' })).status).toBe(200);
});
