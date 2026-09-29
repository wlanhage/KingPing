# Rundan i repris — varje runda som en 3D-rekonstruktion

**Datum:** 2026-09-29
**Branch:** `claude/innovative-game-feature-196a67`
**Status:** Design godkänd, inte byggd.

## Vad det är

Sedan 15 september sparas hela placeringen per runda (`WinEvent.standings`, vinnaren först, den som
åkte ut först sist). Det är en lista id:n — men det är också en berättelse. Rundan i repris spelar upp
den: spelarna springer runt bordet som racket-figurerna från scenerna, tappar liv, åker ut i exakt den
ordning de gjorde, och de två sista spelar final tills kronan faller.

Ordningen är sann. Allt annat — vilka bollar som missades innan, hur många slag emellan — är påhittat,
men seedat på rundans id: samma runda spelas upp likadant varje gång.

## Beslut

| Fråga | Val |
|---|---|
| Var ses den? | Egen sida `/rundor/[id]`, länkad från krönikan. Kröningen rörs inte |
| Regler i reprisen | Liv (standard 3), sedan final mellan de två sista |
| Slumpen | Seedad på rundans id — samma runda, samma repris |
| Längd | ~20–40 s. Många spelare = snabbare rally, inte längre film |
| Rundor utan placering | Ingen ▶ i krönikan. Direktlänk ger en rad om varför, och länk tillbaka |
| Utan WebGL / reduced motion | Placeringen som lista — den står alltid på sidan |
| Delning | Og-bild med placeringen, så länken blir fin i Slack |

## Arkitektur

Reprisen är en vanlig `Scene` (samma form som Mustafar och Cloud City), men byggd ur data i stället för
hårdkodad. `StageShow` får en `scenes`-prop bredvid `sequence`; därmed följer overlay, undertexter,
svärta, ↻ Spela igen och reserv vid tappad WebGL-kontext med utan att skrivas om.

```
WinEvent.standings ─► planRound(standings, seed, lives) ─► RoundPlan (beats med tider)
                                                              │
                                        rundanScene(plan, names) ─► Scene ─► StageShow
```

### `components/stage/rundan.ts` — planen (ren, testad)

`planRound(standings, seed, lives = 3)` → `{ beats, duration }`. Beats i tidsordning:

- `hit` — bollen till andra kortsidan; alla i ringen flyttar ett steg.
- `miss` — spelaren tappar ett liv (inte det sista).
- `out` — spelarens sista liv; hen går till bänken.
- `final` — markerar att två står kvar.
- `final-hit`, `final-miss` — duellen; tvåan missar.
- `crown` — kronan faller på vinnaren.

Regler planen alltid håller:

1. De utslagna åker ut i omvänd placeringsordning: `standings[n-1]` först, `standings[2]` sist före finalen.
2. Varje utslagen missar exakt `lives` gånger, och den sista missen är `out`.
3. Finalisterna (`standings[0]`, `standings[1]`) missar högst `lives - 1` gånger före finalen.
4. Samma `seed` ger samma plan.
5. Två spelare: direkt till finalen.
6. Hela planen ryms inom 40 s; slagintervallet krymper med antalet missar.

Påhittade missar före varje utslagning dras bland de spelare som har minst två liv kvar, så att ingen
annan kan råka åka ut i fel ordning.

### `components/stage/scenes/rundan.tsx` — scenen

`rundanScene(plan, names): Scene`. Allt är funktioner av tiden, som i övriga scener.

- **Bordet** i mitten med nät. Spelarna (`Racket`) på en oval bana runt bordet, i en färg ur namnet
  (samma hash som vapnet), med namn och livsprickar (●●○) ovanför — `Billboard` + `Text` som i finalen.
- **Varven:** varje `hit` är en bollbåge mellan kortsidorna, och ringen roterar ett steg.
- **Miss:** bollen flyger förbi, `shock`-ansikte, en prick slocknar.
- **Utslagning:** kort närbild, spelaren går till bänken och sätter sig (`sad`). Undertext
  *"Han åker ut · 6:e plats"*.
- **Finalen:** *"FINALEN"* slammas, duell vid kortsidorna, tvåan missar, kronan faller på vinnaren,
  *"Yoda · {crowningWord}"*.
- **Ljud:** ny cue `pok` per slag. `playCueSound` exporteras ur `Coronation.tsx`; `slam` återanvänds
  vid utslagning.

### `app/rundor/[id]/page.tsx` — sidan

Serverkomponent. Hämtar rundan och namnen i placeringen; temat från säsongen rundan spelades i
(`listSeasons` + `isWinInSeason`, annars pågående). Visar rubrik, datum och placeringen som lista
(1. vinnaren 👑 … sist den som åkte ut först), och knappen **▶ Spela rundan** (klientkomponent) som
monterar `StageShow` med scenen. Klicket startar också ljudet — webbläsaren kräver en gest.

- Okänt id → `notFound()`.
- Runda utan placering → en rad om varför, och länk tillbaka till krönikan.

### Krönikan

`app/history/page.tsx` hämtar `standings`. Rundor med minst två i placeringen får **▶ Repris** —
både i textrullen (`CrawlItem.replayHref`) och i riddartemats lista.

### `app/rundor/[id]/opengraph-image.tsx`

`OgFrame` med "Rundan i repris", datum och placeringen, kronan på vinnaren. Samma mönster som
finalens og-bild.

## Test

`tests/rundan.test.ts`, på den rena planen:

- ordningen stämmer för 2, 3, 6 och 12 spelare, över många seeds;
- varje utslagen missar exakt `lives` gånger, sista missen är `out`;
- finalisterna har alltid liv kvar till finalen;
- samma seed → samma plan;
- två spelare → direkt final;
- tolv spelare → under taket;
- scenens kamera och positioner är ändliga tal i varje tidssteg.

Verifiering i webbläsaren mot en lokal slängdatabas: några rundor med placering inspelade via
formuläret, reprisen uppspelad, skärmbilder från varv, utslagning, final och kröning.

## Inte med (medvetet)

- **Reprisen före kröningen.** Valdes bort: kröningen ska inte vänta 30 s på en film av rundan man
  just spelade.
- **Spelare med skrubbning, paus och 2×.** Lägg till om folk vill hoppa till "när Axel åkte ut".
- **Porträtt på racketarna** i galaxtemat. Namnskylten räcker för att veta vem som är vem.
- **Riktiga tider per utslagning.** Formuläret sparar ordningen, inte klockslagen.
