import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createInterface } from 'node:readline';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const players = [{ id: 'p1', name: 'Erik', isActive: true }, { id: 'p2', name: 'Anna', isActive: false }];
const badge = { id: 'emperor', definition: { id: 'emperor', name: 'Kejsaren', emoji: '👑', description: 'Mest total tid på tronen.', rarity: 'legendary' }, reason: 'Har mest tid på tronen.' };
const routes: Record<string, unknown> = {
  '/api/state': { player: players[0], startedAt: '2026-10-11T10:00:00.000Z' },
  '/api/players': players,
  '/api/players/p1': { player: players[0], stats: { totalWins: 3, badges: [badge] }, timeline: [], nemesis: null },
  '/api/leaderboard': [{ id: 'p1', name: 'Erik', rank: 1, badges: [badge] }],
  '/api/history': [{ id: 'w2', winnerId: 'p2', previousKingId: 'p1', standings: ['p2', 'p1'] }, { id: 'w1', winnerId: 'p1', previousKingId: null }],
};
const postedWins: unknown[] = [];
const postedPlayers: unknown[] = [];
const patchedPlayers: unknown[] = [];
const apiRequests: string[] = [];

let app: Server;
let server: ChildProcess;
let stderr = '';
let nextId = 1;
const pending = new Map<number, { resolve: (msg: any) => void; reject: (error: Error) => void }>();

function request(method: string, params: unknown = {}) {
  const id = nextId++;
  return new Promise<any>((resolve, reject) => {
    if (server.exitCode !== null) return reject(new Error(`MCP-servern har avslutats:\n${stderr}`));
    pending.set(id, { resolve, reject });
    server.stdin!.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
}

const callTool = async (name: string, args: Record<string, unknown> = {}) => (await request('tools/call', { name, arguments: args })).result;
const toolJson = async (name: string, args?: Record<string, unknown>) => JSON.parse((await callTool(name, args)).content[0].text);

beforeAll(async () => {
  app = createServer(async (req, res) => {
    apiRequests.push(`${req.method} ${req.url}`);
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST' && req.url === '/api/wins') {
      let body = '';
      for await (const chunk of req) body += chunk;
      postedWins.push(JSON.parse(body));
      return res.writeHead(429).end(JSON.stringify({ error: 'Vänta 5 min.' }));
    }
    if (req.method === 'POST' && req.url === '/api/players') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);
      postedPlayers.push(data);
      return res.end(JSON.stringify({ id: 'p3', ...data, isActive: true }));
    }
    if (req.method === 'PATCH' && req.url === '/api/players/p2') {
      let body = '';
      for await (const chunk of req) body += chunk;
      const data = JSON.parse(body);
      patchedPlayers.push(data);
      return res.end(JSON.stringify({ ...players[1], isActive: !data.afk }));
    }
    if (req.method === 'PATCH' && req.url === '/api/players/p1') {
      return res.writeHead(400).end(JSON.stringify({ error: 'Erik sitter på tronen och kan inte gå AFK.' }));
    }
    if (!(req.url! in routes)) return res.writeHead(404).end();
    res.end(JSON.stringify(routes[req.url!]));
  }).listen(0, '127.0.0.1');
  await new Promise<void>((done, reject) => {
    app.once('listening', done);
    app.once('error', reject);
  });

  // Startas med kommandot ur .mcp.json: det är den starten Claude Code gör, och den som kan krascha.
  const { command, args } = JSON.parse(readFileSync('.mcp.json', 'utf8')).mcpServers.rundpingisriket;
  server = spawn(command, args, { env: { ...process.env, KINGPING_URL: `http://127.0.0.1:${(app.address() as AddressInfo).port}` } });
  server.stderr!.on('data', (chunk) => (stderr += chunk));
  server.on('exit', (code) => pending.forEach(({ reject }) => reject(new Error(`MCP-servern avslutades med kod ${code}:\n${stderr}`))));
  createInterface({ input: server.stdout! }).on('line', (line) => {
    const msg = JSON.parse(line);
    pending.get(msg.id)?.resolve(msg);
    pending.delete(msg.id);
  });
});

afterAll(() => {
  server?.kill();
  app?.close();
});

