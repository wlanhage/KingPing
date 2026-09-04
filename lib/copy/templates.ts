/** Rikets egen röst: härolder, drakar och slottsintriger. De neutrala texterna läggs på i temat. */
export const streakTemplates: Record<string, string[]> = {
  NEW_KING: [
    '👑 @{winner} bestiger tronen. @{previousKing} får lämna kronan i garderoben.',
    '🎺 Härolden ropar: @{winner} är rikets nya regent!',
    '🏰 Slottsportarna öppnas för @{winner}. @{previousKing} går ut bakvägen.',
    '⚔️ @{winner} vann duellen och kronan. @{previousKing} vann en läxa.',
    '🪑 Tronen har fått ny ägare: @{winner}. Kudden är fortfarande varm efter @{previousKing}.',
    '📜 Krönikören doppar pennan: @{winner} har krönts.',
    '🔔 Kyrkklockorna ringer för @{winner}. @{previousKing} hör dem från fängelsehålan.',
    '🛡️ Ny vapensköld på väggen — @{winner} regerar.',
    '👑 @{winner} sätter sig på den tomma tronen. Riket har fått en regent.',
  ],
  FIRST_WIN: [
    '🐣 @{winner} öppnar kontot! Första kronan någonsin. Pagen springer efter bläck.',
    '🗡️ @{winner} dubbas till riddare med sin första seger. Res dig, @{winner}.',
    '🌟 En ny stjärna över riket: @{winner} vinner för första gången.',
    '🍾 Rikets första bägare till @{winner}. Skål, sedan tillbaka till bordet.',
    '🎪 Marknadsgycklarna sjunger redan om @{winner}s första krona.',
    '🗝️ @{winner} har fått nyckeln till tronsalen. Första vinsten är ett faktum.',
  ],
  COMEBACK: [
    '🐎 @{winner} rider in i riket igen efter {days} dagar i exil.',
    '🕯️ {days} dagar utan krona — sen tände @{winner} facklorna igen.',
    '🏹 @{winner} vaknade ur sin {days} dagar långa dvala och sköt rakt i mål.',
    '🏰 Efter {days} dagar utanför murarna är @{winner} tillbaka på tronen.',
    '📯 Hornet ljuder: @{winner} återvänder efter {days} dagar.',
  ],
  SAME_KING_STREAK_2: [
    '✌️ Två raka. @{winner} börjar mäta gardiner till tronsalen.',
    '🍖 @{winner} tog två raka och en extra portion vid banketten.',
    '🕯️ Två i följd för @{winner}. Hovet tänder ett extra ljus.',
    '🪞 @{winner} tog två raka och kallar spegeln för "min rådgivare".',
    '🐉 Två raka. Drakarna på borggården har börjat lyssna på @{winner}.',
  ],
  SAME_KING_STREAK_3: [
    '🧱 Tre raka. Murbruket i @{winner}s dynasti har börjat torka.',
    '🐎 Tre i följd för @{winner}. Utmanarna sadlar om — till bönder.',
    '🏰 Tre i rad — @{winner} bygger murar runt bordet.',
    '👑 Tre raka. Kronan har växt fast på @{winner}s huvud.',
    '🎭 Tre i följd. Hovnarren har slutat skämta om @{winner}.',
  ],
  SAME_KING_STREAK_4: [
    '📜 Fyra raka. Riksdagen är upplöst och @{winner} skriver lagarna själv.',
    '🕯️ Fyra i följd. I slottets korridorer viskas ett enda namn: @{winner}.',
    '🦅 Fyra raka. Riket har fått ett nytt vapendjur: @{winner}.',
    '⛓️ Fyra på raken för @{winner}. Oppositionen sitter i tornet.',
  ],
  SAME_KING_STREAK_5_PLUS: [
    '🏰 Fem raka. Tronen har ett nytt efternamn: @{winner}.',
    '🪦 Fem raka eller fler för @{winner}. Utmanarnas hopp begravs på kyrkogården bakom slottet.',
    '🗿 Fem i följd. Statyn av @{winner} har beställts från stenhuggaren.',
    '⚜️ @{winner} regerar i femte rundan. Myntverket präglar nya mynt med rätt ansikte.',
  ],
  STREAK_BREAK_SMALL: [
    '🧵 @{winner} klippte @{previousKing}s tråd efter två raka. Sömmerskan är nöjd.',
    '🛑 Två-på-raken-drömmen är död. @{winner} gav @{previousKing} nådastöten.',
    '🍂 @{previousKing}s svit föll som ett höstlöv för @{winner}.',
  ],
  STREAK_BREAK_MEDIUM: [
    '🏹 En pil från tornet: @{winner} fällde @{previousKing} efter tre raka.',
    '🪓 Tre i följd, sen yxan. @{winner} högg ner @{previousKing}s dynasti vid roten.',
    '🐺 Vargarna tog dynastin. @{winner} stoppade @{previousKing} efter tre raka.',
  ],
  STREAK_BREAK_MAJOR: [
    '🔥 Upproret lyckades! @{winner} störtade @{previousKing} efter {previousStreakCount} raka.',
    '⚔️ @{previousKing}s {previousStreakCount} raka mötte @{winner}s svärd. Svärdet vann.',
    '🏰 Murarna föll. @{winner} tog @{previousKing}s fästning efter {previousStreakCount} raka.',
  ],
  STREAK_BREAK_LEGENDARY: [
    '🏛️ TYRANNENS FALL. @{winner} avsatte @{previousKing} efter {previousStreakCount} raka segrar.',
    '🎆 Fyrverkerier över riket: @{winner} bröt @{previousKing}s {previousStreakCount}-svit. Krönikan får ett nytt kapitel.',
    '🗡️ Legenden slutar här. @{winner} fällde @{previousKing} efter {previousStreakCount} raka.',
  ],
};

