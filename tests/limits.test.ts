import { afterEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ countPlayers: vi.fn(), createPlayer: vi.fn(), lastWin: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    player: { count: db.countPlayers, create: db.createPlayer },
    winEvent: { findFirst: db.lastWin },
    auditLog: { create: vi.fn() },
  },
}));

import { POST as addPlayer } from '../app/api/players/route';
import { POST as addWin } from '../app/api/wins/route';
import { NAME_MAX, NOTE_MAX, PLAYERS_MAX } from '../lib/domain/limits';

afterEach(() => vi.clearAllMocks());

const post = async (handler: (req: Request) => Promise<Response>, body: unknown) => {
  const res = await handler(new Request('http://riket.test/api', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }));
  return { status: res.status, body: await res.json() };
};

describe('spelarnas namn och antal', () => {
  it('ett för långt namn nekas med ett läsbart fel, och ingen spelare skapas', async () => {
    expect(await post(addPlayer, { name: 'x'.repeat(NAME_MAX + 1) })).toEqual({ status: 400, body: { error: `Namnet får vara högst ${NAME_MAX} tecken.` } });
    expect(db.createPlayer).not.toHaveBeenCalled();
  });

  it('när riket är fullt skapas ingen ny spelare', async () => {
    db.countPlayers.mockResolvedValue(PLAYERS_MAX);
    const res = await post(addPlayer, { name: 'Nykomling' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Fler får inte plats');
    expect(db.createPlayer).not.toHaveBeenCalled();
  });

  it('ett vanligt namn trimmas och skapas som förut', async () => {
    db.countPlayers.mockResolvedValue(7);
    db.createPlayer.mockResolvedValue({ id: 'p8', name: 'Axel' });
    expect((await post(addPlayer, { name: '  Axel  ' })).status).toBe(200);
    expect(db.createPlayer).toHaveBeenCalledWith({ data: { name: 'Axel' } });
  });
});

describe('anteckningen till en kröning', () => {
  it('en för lång anteckning nekas innan databasen ens tillfrågas', async () => {
    expect(await post(addWin, { winnerId: 'p1', note: 'x'.repeat(NOTE_MAX + 1) })).toEqual({ status: 400, body: { error: `Anteckningen får vara högst ${NOTE_MAX} tecken.` } });
    expect(db.lastWin).not.toHaveBeenCalled();
  });
});
