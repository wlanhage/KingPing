import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const players = [
    { id: 'winner', name: 'Winner', isActive: true },
    { id: 'runner-up', name: 'Runner-up', isActive: true },
    { id: 'third', name: 'Third', isActive: true },
  ];
  const state = { afkOnLock: null as string | null };
  const findUniqueOrThrow = vi.fn(async ({ where }: { where: { id: string } }) => {
    const player = players.find((p) => p.id === where.id);
    if (!player) throw new Error('Player not found');
    return { ...player };
  });
  const findMany = vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
    players.filter((p) => where.id.in.includes(p.id)).map((p) => ({ ...p })),
  );
  const tx = {
    $executeRaw: vi.fn(async () => {
      // An AFK transaction commits after pre-validation, before recordWin owns the lock.
      const player = players.find((p) => p.id === state.afkOnLock);
      if (player) player.isActive = false;
      return 1;
    }),
    season: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => ({ id: 'season', slug: 'season', theme: 'realm', startedAt: new Date('2026-09-01') })) },
    player: { findUniqueOrThrow, findMany },
    reign: { findFirst: vi.fn(async () => null), create: vi.fn(async () => ({})) },
    winEvent: {
      findMany: vi.fn(async () => []), count: vi.fn(async () => 0),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'win', ...data })),
    },
    announcement: { create: vi.fn(async () => ({})) },
  };
  return {
    players, state, tx,
    prisma: {
      player: { findUniqueOrThrow, findMany },
      reign: { findFirst: vi.fn(async () => null) },
      winEvent: {
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        findFirst: vi.fn(async () => null),
      },
      $transaction: vi.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    },
  };
});

vi.mock('../lib/prisma', () => ({ prisma: db.prisma }));
vi.mock('../lib/domain/season', () => ({
  previousSeasonOf: () => null,
  resolveSeason: async () => ({ id: 'season', slug: 'season', theme: 'realm', startedAt: new Date('2026-09-01') }),
  winOccurredAtFilter: () => ({}),
  getPreviousSeason: async () => null,
}));
vi.mock('../lib/audit', () => ({ audit: async () => {}, describeWin: () => '' }));

import { recordWin } from '../lib/domain/riket';

beforeEach(() => {
  vi.clearAllMocks();
  db.state.afkOnLock = null;
  db.players.forEach((p) => { p.isActive = true; });
});

const standings = ['winner', 'runner-up', 'third'];

describe('recordWin AFK validation under the throne lock', () => {
  it.each([
    ['runner-up', 'Runner-up'],
    ['third', 'Third'],
    ['winner', 'Winner'],
  ])('rejects a placement when %s goes AFK before the lock', async (id, name) => {
    db.state.afkOnLock = id;
    await expect(recordWin('winner', undefined, { standings })).rejects.toThrow(`${name} är AFK`);
    expect(db.tx.reign.create).not.toHaveBeenCalled();
    expect(db.tx.winEvent.create).not.toHaveBeenCalled();
    expect(db.tx.announcement.create).not.toHaveBeenCalled();
  });

  it('records a full placement when every participant remains active', async () => {
    await recordWin('winner', undefined, { standings });
    expect(db.tx.winEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ standings }) });
  });

  it('keeps winner-only recording available when an unrelated player goes AFK', async () => {
    db.state.afkOnLock = 'runner-up';
    await recordWin('winner');
    expect(db.tx.winEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ standings: [] }) });
  });
});
