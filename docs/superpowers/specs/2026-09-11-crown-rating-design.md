# Kronrating — rating som inte räknar kalendern

**Datum:** 2026-09-11
**Branch:** `claude/peaceful-pascal-p17i4n`
**Status:** Genomförd. Verifierad mot seedad data (15 kröningar, 7 spelare).

## Vad frågan egentligen var

README bad om "elo-system för rejting". Klassisk Elo går inte att räkna på den här datan:
en runda rundpingis spelas av alla runt bordet, men `WinEvent` sparar bara vinnaren.
Motståndarlistan finns inte, och utan den finns ingen förväntad poäng att räkna på.

Samma lista ber om att "sammanställa vad användarna tänker om time on throne metric". De två
punkterna är samma fråga. Tabellen rankar på `totalReignMs`, och trontid mäter kalendern lika
mycket som spelet: en vinst klockan 16 på en fredag ger kronan hela helgen utan att ett enda
bollbyte spelas. Behovet bakom "elo" är en stege som mäter spelet i stället för klockan.

## Beslut

| Fråga | Val |
|---|---|
| Vad ratas? | Kronbytet — det enda riktiga motståndsförhållandet i datan |
| Övertag (ny kung) | Duell mot den avsatta kungen, vanlig Elo-uppdatering |
| Försvar (samma kung) | Mot fältets snittrating — försvar måste räknas, hela spelet handlar om svit |
| Tom tron (säsongens första) | Ingen ratingändring, spelaren tar bara plats i tabellen |
| Vem tappar rating vid försvar? | Ingen. Fältet rörs inte |
| Startvärde / K | 1000 / 32 |
| Omfång | Per säsong, kronologiskt |
| Tabellens primära sortering | **Oförändrad** — trontid rankar fortfarande |

Kronbytet är inte en nödlösning: det är samma enhet som `dominance()`, `stolenReign()`,
`getPlayerNemesis()` och badgesen `overlord`, `usurper` och `king_slayer` redan räknar på.

### Varför fältet inte tappar rating vid ett försvar

Kungen besegrade i praktiken alla som spelade rundan, men vi vet inte vilka de var. Att dra
rating från alla skulle straffa den som var ledig — man ska inte komma tillbaka från en veckas
semester till en sänkt rating. Samma regel gäller redan vid övertag: bara den avsatta kungen
tappar, inte hela fältet.

Priset är att summan av all rating sakta stiger under en säsong (135 poäng över 15 kröningar i
seeden). Det spelar ingen roll: tabellen jämför spelare med varandra inom en säsong, aldrig mot
ett absolut tal eller mot en annan säsong.

### Varför ratingen inte skenar på en lång svit

Försvaret räknas mot fältets snitt, så ju högre över fältet kungen ligger desto mindre ger nästa
försvar. Det är Elos egen bromsmekanism, inte en påbyggd spärr.

## Kod

`lib/domain/crown-rating.ts` — `crownRatings(wins)` är en ren funktion över en lista kröningar,
samma form som `dominance()` och `stolenReign()`. Ingen databas, inget schemabyte.

**Fällan:** Elo är ordningsberoende, och `getLeaderboard` samlar vinsterna med
`players.flatMap(...)` — alltså grupperade per spelare, inte kronologiska. `crownRatings`
sorterar därför själv i stället för att lita på anroparen. Testet
"ordningen i inlistan spelar ingen roll" vaktar det.

## Vad som INTE ändrades

Tabellen rankar fortfarande på trontid. Att byta stege är ett beslut för kontoret, inte för
den som bygger måttet — kronratingen läggs bredvid trontiden just för att de ska gå att
jämföra först.

## Verifiering mot seedad data

De två stegarna är oense, vilket är hela poängen:

```
             trontid   rating  rundor  vinster  längsta streak
Anna           1m        1034      4        3        2
Erik           0m        1028      4        4        4
Calle          0m        1069      7        6        6

trontid-ordning: Anna > Erik > Calle
rating-ordning:  Calle > Anna > Erik
```

Calle vann sex rundor och byggde en svit på sex — och ligger trea på trontid, för att Anna
råkar sitta på kronan just nu. Ratingen sätter honom först.

Aymen och Lucas har aldrig varit inblandade i ett kronbyte och visas som `—`, inte som 1000:
ett startvärde är inte ett resultat.

## Nästa steg (inte byggt)

- En badge för högst kronrating i riket — kräver `maxCrownRating` i `GlobalStats`.
- Ratingförändringen (`+18`) i kröningens text och i krönikan.
- Ratingkurva över säsongen på spelarprofilen.
