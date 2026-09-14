import { spawn, type ChildProcess } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createInterface } from 'node:readline';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const players = [{ id: 'p1', name: 'Erik' }, { id: 'p2', name: 'Anna' }];
const badge = { id: 'emperor', definition: { id: 'emperor', name: 'Kejsaren', emoji: '👑', description: 'Mest total tid på tronen.', rarity: 'legendary' }, reason: 'Har mest tid på tronen.' };
const routes: Record<string, unknown> = {
  '/api/players': players,
  '/api/players/p1': { player: players[0], stats: { totalWins: 3, badges: [badge] }, timeline: [], nemesis: null },
  '/api/leaderboard': [{ id: 'p1', name: 'Erik', rank: 1, badges: [badge] }],
  '/api/history': [{ id: 'w2', winnerId: 'p2', previousKingId: 'p1' }, { id: 'w1', winnerId: 'p1', previousKingId: null }],
};
const postedWins: unknown[] = [];

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
    res.setHeader('content-type', 'application/json');
    if (req.method === 'POST' && req.url === '/api/wins') {
      let body = '';
      for await (const chunk of req) body += chunk;
      postedWins.push(JSON.parse(body));
      return res.writeHead(429).end(JSON.stringify({ error: 'Vänta 5 min.' }));
    }
    if (!(req.url! in routes)) return res.writeHead(404).end();
    res.end(JSON.stringify(routes[req.url!]));
  }).listen(0, '127.0.0.1');
  await new Promise((done) => app.once('listening', done));

  // Startas med kommandot ur .mcp.json: det är den starten Claude Code gör, och den som kan krascha.
  const { command, args } = JSON.parse(readFileSync('.mcp.json', 'utf8')).mcpServers.rundpingisriket;
  server = spawn(command, args, { env: { ...process.env, KINGPING_URL: `http://127.0.0.1:${(app.address() as AddressInfo).port}` } });
  server.stderr!.on('data', (chunk) => (stderr += chunk));
  server.on('exit', (code) => pending.forEach(({ reject }) => reject(new Error(`MCP-servern avslutades med kod ${code}:\n${stderr}`))));
  createInterface({ input: server.stdout! }).on('line', (line) => {
    const msg = JSON.parse(line);
    pending.get(msg.id)?.resolve(msg);
  });
});

afterAll(() => {
  server.kill();
  app.close();
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

  it('okänt namn kröner ingen och räknar upp vilka som finns', async () => {
    const before = postedWins.length;
    const result = await callTool('pingis_record_win', { winner: 'Anakin' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Erik, Anna');
    expect(postedWins.length).toBe(before);
  });

  it('historiken namnger vinnaren och den avsatte', async () => {
    expect(await toolJson('pingis_history', { limit: 1 })).toEqual([expect.objectContaining({ winner: 'Anna', previousKing: 'Erik' })]);
  });

  it('tabellen och profilen visar badges som emoji, namn och skäl', async () => {
    const label = '👑 Kejsaren: Har mest tid på tronen.';
    expect((await toolJson('pingis_leaderboard'))[0].badges).toEqual([label]);
    expect((await toolJson('pingis_player', { player: 'Erik' })).stats.badges).toEqual([label]);
  });
});
