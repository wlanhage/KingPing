# Säsonger, badge-stegar och temalager

**Datum:** 2026-08-10
**Branch:** `seasonhandler`
**Status:** Godkänd design, redo för implementationsplan

## Bakgrund

Tre problem, som visade sig hänga ihop:

1. **Badge-stegar överlappar.** En spelare kan samtidigt bära `Dynastigrundaren` (≥3 raka
   vinster) och `HR-ärende` (≥4). Det ska aldrig kunna hända — högre nivå ska ersätta lägre.
2. **Ingen säsongsindelning.** Statistik och badges är all-time. Det ska gå att nollställa
   vid ny säsong och ändå kunna bläddra tillbaka till tidigare säsongers stats och badges.
3. **Temat är hårdkodat.** Riddartemat ligger som ~250 strängar i 18 filer. En säsong ska
   kunna byta utseende och namngivning (riddare → Star Wars osv.).

## Nuläge (kartlagt)

Load-bearing fakta som designen vilar på:

- **Badges är 100 % härledda.** Ingen `Badge`-tabell finns. Alla 32 badges räknas om från
  `WinEvent` + `Reign` vid varje request, i `lib/badges/badge-engine.ts`.
- **`getLeaderboard()` i `lib/domain/riket.ts` är den enda platsen** där spelarstats och
  badges produceras. `getKingdomStats`, `getPlayerStats`, `getPlayerProfile` och alla sidor
  går genom den.
- **Fyra tabeller totalt:** `Player`, `Reign`, `WinEvent`, `Announcement`. Inget är
  tidsperiod-scopat. De enda beständiga atomerna är `WinEvent.occurredAt` och
  `Reign.startedAt`/`endedAt` — allt annat är härlett.
- `BadgeDefinition` har redan ett `category`-fält (9 värden) som **bara används för
  sortering**, och ett `tone`-fält som inte används alls.
- Alla sidor är `force-dynamic` — inget cache-lager att invalidera.

## Beslut

| Fråga | Val | Konsekvens |
|---|---|---|
| Badges i avslutade säsonger | **Härledda** | Ingen badge-tabell, ingen rollover-logik för badges. Ändrade badge-regler slår retroaktivt på gamla säsonger — accepterat. |
| Säsongsbyte | **Script, ingen UI** | `npm run season:new`. Ingen adminyta i Rådet. |
| Temadjup | **Identitet + färger** | Appnamn, nav, rubriker, epitet, roller, badge-namn, utropstexter, färgpalett. Inte varenda knapptext. |
| Ordning | **Stegar → säsong → tema** | Tre fristående, körbara steg. |
| Tron vid säsongsstart | **Tom** | Öppen regering stängs vid säsongsslut. Ingen är kung förrän någon vunnit i den nya säsongen. |

---

## Del 1 — Badge-stegar

### Problem med att återanvända `category`

`category: 'streak'` innehåller både stegen (`dynasty_founder` → `hr_case` → `tyrant` →
`state_owned`, alla på `longestStreak`) **och** `defender_of_the_throne`, som mäter
`currentStreak` — en annan axel. Att göra `category` exklusiv skulle felaktigt dölja
`defender_of_the_throne`. Därför behövs ett separat, finare begrepp.

### Lösning

Två nya valfria fält på `BadgeDefinition` i `lib/badges/badge-types.ts`:

```ts
ladder?: string;   // vilken stege badgen tillhör
tier?: number;     // nivå inom stegen, högre = bättre
```

Badges utan `ladder` beter sig exakt som idag. `category` lämnas orört och används
fortsatt bara för sortering.

### Stegar

Annoteras i `lib/badges/badge-definitions.ts`:

| `ladder` | `tier` | Badge | Villkor (oförändrat) |
|---|---|---|---|
| `longest_streak` | 1 | `dynasty_founder` | `longestStreak >= 3` |
| `longest_streak` | 2 | `hr_case` | `longestStreak >= 4` |
| `longest_streak` | 3 | `tyrant` | `longestStreak >= 5` |
| `longest_streak` | 4 | `state_owned` | `longestStreak >= 7` |
| `recent_form` | 1 | `hot_right_now` | `winsLast7Days >= 2` |
| `recent_form` | 2 | `momentum` | `winsLast7Days >= 3` |
| `inactivity` | 1 | `cold` | `daysSinceLastWin >= 14` |
| `inactivity` | 2 | `frozen` | `daysSinceLastWin >= 30` |

Alla övriga 24 badges får ingen `ladder`.

### Kollaps

I `getPlayerBadges`, efter att kandidatlistan byggts och dubbletter tagits bort, men
**före** sorteringen:

