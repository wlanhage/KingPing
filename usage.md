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

## Rundan i repris (`/rundor/[id]`)
- Varje runda med sparad placering har ▶ Repris i krönikan.
- Sidan visar placeringen och spelar upp rundan i 3D: Jeditemplet på Coruscant, ewoks på läktaren, tre liv var och final mellan de två sista. Ordningen är den riktiga; bollarna däremellan är påhittade men likadana varje gång.
- Länken går att klistra in i Slack — delningsbilden visar vinnaren och placeringen.

## Leaderboard (`/leaderboard`)
- Jämför spelare på vinster och regeringsdata.

## Settings (`/settings`)
- Visar om Slack-env är konfigurerade (utan att exponera hemligheter).
- Visar loggboken: de senaste ändringarna i riket (kröningar, nya spelare, säsongsbyten) med tidpunkt och varifrån de gjordes. Appen har ingen inloggning, så loggen visar yta (`web`, `cli:namn`) — inte person.

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
