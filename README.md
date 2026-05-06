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
## Förbättringar
- Modal för `/pingis win`
- Slack signaturverifiering
- CSV export
