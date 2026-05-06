# Setup (enkelt)

## 1) Förutsättningar
- Node.js 20+
- npm 10+
- Ett Supabase-projekt (Postgres)
- (Valfritt) Slack workspace + Slack App

## 2) Klona och installera
```bash
git clone <repo-url>
cd KingPing
npm install
```

## 3) Miljövariabler
Skapa `.env` från exempel:
```bash
cp .env.example .env
```

Fyll i minst:
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL` (t.ex. `http://localhost:3000`)

För Slack (valfritt i lokal MVP):
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET`
- `SLACK_CHANNEL_ID`

## 4) Databas
```bash
npx prisma migrate dev
npx prisma db seed
```

## 5) Starta appen
```bash
npm run dev
```
Öppna: `http://localhost:3000`

## 6) Snabbkontroll
- Dashboard laddar
- Du kan skapa/registrera vinnare
- Leaderboard och historik visar data
