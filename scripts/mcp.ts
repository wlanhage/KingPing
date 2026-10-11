/**
 * MCP-server för Rundpingisriket: låter en MCP-klient läsa riket,
 * kröna vinnare, lägga till spelare och sätta AFK-status.
 *
 * Verktygen går via appens egna API-rutter i stället för via Prisma. Därför behövs
 * ingen databaskoppling här, och samma server funkar mot produktion.
 *
 *   npx tsx scripts/mcp.ts                         # mot http://localhost:3030
 *   KINGPING_URL=https://riket.exempel npx tsx scripts/mcp.ts
 *   npm run test:mcp                             # startar servern som .mcp.json gör, mot en påhittad app
 *
 * ponytail: handrullad JSON-RPC (initialize + ping + tools/*). Byt till
 * @modelcontextprotocol/sdk först om vi vill ha resources, prompts eller sampling.
 */
import { createInterface } from 'node:readline';
import { z } from 'zod';

const SERVER_INFO = { name: 'rundpingisriket', version: '0.3.0' };
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

type InputSchema = {
  type: 'object' | 'string' | 'integer' | 'boolean' | 'array';
  description?: string;
  properties?: Record<string, InputSchema>;
  required?: string[];
  additionalProperties?: false;
  minLength?: number;
  minimum?: number;
  maximum?: number;
  items?: InputSchema;
  maxItems?: number;
};

const schema = (properties: Record<string, InputSchema> = {}, required: string[] = []): InputSchema => ({ type: 'object', properties, required, additionalProperties: false });
const playerName = (description: string): InputSchema => ({ type: 'string', minLength: 1, description: `${description} Namn eller id, oavsett versaler.` });

// Samma schema publiceras till klienten och används vid körning: ingen separat lista
// av valideringsregler som kan glida isär när ett verktyg ändras.
function validatorFor(input: InputSchema): z.ZodTypeAny {
  switch (input.type) {
    case 'object': {
      const fields = Object.fromEntries(Object.entries(input.properties ?? {}).map(([key, property]) => {
        const validator = validatorFor(property);
        return [key, input.required?.includes(key) ? validator : validator.optional()];
      }));
      return z.object(fields).strict();
    }
    case 'string':
      return input.minLength === undefined ? z.string() : z.string().trim().min(input.minLength);
    case 'integer': {
      let validator = z.number().int();
      if (input.minimum !== undefined) validator = validator.min(input.minimum);
      if (input.maximum !== undefined) validator = validator.max(input.maximum);
      return validator;
    }
    case 'boolean':
      return z.boolean();
    case 'array': {
      const validator = z.array(validatorFor(input.items!), { invalid_type_error: 'måste vara en lista.' });
      return input.maxItems === undefined ? validator : validator.max(input.maxItems);
    }
  }
}

type Player = { id: string; name: string };
type Badge = { definition: { emoji: string; name: string }; reason: string };

// Skicka med listan när flera namn slås upp i samma anrop, så hämtas den en gång.
async function findPlayer(query: string, players?: Player[]): Promise<Player> {
  players ??= (await api('/api/players')) as Player[];
  const wanted = query.trim().toLowerCase();
  const byId = players.find((p) => p.id.toLowerCase() === wanted);
  if (byId) return byId;
  const matches = players.filter((p) => p.name.toLowerCase() === wanted);
  if (matches.length > 1) throw new Error(`Flera spelare matchar "${query}". Ange id: ${matches.map((p) => `${p.name} (${p.id})`).join(', ')}.`);
  const player = matches[0];
  if (!player) throw new Error(`Ingen spelare matchar "${query}". Spelarna heter: ${players.map((p) => p.name).join(', ')}.`);
  return player;
}

// Varje badge bär hela sin definition (beskrivning, raritet, kategori …), ungefär 70 % av tabellen.
// Namn och skäl räcker för att svara på frågor om badges.
const badgeLabels = (badges: Badge[]) => badges.map((b) => `${b.definition.emoji} ${b.definition.name}: ${b.reason}`);
const compactLeaderboard = (rows: any[]) => rows.map((row) => ({ ...row, badges: badgeLabels(row.badges) }));
const historyLimit: InputSchema = { type: 'integer', minimum: 1, maximum: 100, description: 'Antal händelser (standard 10).' };

