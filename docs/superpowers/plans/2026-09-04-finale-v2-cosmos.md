# Finale v2 — "Galaxen"

**Datum:** 2026-09-04 · **Branch:** `seasonhandler-v2` · **Läge:** fria händer, jämförs mot v1 innan val.

## Vision

Säsongen som en galax. Tronen är **solen** i mitten. Spelarna är **planeter** i omloppsbana —
banradien följer rankingen, vinnarens planet bär en **guldring** (kronan). Kronans vandring
är **ljusspår** mellan planeterna, ritade i tidsordning medan en komet reser längs dem.
Kröningen är en **supernova**: vinnarens planet flammar upp, partiklar sprutar, och namnet
reser sig i massiv relief. Eftertexterna strömmar förbi som stjärnor.

Temakopplingen är lätt: sol = tron, ring = krona, guldpalett, riket = galaxen. Ingen
medeltid i rymden — bara ikonografin.

## Inspiration (vad som togs med)

- **Hela upplevelsen från scrollen** — prisbelönta sajter 2026 sekvenserar 3D-scener från
  scroll i stället för att flytta en 2D-sida. Här: EN kameraflygning, DOM-text ovanpå.
- **Hyperspace-starfield** — punkter som strömmar förbi och sträcks till streck vid fart.
  Här: stjärnorna sträcks efter scrollhastigheten, med FOV-kick och kromatisk aberration.
- **Nebulosa-shader** — FBM-brus i guld/lila/blått som bakgrund, driver långsamt.
- **Post-stack** — bloom + kromatisk aberration + filmkorn + vinjett ger "rymdfilm".

## Arkitektur — vad som skiljer från v1

| | v1 | v2 |
|---|---|---|
| Canvas | En pinnad akt | **En fast fullskärmscanvas bakom hela finalen** |
| Scroll | Pinnade sektioner med scrub | **En ScrollTrigger på hela sidan** → progress + hastighet i refs |
| Text | DOM-fades + 3D i vävakten | **HUD-typografi i DOM** + relief-titlar i 3D vid nyckelmoment |
| Robusthet | Pin + avmontering = removeChild-risk | **Inga pins alls.** Canvasen avmonteras aldrig under scroll |

Scrollen skriver `progress` (0–1 över hela sidan) och `velocity` till refs; scenen läser dem
i sin frame-loop. DOM-akterna är vanliga höga sektioner vars text animeras med egna,
icke-pinnade ScrollTriggers.

## Kamerastationer (page progress)

| Intervall | Station |
|---|---|
| 0.00–0.15 | **Kallöppning** — drift utanför galaxen, titeln warpar in från oändligheten |
| 0.15–0.35 | **Siffrorna** — svep förbi planeterna, HUD-paneler räknar upp |
| 0.35–0.80 | **Galaxen** — dykning in, spåren ritas i tidsordning, kometen reser |
| 0.80–0.92 | **Warp** — stjärnorna blir streck, FOV vidgas, in mot vinnarens planet |
| 0.92–1.00 | **Supernova + eftertexter** — flamma, partikelburst, namnet i relief, credits |

## Filer

```
components/finale/v2/
  CosmicFinale.tsx        root: cover, Lenis, global ScrollTrigger, DOM-akter, ljud
  CosmosCanvas.tsx        fast canvas + post-stack + kontextskydd
  acts.tsx                ColdOpen, Numbers, GalaxyCaption, Coronation, Epilogue (DOM)
  space/scene.ts          REN MATTE: omloppslayout, kamerastationer, spårprogress (testad)
  space/Starfield.tsx     stjärnor + warp-streck (shader, sträcks av velocity)
  space/Nebula.tsx        FBM-shader-bakgrund
  space/Sun.tsx           tronen: glödande sol + korona
  space/Galaxy.tsx        planeter, ringar, ljusspår, komet, supernova
tests/cosmos.test.ts      scenmatten
```

`buildWeave` återanvänds för spårens kurvor; planeternas positioner härleds ur samma
layout men mappas till omloppsbanor. `finale-audio.ts` och `Title3D` återanvänds.

## Verifiering

Pixlar går inte att se i den här miljön (WebGL-kontexten dör i dold panel). Därför:
- scenmatten enhetstestas (stationer, omloppsradier, spårprogress, kantfall)
- scengrafen inspekteras (antal planeter/spår/stjärnor, shaders kompilerar utan fel)
- DOM-akterna verifieras i markup
- kontextförlust får aldrig krascha sidan (samma vakt som v1, men utan pin-problemet)
- reduced motion: ingen canvas, statiska akter

## Utanför scope

Rapier-fysik, GPGPU-partiklar, WebGPU/TSL. Läggs på om v2 väljs.

## Status: byggd, redo för jämförelse

- `/seasons/s1/final` → v2 "Galaxen" (standard på den här branchen)
- `/seasons/s1/final?classic=1` → v1 för jämförelse sida vid sida
- `&cinema=1` fungerar på båda

Verifierat: 84 tester gröna (18 nya på scenmatten), scengraf 112 meshes / 21 spår /
72 textlager / 4 ljus, båda shaders kompilerar utan fel, sidan överlever förlorad
WebGL-kontext. Pixlar går inte att se i utvecklingsmiljön — det är Williams ögon som gäller.