describe('MCP-servern', () => {
  it('startar med kommandot i .mcp.json och svarar på protokollet', async () => {
    expect((await request('initialize', { protocolVersion: '2025-06-18' })).result.serverInfo.name).toBe('rundpingisriket');
    expect((await request('tools/list')).result.tools.map((t: any) => t.name)).toContain('pingis_record_win');
    expect((await request('resources/list')).error.code).toBe(-32601);
  });

  it('kröner på namn: namnet blir id, och appens cooldown-svar når modellen som text', async () => {
    const result = await callTool('pingis_record_win', { winner: 'erik', note: 'Jämn match' });
    expect(postedWins.at(-1)).toEqual({ winnerId: 'p1', note: 'Jämn match' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/429.*Vänta/);
  });

  it('placeringen skickas som id i samma ordning, vinnaren först', async () => {
    await callTool('pingis_record_win', { winner: 'Anna', standings: ['anna', 'Erik'] });
    expect(postedWins.at(-1)).toEqual({ winnerId: 'p2', standings: ['p2', 'p1'] });
  });

  it('en placering som inte är en lista kröner ingen, i stället för att tyst tappas', async () => {
    const before = postedWins.length;
    const result = await callTool('pingis_record_win', { winner: 'Anna', standings: 'Anna, Erik' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/lista/);
    expect(postedWins.length).toBe(before);
  });

  it('okänt namn kröner ingen och räknar upp vilka som finns', async () => {
    const before = postedWins.length;
    const result = await callTool('pingis_record_win', { winner: 'Anakin' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Erik, Anna');
    expect(postedWins.length).toBe(before);
  });

  it('historiken namnger vinnaren och den avsatte', async () => {
    expect(await toolJson('pingis_history', { limit: 1 })).toEqual([expect.objectContaining({ winner: 'Anna', previousKing: 'Erik', standings: ['Anna', 'Erik'] })]);
  });

  it('tabellen och profilen visar badges som emoji, namn och skäl', async () => {
    const label = '👑 Kejsaren: Har mest tid på tronen.';
    expect((await toolJson('pingis_leaderboard'))[0].badges).toEqual([label]);
    expect((await toolJson('pingis_player', { player: 'Erik' })).stats.badges).toEqual([label]);
  });

  it('annonserar de nya verktygen och deras skrivbehörighet', async () => {
    const { tools } = (await request('tools/list')).result;
    expect(tools).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'pingis_overview', annotations: expect.objectContaining({ readOnlyHint: true }) }),
      expect.objectContaining({ name: 'pingis_add_player', annotations: expect.objectContaining({ readOnlyHint: false, idempotentHint: false }) }),
      expect.objectContaining({ name: 'pingis_set_afk', annotations: expect.objectContaining({ readOnlyHint: false, idempotentHint: true }) }),
    ]));
  });

  it('samlar tronen, spelarna, tabellen och namngiven historik i en översikt', async () => {
    const overview = await toolJson('pingis_overview', { limit: 1 });
    expect(overview.state).toEqual(routes['/api/state']);
    expect(overview.players).toEqual(players);
    expect(overview.leaderboard[0].badges).toEqual(['👑 Kejsaren: Har mest tid på tronen.']);
    expect(overview.history).toEqual([expect.objectContaining({ winner: 'Anna', previousKing: 'Erik', standings: ['Anna', 'Erik'] })]);
  });

  it('lägger till en spelare med valfritt Slack-id via appens API', async () => {
    const result = await toolJson('pingis_add_player', { name: 'Lisa', slackUserId: 'U123' });
    expect(postedPlayers.at(-1)).toEqual({ name: 'Lisa', slackUserId: 'U123' });
    expect(result).toEqual({ id: 'p3', name: 'Lisa', slackUserId: 'U123', isActive: true });
    await callTool('pingis_add_player', { name: 'Olle' });
    expect(postedPlayers.at(-1)).toEqual({ name: 'Olle' });
  });

  it('aktiverar och pausar spelare med namn eller id', async () => {
    expect((await toolJson('pingis_set_afk', { player: 'anna', afk: false })).isActive).toBe(true);
    expect(patchedPlayers.at(-1)).toEqual({ afk: false });
    expect((await toolJson('pingis_set_afk', { player: 'p2', afk: true })).isActive).toBe(false);
    expect(patchedPlayers.at(-1)).toEqual({ afk: true });
  });

  it('visar appens skydd mot att pausa regerande kung som ett verktygsfel', async () => {
    const result = await callTool('pingis_set_afk', { player: 'Erik', afk: true });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('kan inte gå AFK');
  });

  it('filtrerar historiken på vinnare, avsatt kung eller deltagare före limit', async () => {
    const saved = routes['/api/history'];
    routes['/api/history'] = [
      { id: 'unrelated', winnerId: 'p1', previousKingId: null },
      { id: 'participated', winnerId: 'p1', previousKingId: null, standings: ['p1', 'p2'] },
      { id: 'won', winnerId: 'p2', previousKingId: 'p1' },
      { id: 'dethroned', winnerId: 'p1', previousKingId: 'p2' },
    ];
    try {
      expect(await toolJson('pingis_history', { player: 'Anna', limit: 1 })).toEqual([expect.objectContaining({ id: 'participated' })]);
      expect((await toolJson('pingis_history', { player: 'p2' })).map((e: any) => e.id)).toEqual(['participated', 'won', 'dethroned']);
    } finally {
      routes['/api/history'] = saved;
    }
  });

  it.each([
    ['pingis_current_king', { unexpected: true }, 'unexpected'],
    ['pingis_player', {}, 'player'],
    ['pingis_player', { player: 42 }, 'player'],
    ['pingis_player', { player: '   ' }, 'player'],
    ['pingis_history', { limit: 0 }, 'limit'],
    ['pingis_history', { limit: 101 }, 'limit'],
    ['pingis_history', { limit: 1.5 }, 'limit'],
    ['pingis_history', { limit: '2' }, 'limit'],
    ['pingis_overview', { limit: null }, 'limit'],
    ['pingis_add_player', {}, 'name'],
    ['pingis_add_player', { name: ' A ' }, 'name'],
    ['pingis_add_player', { name: 'Anna', slackUserId: false }, 'slackUserId'],
    ['pingis_add_player', { name: 'Anna', slackUserId: '' }, 'slackUserId'],
    ['pingis_set_afk', { player: 'Anna' }, 'afk'],
    ['pingis_set_afk', { player: 'Anna', afk: 'false' }, 'afk'],
    ['pingis_record_win', {}, 'winner'],
    ['pingis_record_win', { winner: 'Anna', note: 123 }, 'note'],
    ['pingis_record_win', { winner: 'Anna', standings: [42] }, 'standings[0]'],
    ['pingis_record_win', { winner: 'Anna', standings: [' '] }, 'standings[0]'],
    ['pingis_record_win', { winner: 'Anna', standings: Array(101).fill('Anna') }, 'standings'],
    ['pingis_record_win', { winner: 'Anna', accidental: true }, 'accidental'],
  ])('avvisar ogiltiga argument till %s före API-anrop (%j)', async (name, args, field) => {
    const before = apiRequests.length;
    const result = await callTool(name, args);
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain(field);
    expect(apiRequests.length).toBe(before);
  });

  it.each([null, [], 'Anna'])('avvisar argument som inte är ett objekt (%j)', async (args) => {
    const before = apiRequests.length;
    const result = (await request('tools/call', { name: 'pingis_add_player', arguments: args })).result;
    expect(result.isError).toBe(true);
    expect(apiRequests.length).toBe(before);
  });

  it.each([
    ['vinnaren först', ['Erik', 'Anna']],
    ['dubblett', ['Anna', 'p2']],
  ])('avvisar felaktig placering före kröningen: %s', async (_, standings) => {
    const before = postedWins.length;
    const result = await callTool('pingis_record_win', { winner: 'Anna', standings });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('standings');
    expect(postedWins.length).toBe(before);
  });

  it('accepterar tom placering för en kröning där bara vinnaren är känd', async () => {
    await callTool('pingis_record_win', { winner: 'Anna', standings: [] });
    expect(postedWins.at(-1)).toEqual({ winnerId: 'p2', standings: [] });
  });

  it('trimmar namn och hittar spelare oavsett versaler', async () => {
    expect((await toolJson('pingis_player', { player: '  eRiK  ' })).player.id).toBe('p1');
    await callTool('pingis_record_win', { winner: '  p2  ', standings: [' ANNA ', ' Erik '] });
    expect(postedWins.at(-1)).toEqual({ winnerId: 'p2', standings: ['p2', 'p1'] });
    await callTool('pingis_add_player', { name: '  Lisa  ', slackUserId: ' U123 ' });
    expect(postedPlayers.at(-1)).toEqual({ name: 'Lisa', slackUserId: 'U123' });
  });

  it('kräver id när flera spelarnamn bara skiljer sig i versaler', async () => {
    const saved = routes['/api/players'];
    routes['/api/players'] = [...players, { id: 'p3', name: 'ANNA', isActive: true }];
    const before = patchedPlayers.length;
    try {
      const result = await callTool('pingis_set_afk', { player: 'anna', afk: true });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/p2.*p3/);
      expect(patchedPlayers.length).toBe(before);
      expect((await toolJson('pingis_set_afk', { player: 'p2', afk: true })).id).toBe('p2');
      expect(patchedPlayers.length).toBe(before + 1);
    } finally {
      routes['/api/players'] = saved;
    }
  });
});
