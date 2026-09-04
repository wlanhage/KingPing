# Säsongsfinalen — "Krönikan"

**Datum:** 2026-08-28
**Branch:** `seasonhandler` (bygger på säsongs- och temalagret)
**Status:** Genomförd (v1) på `seasonhandler`. Akt 1, 3, 5 och 6 byggda, verifierade mot
skarp data (35 kröningar, 21 tronskiften, 7 spelare).

Avvikelser och fynd under bygget:
- Fyra buggar hittades av granskningen och rättades: dubbelflippat bågtecken i
  vävgeometrin, räknare som visade 0 under reduced motion, `{ once: true }` som avväpnade
  cinema-lägets stopptangent, och en temacrossfade vars selektorsträng aldrig kunde träffa
  sin target (`gsap.context` scopar till ättlingar; wrappern är förfader).
- `.numbers-dragon` stänger av arvet av `coro-fly`: en CSS-animation slår inline-styles och
  hade tagit över GSAP:s inflygning.
- Musiken ligger på plats som WAV (48 kHz stereo), extraherad ur Audacity-projekten.
  Saknas filerna kör finalen fortfarande tyst, som designat.

## Vad det är

En filmisk skrollupplevelse som visas när en säsong avslutas: en resa genom säsongens
statistik i akter, som kulminerar i **Kronans vandring** — en vävd graf över alla
tronskiften — och slutar i att vinnaren förstoras och kröns. Sidan fungerar för varje
avslutad säsong och blir därmed också det första arkiv-UI:t.

## Beslut

| Fråga | Val |
|---|---|
| Väven (kronans vandring) | Exklusiv för finalen — ingen live-vy under pågående säsong |
| Visning | Auto-visas EN gång (localStorage-flagga), kan alltid återses via länk |
| Placering | Väven är den avslutande akten i skrollresan |
| Musik | Williams egen låt: intro en gång → loop tills stängning, synth-stingers ovanpå |
| Bibliotek | GSAP (ScrollTrigger + MotionPath) + Lenis |
| Cinema-läge | Med i v1 (`?cinema=1`, autoskroll för kontors-TV:n) |
| Omfång v1 | Akt 1, 3, 5, 6 — prologen och prisgalan väntar till v2 |

## Trigger & navigering

- **Route:** `app/seasons/[slug]/final/page.tsx`. Endast avslutade säsonger — pekar
  slugen på en pågående säsong visas "säsongen pågår ännu" med länk tillbaka.
- **Dörren:** när appen öppnas och senaste avslutade säsongens finale inte är sedd
  (`kp-finale-seen-<slug>` saknas i localStorage) läggs en helskärmsdörr över Tronsalen:
  *"Säsong 1 är över. Träd in i krönikan."* Knappar: **Träd in** (navigerar) och
  **Inte nu**. Båda sätter flaggan — dörren visas aldrig två gånger.
- **Klicket på dörren är ljudtillståndet.** Webbläsares autoplay-policy kräver en
  användargest innan ljud — dörrklicket är gesten. Musiken startar först inne i finalen.
- **Återse:** en diskret länk på Tronsalen när minst en avslutad säsong finns:
  *"Återse krönikan · Säsong 1"*. Vid direktnavigering till finalen utan dörrklick
  (t.ex. återbesök) visas en enkel startvy med "Börja"-knapp — samma gest-lösning.

## Data

En server-side summary-byggare, `lib/domain/finale.ts`:

```
buildFinaleSummary(season) → {
  season, theme,
  standings,        // getLeaderboard(season) — stats + badges, redan säsongsscopat
  transfers,        // [{ fromId|null, toId, occurredAt, eventType, announcementText }]
                    //   fromId null = första kröningen (från tomma tronen)
                    //   ENDAST tronskiften — försvar (same king) blir defenceCount per reign
  defences,         // { playerId: antal }
  peaks,            // längsta streak (spelare, längd), största störtandet (event)
  wrapped,          // snittregering, kortaste regering, flest fredagsvinster, tid-på-dygnet
  notes,            // note-fältet från säsongens WinEvents (de som finns)
}
```

Allt härleds ur befintliga tabeller — ingen migration. Sidan är `force-dynamic` som
övriga, klientkomponenten får hela summaryn som JSON-prop.

## Akterna (v1)

