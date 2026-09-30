/**
 * MCP-server för Rundpingisriket: låter en MCP-klient (Claude Code, Claude Desktop)
 * läsa riket och kröna vinnare.
 *
 * Verktygen går via appens egna API-rutter i stället för via Prisma. Därför behövs
 * ingen databaskoppling här, och samma server funkar mot produktion.
 *
 *   npx tsx scripts/mcp.ts                         # mot http://localhost:3030
 *   KINGPING_URL=https://riket.exempel npx tsx scripts/mcp.ts
 *   npx vitest run tests/mcp.test.ts               # startar servern som .mcp.json gör, mot en påhittad app
 *
 * ponytail: handrullad JSON-RPC (initialize + ping + tools/*). Byt till
 * @modelcontextprotocol/sdk först om vi vill ha resources, prompts eller sampling.
 */
import { createInterface } from 'node:readline';

const SERVER_INFO = { name: 'rundpingisriket', version: '0.2.0' };
// Samma default som lib/site-url.ts: dev-servern kör på 3030.
const baseUrl = (process.env.KINGPING_URL ?? 'http://localhost:3030').replace(/\/+$/, '');

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
const playerName = (description: string) => ({ type: 'string', description: `${description} Namn eller id, oavsett versaler.` });

type Player = { id: string; name: string };
type Badge = { definition: { emoji: string; name: string }; reason: string };

// Skicka med listan när flera namn slås upp i samma anrop, så hämtas den en gång.
async function findPlayer(query: string, players?: Player[]): Promise<Player> {
  players ??= (await api('/api/players')) as Player[];
  const wanted = query.trim().toLowerCase();
  const player = players.find((p) => p.id === query || p.name.toLowerCase() === wanted);
  if (!player) throw new Error(`Ingen spelare matchar "${query}". Spelarna heter: ${players.map((p) => p.name).join(', ')}.`);
  return player;
}

// Varje badge bär hela sin definition (beskrivning, raritet, kategori …), ungefär 70 % av tabellen.
// Namn och skäl räcker för att svara på frågor om badges.
const badgeLabels = (badges: Badge[]) => badges.map((b) => `${b.definition.emoji} ${b.definition.name}: ${b.reason}`);

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
  { name: 'pingis_players', description: 'Alla spelare med id, namn och om de är aktiva.', inputSchema: schema(), annotations: { readOnlyHint: true },
    run: () => api('/api/players') },
  { name: 'pingis_leaderboard', description: 'Ligatabellen för aktuell säsong: rank, vinster, tid på tronen (ms), streaks och badges.', inputSchema: schema(), annotations: { readOnlyHint: true },
    run: async () => (await api('/api/leaderboard')).map((row: any) => ({ ...row, badges: badgeLabels(row.badges) })) },
  { name: 'pingis_player', description: 'En spelares profil: statistik, badges, senaste kröningar och ärkefiende.', inputSchema: schema({ player: playerName('Spelaren.') }, ['player']), annotations: { readOnlyHint: true },
    run: async (a) => {
      const { id } = await findPlayer(String(a.player));
      const profile = await api(`/api/players/${encodeURIComponent(id)}`);
      return { ...profile, stats: { ...profile.stats, badges: badgeLabels(profile.stats.badges) } };
    } },
  { name: 'pingis_history', description: 'Senaste kröningarna ur krönikan, nyast först, med vinnarens och den avsattes namn, och rundans placering när den spelats in.', inputSchema: schema({ limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Antal händelser (standard 10).' } }), annotations: { readOnlyHint: true },
    run: async (a) => {
      const [events, players]: [any[], Player[]] = await Promise.all([api('/api/history'), api('/api/players')]);
      const nameOf = new Map(players.map((p) => [p.id, p.name]));
      return events.slice(0, a.limit ?? 10).map((e) => ({ ...e, winner: nameOf.get(e.winnerId), previousKing: nameOf.get(e.previousKingId) ?? null, standings: (e.standings ?? []).map((id: string) => nameOf.get(id) ?? id) }));
    } },
  { name: 'pingis_record_win', description: 'Kröner en ny vinnare. Skriver i databasen och syns direkt på sajten. Blockeras en stund efter föregående kröning.', inputSchema: schema({ winner: playerName('Vinnaren.'), standings: { type: 'array', items: { type: 'string' }, description: 'Valfri: hela rundans placering, vinnaren först och den som åkte ut först sist. Bara de som spelade. Namn eller id.' }, note: { type: 'string', maxLength: 280, description: 'Valfri notering om matchen, högst 280 tecken.' } }, ['winner']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    run: async (a) => {
      // Servern validerar inte mot inputSchema. En placering som inte är en lista (t.ex. en sträng) får
      // inte tyst försvinna: då kröns vinnaren utan placering, och kröningen går inte att göra om.
      if (a.standings !== undefined && !Array.isArray(a.standings)) throw new Error('standings måste vara en lista med namn, vinnaren först.');
      const players: Player[] = await api('/api/players');
      const winner = await findPlayer(String(a.winner), players);
      const standings = a.standings ? await Promise.all(a.standings.map(async (n: unknown) => (await findPlayer(String(n), players)).id)) : undefined;
      return api('/api/wins', { method: 'POST', body: JSON.stringify({ winnerId: winner.id, standings, note: a.note }) });
    } },
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

// Utan top-level await: tsx bygger scriptet som CommonJS, där det kraschar vid start.
createInterface({ input: process.stdin }).on('line', (line) => void handle(line));