```ts
function collapseLadders(badges: ComputedPlayerBadge[]): ComputedPlayerBadge[] {
  const best = new Map<string, ComputedPlayerBadge>();
  const passthrough: ComputedPlayerBadge[] = [];
  for (const b of badges) {
    const ladder = b.definition.ladder;
    if (!ladder) { passthrough.push(b); continue; }
    const prev = best.get(ladder);
    if (!prev || (b.definition.tier ?? 0) > (prev.definition.tier ?? 0)) best.set(ladder, b);
  }
  return [...passthrough, ...best.values()];
}
```

Villkoren i engine ändras inte — bara efterbehandlingen. Det gör ändringen liten och
möjlig att verifiera isolerat.

### Acceptanskriterier

- En spelare med `longestStreak = 7` har exakt **en** badge från `longest_streak`
  (`state_owned`), inte fyra.
- En spelare med `longestStreak = 4` har `hr_case`, inte `dynasty_founder`.
- `defender_of_the_throne` visas fortfarande parallellt med en stege-badge.
- Spelare med `winsLast7Days = 3` har `momentum`, inte `hot_right_now`.
- Spelare med `daysSinceLastWin = 30` har `frozen`, inte `cold`.

### Känd kvarvarande överlappning

`lost_heir` (`totalWins >= 5 && daysSinceLastWin >= 30`) samexisterar alltid med `frozen`.
Bedöms som en egen axel (historisk relevans, inte bara inaktivitet) och lämnas utanför
`inactivity`-stegen. Flaggat medvetet, inte förbisett.

---

## Del 2 — Säsonger

### Datamodell

En ny tabell. Inget annat schema ändras.

```prisma
model Season {
  id        String    @id @default(cuid())
  slug      String    @unique   // "s1", "s2"
  name      String              // "Rundpingisriket"
  theme     String              // temanyckel, se Del 3
  startedAt DateTime
  endedAt   DateTime?           // null = pågående
}
```

### Varför inget `seasonId` på WinEvent/Reign

En regering kan spänna över en säsongsgräns. En främmande nyckel kan inte uttrycka att
halva regeringen hör till säsong 1 och halva till säsong 2 — ett datumintervall kan
klampas. Datumintervall är alltså den korrekta modellen, inte bara den enklare. Det
slipper dessutom migration-backfill.

### Scoping-regler

Ett säsongsfönster är `[startedAt, endedAt ?? now)`.

- **WinEvent ingår om:** `occurredAt >= season.startedAt` och
  (`season.endedAt` är null eller `occurredAt < season.endedAt`).
- **Reign ingår om den överlappar fönstret:** `reign.startedAt < (season.endedAt ?? now)`
  och (`reign.endedAt` är null eller `reign.endedAt > season.startedAt`).
- **Regeringstid klampas till fönstret:**
  `min(reign.endedAt ?? windowEnd, windowEnd) - max(reign.startedAt, season.startedAt)`.
  Detta är obligatoriskt — att bara filtrera rader ger fel siffror.
- **`now` för en avslutad säsong är `season.endedAt`**, inte dagens datum.
  `calculatePlayerStats` har redan en `now`-parameter som aldrig får ett värde
  (`buildPlayerStats` skickar den inte vidare); den ska nu tas i bruk. Detta gör att
  rullande fönster (`winsLast7Days`, `winsLast30Days`, `daysSinceLastWin`) blir
  meningsfulla även i historiska säsonger.

### Streak nollställs vid säsongsstart

`WinEvent.streakCount` sparas vid skrivning och beräknas idag mot all-time-historik. Ett
datumfilter nollställer den alltså **inte**. `recordWin` ändras till att räkna streak mot
den senaste vinsten **inom den aktiva säsongen**. Utan detta fortsätter en pågående streak
över säsongsgränsen.

### Kung

- **Aktiv säsong:** som idag, `Reign` med `endedAt = null`.
- **Avslutad säsong:** "kung vid säsongens slut" = den regering som var öppen vid
  `season.endedAt`.

### Genomföring i koden

`getLeaderboard()` tar emot en säsong och skickar ner fönstret i sina två queries. Eftersom
alla andra anrop går genom den täcker det nästan hela appen. Utöver den:

- `getCurrentKing()` — säsongsmedveten enligt ovan.
- `getPlayerNemesis()` — har en egen `winEvent`-query som behöver samma filter.
- `getPlayerTimeline()` — samma.
- `recordWin()` — streakberäkning enligt ovan.

### Säsongsbyte

Script: `npm run season:new -- --slug s2 --name "..." --theme star-wars`

1. Hämta aktiv säsong.
2. Stäng eventuell öppen regering (`endedAt = now`).
3. Sätt `season.endedAt = now` på den aktiva säsongen.
4. Skapa ny säsong med `startedAt = now`, `endedAt = null`.

Stegen 2–4 körs i en transaktion.

### Bootstrap

