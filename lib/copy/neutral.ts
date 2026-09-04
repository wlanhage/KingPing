import type { Theme } from '../theme/theme-types';

export type AnnouncementCopy = Theme['announcements'];

/**
 * Kontorshumor utan koppling till något tema — HR, Outlook, fikarummet. Blandas in i
 * varje temas egna texter så att krönikan får både rikets röst och kontorets.
 */
export const neutralStreakTemplates: Record<string, string[]> = {
  NEW_KING: [
    '📋 Protokollfört: @{winner} tog över efter @{previousKing}. Mötet kan fortsätta.',
    '🖨️ Skrivaren har informerats. @{winner} är ny chef över bordet.',
    '☕ @{winner} vann. @{previousKing} går och hämtar kaffe till alla.',
    '📅 Ny ägare av bordet: @{winner}. Kalenderinbjudan till @{previousKing}: "Uppföljning".',
    '🧾 @{winner} skrev under. @{previousKing} får läsa det finstilta i efterhand.',
    '🔔 Ding. @{winner} har kvitterat ut kronan. @{previousKing} har kvitterat ut en vattenflaska.',
    '🪑 @{winner} tar bordet i besittning. Ingen protesterade — ännu.',
    '📣 Bordet har fått en ägare: @{winner}. Klagomål lämnas skriftligen.',
  ],
  FIRST_WIN: [
    '🧑‍💻 Onboardingen är klar: @{winner} tar sin första vinst. IT-supporten gratulerar.',
    '📎 @{winner} vann för första gången. Någon uppdaterar org-schemat.',
    '🎂 Första vinsten för @{winner}. Fikat på fredag är härmed bokat.',
    '🖊️ @{winner} har skrivit sitt namn i protokollet. Bläcket är fortfarande vått.',
    '🪪 Passerkortet fungerar äntligen — @{winner} tar sin första seger.',
    '📣 Personalavdelningen noterar: @{winner} har vunnit. Provanställningen ser lovande ut.',
  ],
  COMEBACK: [
    '📬 Autosvaret är avstängt. @{winner} är tillbaka efter {days} dagar.',
    '🌴 {days} dagar borta från toppen — @{winner} har tydligen haft semester och kommit hem laddad.',
    '🧳 @{winner} checkar in igen efter {days} dagars frånvaro. Skrivbordet dammas av.',
    '🔌 @{winner} har startats om efter {days} dagar. Det hjälpte.',
    '🗂️ Ärendet återöppnat: @{winner} vinner för första gången på {days} dagar.',
  ],
  SAME_KING_STREAK_2: [
    '📈 Två raka för @{winner}. Kvartalsrapporten ser plötsligt bra ut.',
    '🔁 @{winner} igen. Samma kaffekopp, samma resultat.',
    '🗓️ Två i följd — @{winner} har bokat bordet i Outlook.',
    '🧘 @{winner} tog två raka och kallar det "arbetsro".',
    '📌 Två på raken. @{winner} har satt en post-it på tronen: "upptagen".',
  ],
  SAME_KING_STREAK_3: [
    '📊 Tre raka. @{winner} har blivit ett KPI.',
    '🧑‍💼 Tre i följd. Cheferna börjar CC:a @{winner} på allt.',
    '🚧 Tre raka för @{winner}. Bordet är nu ett avspärrat område.',
    '🏷️ Tre på raken — @{winner} får en egen rubrik i veckobrevet.',
    '🧯 Tre i rad. Någon ropar på brandsläckaren, men @{winner} är redan het.',
  ],
  SAME_KING_STREAK_4: [
    '🚨 Fyra raka. HR har öppnat ett ärende. Ärendenummer: @{winner}.',
    '📝 Fyra i följd. Skyddsombudet vill prata med @{winner} om arbetsmiljön vid bordet.',
    '🗄️ Fyra raka. @{winner} har flyttat sitt skrivbord till tronen.',
    '📵 Fyra på raken. Facket har kallat till möte om @{winner}.',
  ],
  SAME_KING_STREAK_5_PLUS: [
    '☢️ Fem raka för @{winner}. Det här är inte längre sport, det är en tillsvidareanställning.',
    '🏢 @{winner} har vunnit så många gånger att ledningen överväger en omorganisation.',
    '🧾 Fem raka eller fler. @{winner} fakturerar numera per krona.',
    '📻 Fem i följd. Internradion spelar bara @{winner}s låt.',
  ],
  STREAK_BREAK_SMALL: [
    '🧹 @{winner} städade upp @{previousKing}s lilla svit. Ordning på skrivbordet igen.',
    '⏸️ Två raka blev inte tre. @{winner} tryckte på paus för @{previousKing}.',
    '📉 @{previousKing}s kurva bröts av @{winner}. Analytikerna är inte förvånade.',
  ],
  STREAK_BREAK_MEDIUM: [
    '🗃️ Tre raka arkiverade. @{winner} stängde @{previousKing}s ärende.',
    '🔨 @{winner} rev @{previousKing}s tre raka. Bygglovet var aldrig godkänt.',
    '🧑‍⚖️ Tre i följd, sen kom @{winner} med ett överklagande. Beviljat.',
  ],
  STREAK_BREAK_MAJOR: [
    '🏗️ @{previousKing}s {previousStreakCount} raka rasade. @{winner} höll i slägghammaren.',
    '📣 Krismötet är avblåst — @{winner} har störtat @{previousKing} efter {previousStreakCount} raka.',
    '🧾 {previousStreakCount} raka, sen en revision av @{winner}. @{previousKing} blev underkänd.',
  ],
  STREAK_BREAK_LEGENDARY: [
    '🏛️ Efter {previousStreakCount} raka är @{previousKing} avsatt. @{winner} tog jobbet utan intervju.',
    '📰 EXTRA: @{winner} stoppade @{previousKing} efter {previousStreakCount} raka. Presstoppet flyttas.',
    '🎇 {previousStreakCount} raka segrar tog slut i dag. @{winner} får ledigt resten av veckan — i teorin.',
  ],
};