export const nationIntros: Record<string, string[]> = {
  STABLE_ERA: ['🏰 Lugnet vilar över riket.', '🌾 Bönderna skördar, hovet gäspar.'],
  TENSION: ['⚠️ Folket mumlar på torget.', '🌩️ Åska i fjärran över slottet.'],
  INSTABILITY: ['🌀 Tronen byter ägare oftare än hovet byter kläder.', '🎲 Ingen vet vem som bär kronan i morgon.'],
  DYNASTY: ['👑 En dynasti reser sig ur bordets damm.', '🧱 Murarna kring tronen växer sig högre för varje dag.'],
  TYRANNY: ['👁️ Kronans spioner finns överallt.', '🔒 Slottsportarna är låsta inifrån.'],
  REVOLUTION: ['🔥 Kronan har rullat i rännstenen. En ny era börjar.', '🕊️ Folket andas igen — för en stund.'],
};

export const fridayIntros = [
  '⚔️ FREDAGENS TORNERSPEL ÄR AVGJORT.',
  '🍺 Fredag i riket. Mjödet är hällt och kronan är satsad.',
  '🏰 Slottets sista duell för veckan är över.',
];

/** Tillbakablickar på förra säsongen, bara under den nya säsongens första händelser. */
export const seasonEchoes: Record<string, string[]> = {
  champion: [
    '👑 Kejsaren av {lastSeason} har inte glömt hur man gör.',
    '📜 {lastSeason} slutade med @{winner} på tronen. Den här säsongen börjar likadant.',
    '🏰 Gamla vanor: @{winner} regerade i {lastSeason} och tänker tydligen fortsätta.',
    '⚜️ Förra säsongens härskare kliver in som om ingenting hänt.',
  ],
  winless: [
    '🐣 Noll vinster i {lastSeason}. Riket tjänade dig inte väl då — det gör det nu.',
    '📜 Krönikan från {lastSeason} nämnde inte @{winner} en enda gång. Det är åtgärdat.',
    '🕯️ @{winner} gick genom hela {lastSeason} utan krona. Nu är ljuset tänt.',
    '🎺 Härolden får öva på ett nytt namn: @{winner} vann inget alls i {lastSeason}.',
  ],
  last: [
    '🐌 Sist i {lastSeason}. Först i dag. Riket blinkar förvånat.',
    '📉 Från botten av tabellen i {lastSeason} till tronen — @{winner} tog trapporna två steg i taget.',
    '🪦 {lastSeason} begravde @{winner} längst ner i tabellen. Uppståndelsen är ett faktum.',
  ],
  runnerUp: [
    '🥈 Kronprinsen från {lastSeason} vill inte vara tvåa längre.',
    '👑 Tronarvingen som aldrig fick ärva i {lastSeason} tar saken i egna händer.',
    '📜 Tvåa i {lastSeason}. @{winner} har läst slutet och tänker skriva om det.',
  ],
  dethronedChampion: [
    '⚔️ @{previousKing} härskade i {lastSeason}. Det räknas inte längre.',
    '🏰 Förra säsongens kejsare störtad. @{previousKing}s era tog slut vid gränsen till {lastSeason}.',
    '🗡️ @{winner} påminner @{previousKing} om att {lastSeason} är arkiverad.',
  ],
  generic: [
    '📜 I {lastSeason} slutade @{winner} på plats {lastRank} med {lastWins} vinster. Ny säsong, nytt blad.',
    '🏰 {lastSeason} är arkiverad. @{winner} skriver första raderna i det nya kapitlet.',
    '🗝️ Plats {lastRank} i {lastSeason}. Krönikören noterar att @{winner} siktar högre.',
    '📯 Kronan från {lastSeason} är nedsmält. Den här är nypräglad för @{winner}.',
    '🧭 {lastWins} vinster i {lastSeason}. Riket räknar om från noll — @{winner} har redan en.',
  ],
};