Numreringen följer den fulla sexaktsdramaturgin från brainstormen — akt 2 (prologen)
och akt 4 (prisgalan) är medvetet utelämnade ur v1, se v2-listan nedan.

### Akt 1 — Kallöppning
Svart skärm. Säsongens namn i temats typsnitt tonar in, datumspann, tre rader:
"33 kröningar. 7 riddare. En tron." (siffror ur summaryn). Musiken börjar.

### Akt 3 — Resan i siffror
2–3 pinnade moment med scrub:
- **Streakberget** — vägen klättrar, `coro-dragon`-drakarna flyger in vid toppen,
  spelarens namn + streaklängd.
- **Största störtandet** — störtdyk med det riktiga utropet (`announcementText`) som skylt.
- **Wrapped-panel** — snabba räknare: snittregering, kortaste regering (💀-ton), flest
  fredagsvinster. Anteckningar (`note`) som marginalklotter om de finns.

### Akt 5 — Kronans vandring (väven)
Finalens huvudnummer, pinnad sektion där skrollen skrubbar uppspelningen:

- **Layout:** spelarkorten i två kolumner, hälften vänster / hälften höger (udda antal →
  extra kort till vänster). Placeringsregel: paret med flest inbördes tronskiften sätts
  mitt emot varandra så fejd-flätan korsar mitten. Tomma tronen som startnod överst i
  mitten.
- **Kurvorna:** kvadratiska Béziers. Kontrollpunktens offset vinkelrätt mot mittpunkten,
  magnitud = f(parets överföringsindex) så upprepade byten får växande bågar ("fläta").
  Riktningskodning: A→B bågnar åt ena hållet, B→A åt andra, plus pilhuvud.
- **Uppspelning:** linjerna ritas kronologiskt (stroke-dashoffset), en kronikon reser
  längs aktuell linje (MotionPath). Mottagarkortet pulserar, vinsträknaren tickar.
  Skrubbning bakåt spolar tillbaka.
- **Försvar är inte linjer:** streak-vinster ger kortet en puls + sköldräknare som tickar.
- **Vinnarsekvensen:** när sista linjen landat → icke-vinnarlinjer tonas → korthalvorna
  glider isär som en ridå → vinnarkortet växer mot mitten och vecklar ut sig: stats
  räknar upp, badges i omloppsbana (orbit-mönstret från `PlayerHero`) → **Coronation
  återanvänds** som crescendo (konfetti + fanfar finns redan). Triggas exakt en gång per
  passage förbi slutet.
- **Kantfall:** säsong där tronen aldrig bytte ägare → väven blir tronlinjen + pulser,
  och vinnarsekvensen körs direkt. Säsong utan vinster → finalen visar en tom-tron-vy.

### Akt 6 — Epilog
Temareveal: om en ny säsong redan pågår med annat tema tonar paletten och namnet över
till det (CSS-variablerna byts animerat). Därefter eftertexter: alla spelare rullar
förbi med sina säsongsepitet, narr-roasts insprängda, "Ingen pingisboll kom till skada."

### v2 (utanför scope, dokumenterat för att inte tappas)
Prologen (första kröningen som egen akt), prisgalan med utdelning per badge,
sonifiering av väven (en ton per tronskifte), spelarkort/OG-bilder för Slack-delning,
automatisk Slack-post vid säsongsslut.

## Ljud

Musiken är tvådelad, komponerad av William: ett **intro** som spelas en gång och en
**loop** som därefter upprepas sömlöst tills finalen stängs.

- **Filer:** `public/audio/finale-intro.wav` + `public/audio/finale-loop.wav`
  (per-säsong-varianter `finale-intro-<slug>.wav` osv. har företräde; `.mp3` accepteras
  som fallback). **WAV, inte MP3:** MP3-kodning lägger till tystnad i början och slutet
  (encoder delay/padding) som följer med in i den avkodade bufferten och ger ett hörbart
  glapp vid varje looprunda.
- **Källor:** Audacity-projekten (`season_end_start.aup3`, `season_end_loop.aup3`).
  Webbläsare kan inte spela `.aup3` — de är SQLite-databaser. Ljudet extraherades ur
  projekten (float32-sampelblock, 48 kHz stereo) och skrevs till WAV: intro 9,82 s,
  loop 6,49 s. `.aup3` är gitignorerad och hör inte hemma i `public/`.
