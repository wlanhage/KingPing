# Rundpingisriket
MVP byggd med Next.js, Prisma och Slack-integration.
## Setup
1. `cp .env.example .env`
2. Lägg in Supabase connection strings i `DATABASE_URL` och `DIRECT_URL`.
3. `npm install`
4. `npx prisma migrate dev`
5. `npx prisma db seed`
6. `npm run dev`
## Supabase
- Skapa projekt i Supabase.
- Hämta "Connection string" (Transaction + Direct).
- Klistra in i `.env`.
## Slack setup
- Skapa Slack app.
- Scopes: `chat:write`, `commands`, ev `users:read`.
- Slash command `/pingis` -> `{APP_URL}/api/slack/commands`
- Interactivity -> `{APP_URL}/api/slack/interactivity`
- Installera appen i workspace.
- Sätt `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_CHANNEL_ID`.
## ngrok
- `ngrok http 3000`
- Sätt `NEXT_PUBLIC_APP_URL` till ngrok-url.
## Telemetri
Spåren går till Honeycomb och Better Stack (se `lib/telemetry.ts`).
- Sätt `HONEYCOMB_KEY`, `BETTERSTACK_URL` och `BETTERSTACK_TOKEN` i Vercel. Saknas en mottagares värden skickas inget dit.
## MCP
MCP-server med rikets data som verktyg (`scripts/mcp.ts`), för Claude Code/Desktop.
- Den pratar med appens API-rutter, så starta `npm run dev` (eller sätt `KINGPING_URL` till prod-urlen).
- `.mcp.json` i repot registrerar den i Claude Code — svara ja när den frågar.
- Verktyg: `pingis_current_king`, `pingis_players`, `pingis_leaderboard`, `pingis_player`, `pingis_history`, `pingis_record_win`. Spelare anges med namn eller id.
- Test utan app och databas: `npx vitest run tests/mcp.test.ts` — startar servern precis som `.mcp.json` gör.

## Rundor, form och rivaler
- Registreringen visar hur många som är kvar, bekräftar hela placeringen och länkar till det sparade resultatet. Vid ett osäkert nätverkssvar sparas den bekräftade rundan i flikens sessionslagring; återförsök använder samma `requestId` och skapar inte en extra runda. API-klienter kan skicka en valfri UUID som `requestId`; samma nyckel med ett annat resultat ger 409. Klienter utan nyckel behåller sitt tidigare beteende.
- Profiler visar vinstprocent, snittplacering, senaste tio rundor, vinstsviter och de vanligaste rivalerna inom vald säsong. Bara kompletta, giltiga placeringar ingår. Frånvaro räknas inte som förlust; äldre rundor med bara vinnare visas separat.
- Arkivet går att söka på spelare och text, med 20 rundor per sida. Resultatsidan kan dela eller kopiera en länk. Den galaktiska krönikan finns kvar som alternativ vy.
- Migreringen `20261011220000_add_win_request_id` lägger till en nullable unik nyckel; historiska resultat och rankingregler ändras inte.
- Databastester för registrering är opt-in: `KINGPING_WIN_INTEGRATION=1 npx vitest run tests/wins-integration.test.ts --exclude '.claude/**'`. De kräver en separat lokal databas på `127.0.0.1` med namnet `kingping_quality` och tillämpade migreringar.

## Förbättringar
- Modal för `/pingis win`
- Slack signaturverifiering
- CSV export
- ~~Börja använda elo-system för rejting.~~ ~~Klassisk Elo går inte: vi sparar bara vem som vann~~  funkar nu
  rundan, aldrig vilka som spelade den. I stället ratas kronbytena — se
  `docs/superpowers/specs/2026-09-11-crown-rating-design.md`.
- Sammanställ vad användarna tänker om time on throne metric. Kronratingen ligger nu bredvid
  trontiden i tabellen så att de går att jämföra — trontiden rankar fortfarande.
- Ta bort write access för @rosendahlaxel
- Fundera på om stora stygga Bandeiras ska vara med som tema..
- Va
