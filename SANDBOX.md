# Sandlåda för att testa säsongsavslutningen

En lokal engångskopia av databasen, så hela säsongsslutet går att testa utan att
Neon-databasen påverkas.

## Läget just nu

- Docker-container `kingping-sandbox` (Postgres 16) på port **5434**
- Innehåller en kopia av den riktiga datan: 7 spelare, 21 regeringar, 35 vinster
- Säsong **s1 är avslutad** och **s2 "Ett nytt hopp" (star-wars)** är igång
- `.env.local` pekar om appen dit — Next.js läser den FÖRE `.env`

## Testa

```bash
npm run dev
```

- `http://localhost:3030/` — dörren "Säsong 1 är över" möter dig en gång, sedan
  ligger återse-länken kvar. Appen är i Star Wars-tema (s2).
- `http://localhost:3030/seasons/s1/final` — hela finalen, ingen `?preview=1` behövs.
- Lägg till `?cinema=1` för TV-läget.

Dörren visas bara en gång per webbläsare. Vill du se den igen:
`localStorage.removeItem('kp-finale-seen-s1')` i konsolen, ladda om.

## Kasta sandlådan

```bash
docker rm -f kingping-sandbox && rm .env.local
```

Därefter är appen tillbaka på Neon. `.env` har aldrig rörts.

## Börja om från början

```bash
docker rm -f kingping-sandbox
docker run -d --name kingping-sandbox -e POSTGRES_PASSWORD=sandbox -e POSTGRES_DB=kingping -p 5434:5432 postgres:16
sleep 6
DATABASE_URL="postgresql://postgres:sandbox@localhost:5434/kingping" DIRECT_URL="postgresql://postgres:sandbox@localhost:5434/kingping" npx prisma migrate deploy
npx tsx --env-file=.env.local scripts/restore-db.ts "$(ls -t backups/*.json | head -1)"
npx tsx --env-file=.env.local scripts/season.ts bootstrap
npx tsx --env-file=.env.local scripts/season.ts new --slug s2 --name "Ett nytt hopp" --theme star-wars --yes
```