- **Sömlös loop kräver Web Audio, inte `<audio loop>`:** `<audio>`-elementets loop har
  hörbara glapp. I stället: hämta + `decodeAudioData` på båda filerna, spela introt som
  `AudioBufferSourceNode`, schemalägg loop-noden att starta **exakt** vid introts slut
  (sample-exakt via `AudioContext`-klockan) med `loop = true`. Stoppas vid unmount/mute.
  Detta bygger på samma AudioContext-mönster som Coronation redan använder.
- **Saknas filerna körs finalen tyst** — ingen krasch, ingen väntan. Bygget är inte
  blockerat av att musiken inte är exporterad ännu.
- **Stingers:** befintliga WebAudio-ljud från Coronation (fanfar, sad trombone)
  återanvänds vid vinnarsekvensen och 💀-momenten, lagda ovanpå musiken.
- **Mute-toggle** med localStorage, samma mönster som `kp-coronation-muted`.
- Volymen duckas när fliken är dold (`visibilitychange`).

## Cinema-läge

`?cinema=1`: en GSAP-tween på scrollpositionen som spelar hela resan i lagom takt
(målhastighet: hela finalen ≈ låtens längd om bastracken finns, annars ~90 s).
Klick/space pausar och lämnar över till manuell skroll. Byggt för premiärvisning på
kontors-TV:n.

## Teknik

- **Nya beroenden:** `gsap` (ScrollTrigger, MotionPathPlugin — numera gratis) och
  `lenis`. Inga andra.
- **Struktur:** `app/seasons/[slug]/final/page.tsx` (server) → `components/finale/`
  (klient: `SeasonFinale`, `CrownWeave`, `FinaleDoor`, akterna) → `lib/domain/finale.ts`
  (summary). Grafbygget (transfers → kurvor med offsets) är ren matte i
  `lib/domain/finale.ts` och **enhetstestas** (antal linjer, offsets per par,
  riktningstecken, kantfallen).
- **SVG-väv,** ingen 3D. Kurvmatten är ~15 rader.
- **`prefers-reduced-motion`:** inga pins, ingen autoskroll, väven färdigritad, allt
  innehåll i statisk följd — mönstret från Coronation.
- **Mobil:** fungerar (viewBox skalar, akterna staplas), men designas desktop-först —
  primärskärmen är TV:n och kontorsdatorer.
- Dörren (`FinaleDoor`) monteras i Tronsalen, inte i layouten — den hör hemma där.

## Acceptanskriterier

- Dörren visas exakt en gång per avslutad säsong och webbläsare; båda knapparna sätter
  flaggan; finalen nås alltid via återse-länken.
- Väven: antal linjer = antal tronskiften (försvar syns som pulser/räknare, inte linjer);
  ett par med n byten får n distinkta bågar; riktning avläsbar via bågsida + pilhuvud.
- Skrubbning fram/tillbaka fungerar; vinnarsekvens + Coronation triggas exakt en gång
  per passage.
- Cinema-läget spelar hela resan utan interaktion och pausar vid klick/space.
- Ljud startar aldrig utan användargest; saknade musikfiler ger tyst finale utan fel.
- Övergången intro → loop är sömlös (sample-exakt schemaläggning), och loopen upprepas
  utan hörbart glapp tills finalen stängs eller mutas.
- Reduced motion ger en komplett, läsbar, stillsam version.
- Fungerar för godtycklig avslutad säsong och följer säsongens tema (inte det aktiva).
- Pågående säsong på finale-URL:en ger "pågår ännu"-vyn, aldrig en halv finale.

## Risker

- **GSAP + React 19/Next 15:** pin/scrub ska städas korrekt vid unmount (`useGSAP`/
  context-revert), annars spökar ScrollTriggers vid navigering.
- **Lenis + pinnade sektioner** behöver kopplas via `ScrollTrigger.update` på Lenis
  scroll-event — känt mönster, men lätt att få ryckigt om det glöms.
- **Vinnarsekvensen exakt en gång:** scrubbing gör att "slutet" kan passeras flera
  gånger — kräver en explicit spelad-flagga per passage med reset vid tillbakascroll
  förbi tröskeln.
- Summary-byggaren måste tåla säsonger med 0 eller 1 spelare utan att dela med noll.
