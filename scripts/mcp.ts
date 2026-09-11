/**
 * MCP-server för Rundpingisriket: låter en MCP-klient (Claude Code, Claude Desktop)
 * läsa riket och kröna vinnare.
 *
 * Verktygen går via appens egna API-rutter i stället för via Prisma. Därför behövs
 * ingen databaskoppling här, och samma server funkar mot produktion.
 *
 *   npx tsx scripts/mcp.ts                         # mot http://localhost:3030
 *   KINGPING_URL=https://riket.exempel npx tsx scripts/mcp.ts
 *   node scripts/mcp.ts --selfcheck                # protokollkoll, ingen app behövs
 *
 * ponytail: handrullad JSON-RPC (initialize + ping + tools/*). Byt till
 * @modelcontextprotocol/sdk först om vi vill ha resources, prompts eller sampling.
 */
import { strict as assert } from 'node:assert';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';

const SERVER_INFO = { name: 'rundpingisriket', version: '0.1.0' };
// Samma default som lib/site-url.ts: dev-servern kör på 3030.
let baseUrl = (process.env.KINGPING_URL ?? 'http://localhost:3030').replace(/\/+$/, '');

class RpcError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

async function api(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, { ...init, headers: { 'content-type': 'application/json' } });
  } catch (e: any) {
    throw new Error(`Nådde inte ${baseUrl} (${e?.message ?? e}). Starta appen med "npm run dev", eller peka KINGPING_URL mot en körande instans.`);
  }
  const body = await res.text();
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} svarade ${res.status}: ${body.slice(0, 500)}`);
  return body ? JSON.parse(body) : null;
}

const schema = (properties: Record<string, unknown> = {}, required: string[] = []) => ({ type: 'object', properties, required, additionalProperties: false });
const playerId = { type: 'string', description: 'Spelarens id (hämtas med pingis_players).' };

type Tool = {
  name: string;
  description: string;
  inputSchema: ReturnType<typeof schema>;
  annotations: Record<string, boolean>;
  run: (args: Record<string, any>) => Promise<unknown>;
};

const TOOLS: Tool[] = [
  { name: 'pingis_current_king', description: 'Vem som sitter på tronen nu, med regeringens start.', inputSchema: schema(), annotations: { readOnlyHint: true },
    run: () => api('/api/state') },
  { name: 'pingis_players', description: 'Alla spelare med id och namn. Börja här när ett playerId behövs.', inputSchema: schema(), annotations: { readOnlyHint: true },
    run: () => api('/api/players') },
  { name: 'pingis_leaderboard', description: 'Ligatabellen för aktuell säsong: rank, vinster, tid på tronen, streaks och badges.', inputSchema: schema(), annotations: { readOnlyHint: true },
    run: () => api('/api/leaderboard') },
  { name: 'pingis_player', description: 'En spelares profil: statistik, senaste kröningar och ärkefiende.', inputSchema: schema({ playerId }, ['playerId']), annotations: { readOnlyHint: true },
    run: (a) => api(`/api/players/${encodeURIComponent(String(a.playerId))}`) },
  { name: 'pingis_history', description: 'Senaste kröningarna ur krönikan, nyast först.', inputSchema: schema({ limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Antal händelser (standard 10).' } }), annotations: { readOnlyHint: true },
    run: async (a) => (await api('/api/history')).slice(0, a.limit ?? 10) },
  { name: 'pingis_record_win', description: 'Kröner en ny vinnare. Skriver i databasen och syns direkt på sajten. Blockeras en stund efter föregående kröning.', inputSchema: schema({ winnerId: playerId, note: { type: 'string', description: 'Valfri notering om matchen.' } }, ['winnerId']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    run: (a) => api('/api/wins', { method: 'POST', body: JSON.stringify({ winnerId: a.winnerId, note: a.note }) }) },
];

async function rpc(method: string, params: any): Promise<any> {
  switch (method) {
    case 'initialize':
      return { protocolVersion: params?.protocolVersion ?? '2025-06-18', capabilities: { tools: {} }, serverInfo: SERVER_INFO };
    case 'ping':
      return {};
    case 'tools/list':
      return { tools: TOOLS.map(({ run, ...tool }) => tool) };
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) throw new RpcError(-32602, `Okänt verktyg: ${params?.name}`);
      // API-fel skickas som verktygsfel, inte protokollfel: då ser modellen texten
      // (t.ex. cooldown-meddelandet) och kan rätta sig själv i stället för att bara fallera.
      try {
        return { content: [{ type: 'text', text: JSON.stringify(await tool.run(params.arguments ?? {})) }] };
      } catch (e: any) {
        return { content: [{ type: 'text', text: String(e?.message ?? e) }], isError: true };
      }
    }
    default:
      throw new RpcError(-32601, `Metod stöds inte: ${method}`);
  }
}

const send = (message: unknown) => process.stdout.write(`${JSON.stringify(message)}\n`);

async function handle(line: string) {
  let msg: any;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.id === undefined) return; // notifikation (notifications/initialized m.fl.) — inget svar
  try {
    send({ jsonrpc: '2.0', id: msg.id, result: await rpc(msg.method, msg.params) });
  } catch (e: any) {
    send({ jsonrpc: '2.0', id: msg.id, error: { code: e instanceof RpcError ? e.code : -32603, message: String(e?.message ?? e) } });
  }
}

/** Kör protokollet mot en påhittad app, så att en trasig server syns utan databas. */
async function selfcheck() {
  const app = createServer((req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/history') return res.end(JSON.stringify([{ id: 'a' }, { id: 'b' }]));
    if (req.url === '/api/wins') return res.writeHead(429).end(JSON.stringify({ error: 'Vänta 5 min.' }));
    res.end(JSON.stringify({ url: req.url }));
  }).listen(0, '127.0.0.1');
  await new Promise((done) => app.once('listening', done));
  baseUrl = `http://127.0.0.1:${(app.address() as any).port}`;

  assert.equal((await rpc('initialize', { protocolVersion: '2025-06-18' })).serverInfo.name, 'rundpingisriket');
  const { tools } = await rpc('tools/list', {});
  assert.equal(tools.length, TOOLS.length);
  assert.ok(!('run' in tools[0]), 'tools/list läcker run()');
  assert.match((await rpc('tools/call', { name: 'pingis_current_king', arguments: {} })).content[0].text, /api\/state/);
  assert.match((await rpc('tools/call', { name: 'pingis_player', arguments: { playerId: 'a b' } })).content[0].text, /a%20b/);
  assert.equal(JSON.parse((await rpc('tools/call', { name: 'pingis_history', arguments: { limit: 1 } })).content[0].text).length, 1);
  const denied = await rpc('tools/call', { name: 'pingis_record_win', arguments: { winnerId: 'x' } });
  assert.equal(denied.isError, true);
  assert.match(denied.content[0].text, /429.*Vänta/);
  assert.equal((await rpc('tools/call', { name: 'pingis_nope', arguments: {} }).catch((e) => e)).code, -32602);
  assert.equal((await rpc('resources/list', {}).catch((e) => e)).code, -32601);
  app.close();
  console.log('selfcheck ok');
}

if (process.argv.includes('--selfcheck')) {
  await selfcheck();
} else {
  for await (const line of createInterface({ input: process.stdin })) void handle(line);
}
