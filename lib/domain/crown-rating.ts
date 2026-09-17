/**
 * Kronrating — en Elo-liknande rating byggd på kronbyten.
 *
 * VARFÖR INTE KLASSISK ELO: en runda rundpingis spelas av alla runt bordet, men bara
 * vinnaren skrivs ner. WinEvent innehåller ingen match mellan två spelare — motståndar-
 * listan finns helt enkelt inte i datan, och utan den går inte Elos förväntade poäng att
 * räkna. Det enda riktiga motståndsförhållandet som FINNS är kronbytet: tar du kronan tar
 * du den från en namngiven spelare. Det är samma enhet som dominance(), stolenReign() och
 * ärkefienden redan räknar på.
 *
 * VARFÖR EN RATING ALLS, NÄR TABELLEN REDAN RANKAR PÅ TRONTID: trontiden mäter kalendern
 * lika mycket som spelet. En vinst klockan 16 på en fredag ger kronan hela helgen utan att
 * ett enda bollbyte spelas. Ratingen rör sig bara när någon faktiskt vinner en runda.
 */

/** Alla börjar här. 1000 i stället för Elos 1500 — lättare att läsa på en tavla. */
export const START_RATING = 1000;
/** Litet dataunderlag (tiotal kröningar per säsong) kräver att ratingen hinner röra sig. */
export const K_FACTOR = 32;

type RatedWin = {
  winnerId: string;
  previousKingId: string | null;
  occurredAt: Date | string;
  /** Hela rundans utslagsordning, vinnaren först (se lib/domain/standings.ts). Saknas/kort = okänd, då gäller kronbytet ensamt. */
  standings?: string[];
};

export type CrownRating = {
  rating: number;
  /** Antal kröningar som flyttat spelarens rating. Noll = ratingen är bara startvärdet. */
  played: number;
};

/** Elos förväntade poäng för A mot B. */
const expected = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400));

/**
 * Ratingtabell för en uppsättning vinster (normalt en säsongs).
 *
 * Tre sorters kröningar, och de behandlas olika eftersom de innehåller olika mycket
 * information om vem som blev besegrad:
 *
 *  1. ÖVERTAG (vinnaren var inte kung) — en riktig duell mot den avsatta kungen. Vanlig
 *     Elo-uppdatering: att störta en tyrann ger mycket, att ta kronan från någon som nyss
 *     fick den ger nästan ingenting.
 *  2. FÖRSVAR (kungen vann igen) — kungen vann en runda till, men mot vem vet vi inte.
 *     Fältets snittrating får stå för motståndet. Ju högre över fältet kungen ligger,
 *     desto mindre ger nästa försvar; det är det som hindrar en lång svit från att skena.
 *  3. TOM TRON (ingen tidigare kung) — säsongens första kröning. Ingen besegrad, ingen
 *     ratingändring; spelaren tar bara plats i tabellen.
 *
 * En fjärde sort finns när hela rundans utslagsordning är känd (`standings`, se
 * lib/domain/standings.ts): då slår vi ihop alla tre ovan till en enda beräkning i stället för
 * att gissa på fältets snitt. Ordningen bryts ner i varje par "X slog Y", och alla par uppdateras
 * mot ratingen som den såg ut INNAN rundan — annars skulle ett senare par se en motståndare som
 * redan hunnit flytta sig av ett tidigare par i samma runda. Var och en möter (n-1) andra i en
 * full placering, så K-faktorn delas på det: en runda med många deltagare ska inte flytta mer
 * totalt än dagens envägsuppdatering. Vid två spelare blir det K_FACTOR/(2-1) = K_FACTOR, dvs
 * exakt övertagsformeln — den nya vägen är en generalisering, inte en ny modell bredvid den gamla.
 * Till skillnad från ett vanligt försvar (fältet tappar ingen rating) blir en runda med känd
 * placering nollsummespel för sina deltagare, eftersom vi här vet exakt vilka som var med.
 *
 * Bara de namngivna parterna flyttas — vid ett övertag vinnaren och den avsatta kungen,
 * vid ett försvar kungen ensam. Fältet tappar alltså ingen rating på ett försvar, trots
 * att kungen i praktiken besegrade det: vi vet inte vilka som spelade, och den som är
 * ledig en vecka ska inte komma tillbaka till en sänkt rating. Priset är att summan av
 * all rating sakta stiger under en säsong. Det spelar ingen roll här — tabellen jämför
 * spelare med varandra inom en säsong, aldrig mot ett absolut tal eller mot en annan säsong.
 *
 * `isAfkAt` håller spelare som var AFK vid försvaret utanför fältets snitt — de satt inte vid bordet.
 */
export function crownRatings(wins: RatedWin[], isAfkAt: (playerId: string, at: Date) => boolean = () => false): Record<string, CrownRating> {
  return ratingsFor(wins, isAfkAt, true);
}

/**
 * Samma kronrating, fast som om placeringarna aldrig fanns — bara kronbytet räknas, precis som
 * innan den funktionen fanns. Finns kvar vid sidan av `crownRatings()` för den som vill jämföra.
 */
export function classicCrownRatings(wins: RatedWin[], isAfkAt: (playerId: string, at: Date) => boolean = () => false): Record<string, CrownRating> {
  return ratingsFor(wins, isAfkAt, false);
}

function ratingsFor(wins: RatedWin[], isAfkAt: (playerId: string, at: Date) => boolean, useStandings: boolean): Record<string, CrownRating> {
  // Elo är ordningsberoende. Anroparen samlar vinsterna per spelare och får dem därmed
  // grupperade, inte kronologiska — ordningen sätts här i stället för att litas på.
  const ordered = [...wins].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const table: Record<string, CrownRating> = {};
  const seat = (id: string) => (table[id] ??= { rating: START_RATING, played: 0 });

  for (const win of ordered) {
    const standings = useStandings ? (win.standings ?? []) : [];
    if (standings.length >= 2) {
      const n = standings.length;
      const before = Object.fromEntries(standings.map((id) => [id, seat(id).rating]));
      const share = K_FACTOR / (n - 1);
      const delta: Record<string, number> = {};
      for (let i = 0; i < n; i += 1) {
        for (let j = i + 1; j < n; j += 1) {
          const [above, below] = [standings[i], standings[j]];
          const shift = share * (1 - expected(before[above], before[below]));
          delta[above] = (delta[above] ?? 0) + shift;
          delta[below] = (delta[below] ?? 0) - shift;
        }
      }
      for (const id of standings) {
        const player = seat(id);
        player.rating += delta[id];
        player.played += 1;
      }
      continue;
    }

    const winner = seat(win.winnerId);
    if (!win.previousKingId) continue; // tom tron

    if (win.previousKingId === win.winnerId) {
      const at = new Date(win.occurredAt);
      const others = Object.entries(table).flatMap(([id, r]) => (id === win.winnerId || isAfkAt(id, at) ? [] : [r.rating]));
      // Säsongens första försvar kan komma innan någon annan hunnit in i tabellen.
      const field = others.length ? others.reduce((sum, r) => sum + r, 0) / others.length : START_RATING;
      winner.rating += K_FACTOR * (1 - expected(winner.rating, field));
      winner.played += 1;
      continue;
    }

    const deposed = seat(win.previousKingId);
    const odds = expected(winner.rating, deposed.rating);
    winner.rating += K_FACTOR * (1 - odds);
    deposed.rating -= K_FACTOR * (1 - odds);
    winner.played += 1;
    deposed.played += 1;
  }
  return table;
}