En seed/migration skapar säsong `s1` med `startedAt` = tidigaste `WinEvent.occurredAt`
(eller `now` om databasen är tom), `endedAt = null`, `theme = "realm"`. Om ingen säsong
finns ska koden inte krascha — den behandlar hela historiken som en implicit pågående
säsong.

### Navigering

- `/leaderboard` — pågående säsong.
- `/leaderboard?season=s1` — tidigare säsong.
- Samma `?season=`-mönster på spelarprofil och historik.
- En säsongsväljare visas när det finns fler än en säsong.

### Acceptanskriterier

- Efter säsongsbyte är alla spelares stats och badges nollställda i den nya säsongen.
- `?season=s1` visar säsong 1:s stats och badges, oförändrade av vad som händer i säsong 2.
- En regering som spänner över gränsen räknas med rätt antal timmar i **båda** säsongerna,
  och summan överstiger inte den faktiska regeringstiden.
- En spelare som hade 4 i streak när säsongen tog slut börjar nästa säsong på 0.
- Ingen är kung direkt efter ett säsongsbyte.

---

## Del 3 — Temalager

### Struktur

```
lib/theme/
  theme-types.ts      // Theme-typen
  themes/realm.ts     // nuvarande riddartema (extraherat, inte nyskrivet)
  themes/star-wars.ts
  index.ts            // THEMES-registret + getTheme(themeKey)
```

### Vad temat äger

```ts
type PageKey = 'home' | 'leaderboard' | 'history' | 'players' | 'badges' | 'settings';

export type Theme = {
  key: string;
  appName: string;
  tagline: string;
  nav: Record<PageKey, string>;
  pages: Record<PageKey, { title: string; subtitle: string }>;
  epithets: { rank1: string; rank2: string; rank3: string };
  roles: { monarch: string; challenger: string; player: string; players: string };
  badgeOverrides: Record<string, { name?: string; description?: string; emoji?: string }>;
  // Samma former som dagens export i lib/copy/templates.ts — flyttas in i temat oförändrade.
  announcements: {
    streakTemplates: Record<EventType, string[]>;
    nationIntros: Record<NationState, string[]>;
    fridayIntros: string[];
  };
  colors: Record<'bg' | 'panel' | 'panelSoft' | 'text' | 'muted' | 'accent' | 'accent2' | 'border' | 'gold', string>;
};
```

### Upplösning

`season.theme` → `THEMES[key]` → serverkomponenter får temat som prop, klientkomponenter
via en `ThemeProvider`-context i `app/layout.tsx`. Faller tillbaka på `realm` om nyckeln
är okänd.

### Färger

Temats `colors` skrivs som CSS-variabler på `<html>` i `app/layout.tsx`. Det gör att
`globals.css` inte behöver dupliceras per tema, och att befintliga klassnamn
(`royal-*`, `knight-*`, `crown-*`) kan ligga kvar — de blir namn, inte utseende.

### Badge-namn

`badgeOverrides` är partiella och slås upp per badge-id med fallback till
`badge-definitions.ts`. Ett tema behöver alltså inte döpa om alla 32.

**Badge-logiken rörs inte.** `badge-engine.ts` avgör fortsatt *vem* som får vad; temat
avgör bara vad det *heter*. Det är därför Del 3 kan komma sist utan att blockera något.

### Acceptanskriterier

- Byte av `season.theme` ändrar appnamn, nav, rubriker, epitet, badge-namn och färger
  utan att någon komponent behöver ändras.
- Okänd temanyckel faller tillbaka på `realm` utan krasch.
- Ett tema som saknar `badgeOverrides` för en badge visar basdefinitionens namn.
- En avslutad säsong visas med *sitt* tema, inte det nuvarande.

---

## Utanför scope

Medvetet utelämnat, inte förbisett:

- `reason`-strängarna i `badge-engine.ts` (förklaringar, inte identitet).
- Kröningens ljud och jester-roasts i `Coronation.tsx`.
- Prisma-enumvärden (`TYRANNY`, `SAME_KING_STREAK_3` …) — interna, temat mappar dem vid
  visning.
- Adminyta i Rådet för säsongsbyte.
- Omdöpning av CSS-klassnamn.
- `lost_heir`/`frozen`-överlappningen (se Del 1).

## Risker

- **Retroaktiva badges.** Härledda badges innebär att ändrade badge-regler skriver om
  historien. Accepterat val; värt att minnas den dagen reglerna ändras.
- **Klampning är lätt att få fel.** Regeringstid över säsongsgräns är designens enda
  icke-triviala beräkning och bör täckas av test först.
- **Prestanda.** `getPlayerStats` anropar `getLeaderboard()` internt, som hämtar alla
  spelare. Säsongsfilter gör inte detta värre, men det finns inget cache-lager. Vid
  kontorsskala (8 spelare) är det oproblematiskt.
