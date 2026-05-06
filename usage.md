# Usage (hur man använder)

## Dashboard (`/`)
- Ser nuvarande Rundpingiskung.
- Ser senaste läget i riket.
- Registrerar dagens vinnare via formuläret “Krön vinnaren”.

## Spelare (`/players`)
- Lista befintliga spelare.
- Lägg till nya spelare via API/UI-flöde.

## Historik (`/history`)
- Tidslinje över tidigare matcher och kungörelser.
- Bra för att förstå streaks och regimskiften.

## Leaderboard (`/leaderboard`)
- Jämför spelare på vinster och regeringsdata.

## Settings (`/settings`)
- Visar om Slack-env är konfigurerade (utan att exponera hemligheter).

## API (MVP)
- `GET /api/state`
- `POST /api/wins`
- `GET /api/leaderboard`
- `GET /api/history`
- `GET /api/players`
- `POST /api/players`

## Slack (MVP)
- Slash command `/pingis` med underkommandon.
- Appen ska fungera även utan Slack-variabler; då sparas announcements lokalt utan postning.