function namedHistory(events: any[], players: Player[], limit: number, playerId?: string) {
  const nameOf = new Map(players.map((p) => [p.id, p.name]));
  return events
    .filter((e) => !playerId || e.winnerId === playerId || e.previousKingId === playerId || e.standings?.includes(playerId))
    .slice(0, limit)
    .map((e) => ({ ...e, winner: nameOf.get(e.winnerId), previousKing: nameOf.get(e.previousKingId) ?? null, standings: (e.standings ?? []).map((id: string) => nameOf.get(id) ?? id) }));
}

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
    run: async () => compactLeaderboard(await api('/api/leaderboard')) },
  { name: 'pingis_player', description: 'En spelares profil: statistik, badges, senaste kröningar och ärkefiende.', inputSchema: schema({ player: playerName('Spelaren.') }, ['player']), annotations: { readOnlyHint: true },
    run: async (a) => {
      const { id } = await findPlayer(a.player);
      const profile = await api(`/api/players/${encodeURIComponent(id)}`);
      return { ...profile, stats: { ...profile.stats, badges: badgeLabels(profile.stats.badges) } };
    } },
  { name: 'pingis_history', description: 'Senaste kröningarna ur krönikan, nyast först, med namn och placering. Valfritt spelarfilter: vinnare, avsatt kung eller deltagare, bland API:ets senaste 100 kröningar.', inputSchema: schema({ limit: historyLimit, player: playerName('Valfri spelare att filtrera på.') }), annotations: { readOnlyHint: true },
    run: async (a) => {
      const [events, players]: [any[], Player[]] = await Promise.all([api('/api/history'), api('/api/players')]);
      const player = a.player === undefined ? undefined : await findPlayer(a.player, players);
      return namedHistory(events, players, a.limit ?? 10, player?.id);
    } },
  { name: 'pingis_record_win', description: 'Kröner en ny vinnare. Skriver i databasen och syns direkt på sajten. Blockeras en stund efter föregående kröning.', inputSchema: schema({ winner: playerName('Vinnaren.'), standings: { type: 'array', maxItems: 100, items: playerName('Deltagaren.'), description: 'Valfri: hela rundans placering, vinnaren först och den som åkte ut först sist. Bara de som spelade. Namn eller id, utan dubbletter. Tom lista betyder att bara vinnaren är känd.' }, note: { type: 'string', description: 'Valfri notering om matchen.' } }, ['winner']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    run: async (a) => {
      const players: Player[] = await api('/api/players');
      const winner = await findPlayer(a.winner, players);
      const standings: string[] | undefined = a.standings ? await Promise.all(a.standings.map(async (n: string) => (await findPlayer(n, players)).id)) : undefined;
      if (standings?.length && standings[0] !== winner.id) throw new Error('standings måste ha vinnaren först.');
      if (standings && new Set(standings).size !== standings.length) throw new Error('standings innehåller dubbletter av samma spelare.');
      return api('/api/wins', { method: 'POST', body: JSON.stringify({ winnerId: winner.id, standings, note: a.note }) });
    } },
  { name: 'pingis_overview', description: 'Samlad översikt: nuvarande tron, alla spelare, aktuell säsongs tabell och senaste namngivna kröningar.', inputSchema: schema({ limit: historyLimit }), annotations: { readOnlyHint: true },
    run: async (a) => {
      const [state, players, leaderboard, events] = await Promise.all([api('/api/state'), api('/api/players'), api('/api/leaderboard'), api('/api/history')]);
      return { state, players, leaderboard: compactLeaderboard(leaderboard), history: namedHistory(events, players, a.limit ?? 10) };
    } },
  { name: 'pingis_add_player', description: 'Lägger till en aktiv spelare. Skriver i databasen. Namnet måste ha minst två tecken; valfritt Slack-id kopplar spelaren till Slack.', inputSchema: schema({ name: { type: 'string', minLength: 2, description: 'Den nya spelarens namn.' }, slackUserId: { type: 'string', minLength: 1, description: 'Valfritt Slack-användar-id.' } }, ['name']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    run: (a) => api('/api/players', { method: 'POST', body: JSON.stringify({ name: a.name, slackUserId: a.slackUserId }) }) },
  { name: 'pingis_set_afk', description: 'Sätter en spelares AFK-status: true pausar spelaren och tar bort hen ur rankingen; false aktiverar igen. Meriterna finns kvar. Regerande kung kan inte gå AFK.', inputSchema: schema({ player: playerName('Spelaren.'), afk: { type: 'boolean', description: 'true = pausa, false = aktivera.' } }, ['player', 'afk']), annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
    run: async (a) => {
      const { id } = await findPlayer(a.player);
      return api(`/api/players/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ afk: a.afk }) });
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
        const args = validatorFor(tool.inputSchema).parse(params.arguments === undefined ? {} : params.arguments);
        return { content: [{ type: 'text', text: JSON.stringify(await tool.run(args)) }] };
      } catch (e: any) {
        const message = e instanceof z.ZodError
          ? e.issues.map((issue) => `${issue.path.reduce<string>((path, key) => typeof key === 'number' ? `${path}[${key}]` : path ? `${path}.${key}` : key, '') || 'arguments'}: ${issue.message}`).join('; ')
          : String(e?.message ?? e);
        return { content: [{ type: 'text', text: message }], isError: true };
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