export const neutralNationIntros: Record<string, string[]> = {
  STABLE_ERA: ['📎 Inget att rapportera från bordet.', '🫖 En helt vanlig dag i fikarummet.'],
  TENSION: ['📈 Stämningen i öppna landskapet stiger.', '☕ Kaffet bryggs starkare än vanligt.'],
  INSTABILITY: ['🌀 Ingen på kontoret vet vem som bestämmer längre.', '📊 Organisationsschemat ritas om dagligen.'],
  DYNASTY: ['🏢 En maktkoncentration växer fram vid bordet.', '📌 Samma namn på tavlan, dag efter dag.'],
  TYRANNY: ['👁️ Bordet står under uppsikt.', '🔒 Oppositionen jobbar hemifrån.'],
  REVOLUTION: ['🎉 Regimen har fallit. Fikarummet jublar.', '🗳️ Nya tider vid bordet.'],
};

export const neutralFridayIntros = [
  '🍻 FREDAG. Veckans sista och viktigaste beslut är fattat.',
  '📆 Fredagsfinal — det enda mötet ingen tackar nej till.',
  '🥂 Fredag. Bordet stänger för helgen med ett avgörande.',
];

const mergeLists = (a: Record<string, string[]>, b: Record<string, string[]>) =>
  Object.fromEntries([...new Set([...Object.keys(a), ...Object.keys(b)])].map((k) => [k, [...(a[k] ?? []), ...(b[k] ?? [])]]));

/** Temats egna texter plus de neutrala. */
export function withNeutral(themed: AnnouncementCopy): AnnouncementCopy {
  return {
    streakTemplates: mergeLists(themed.streakTemplates, neutralStreakTemplates),
    nationIntros: mergeLists(themed.nationIntros, neutralNationIntros),
    fridayIntros: [...themed.fridayIntros, ...neutralFridayIntros],
  };
}
