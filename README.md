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
## MCP
MCP-server med rikets data som verktyg (`scripts/mcp.ts`), för Claude Code/Desktop.
- Den pratar med appens API-rutter, så starta `npm run dev` (eller sätt `KINGPING_URL` till prod-urlen).
- `.mcp.json` i repot registrerar den i Claude Code — svara ja när den frågar.
- Verktyg: `pingis_current_king`, `pingis_players`, `pingis_leaderboard`, `pingis_player`, `pingis_history`, `pingis_record_win`.
- Protokollkoll utan databas: `node scripts/mcp.ts --selfcheck`

## Förbättringar
- Modal för `/pingis win`
- Slack signaturverifiering
- CSV export
- ~~Börja använda elo-system för rejting.~~ Klassisk Elo går inte: vi sparar bara vem som vann
  rundan, aldrig vilka som spelade den. I stället ratas kronbytena — se
  `docs/superpowers/specs/2026-09-11-crown-rating-design.md`.
- Sammanställ vad användarna tänker om time on throne metric. Kronratingen ligger nu bredvid
  trontiden i tabellen så att de går att jämföra — trontiden rankar fortfarande.
- Ta bort write access för @rosendahlaxel
- Fundera på om stora stygga Bandeiras ska vara med som tema..
- Va
