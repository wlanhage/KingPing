/** Galaxens röst: kraften, rådet och den mörka sidan. De neutrala texterna läggs på i temat. */
export const galaxyStreakTemplates: Record<string, string[]> = {
  NEW_KING: [
    '🌟 @{winner} har bestigit tronen. @{previousKing} skickas till yttre randen.',
    '⚡ Makten har skiftat. @{winner} härskar nu över galaxen.',
    '🛸 @{winner} landar på tronen. @{previousKing} får ta en fraktskuta hem.',
    '🪐 En ny kejsare: @{winner}. @{previousKing} sitter kvar i väntrummet på Tatooine.',
    '🌌 Kraften har valt @{winner}. @{previousKing} kände en störning.',
    '📡 Holonet rapporterar: @{winner} tar över tronrummet efter @{previousKing}.',
    '🔭 Sett från Coruscant: @{winner} regerar, @{previousKing} regerade.',
    '🌠 @{winner} tar kronan. @{previousKing} har en dålig känsla för det här.',
    '🌌 @{winner} sätter sig på den tomma tronen. Galaxen har fått en härskare.',
  ],
  FIRST_WIN: [
    '✨ @{winner} tar sin allra första seger. Kraften har vaknat.',
    '🎓 Padawan @{winner} vinner sin första duell. Flätan klipps snart.',
    '🚀 @{winner} debuterar med en seger. Från fuktfarmare till härskare på en match.',
    '🗺️ Ny prick på stjärnkartan: @{winner} har vunnit för första gången.',
    '🛠️ @{winner} byggde sin första ljussabel och vann direkt med den.',
    '🪐 Första kronan för @{winner}. Rådet höjer på ögonbrynen.',
  ],
  COMEBACK: [
    '🕰️ Efter {days} dagar i exil på Dagobah är @{winner} tillbaka.',
    '🧊 @{winner} tinar upp ur karboniten efter {days} dagar och tar tronen.',
    '🚀 @{winner} hoppar ur hyperrymden efter {days} dagar — rakt in på tronen.',
    '🌅 {days} dagar av mörker, sen två solar över @{winner} igen.',
    '📻 En gammal signal fångas upp: @{winner} lever, och vinner, efter {days} dagar.',
  ],
  SAME_KING_STREAK_2: [
    '🛡️ Två raka. @{winner} har satt upp sköldarna runt tronrummet.',
    '🤖 Två i följd. Droiderna har börjat kalla @{winner} "herre".',
    '🌗 Två raka för @{winner}. Det är ingen måne — det är @{winner}s andra vinst.',
    '🧘 Två på raken. @{winner} mediterar redan över en tredje.',
    '🪖 Två i rad. Stormtrupperna missar fortfarande, @{winner} gör det inte.',
  ],
  SAME_KING_STREAK_3: [
    '🏛️ Tre raka. @{winner} har grundat en egen orden.',
    '🔴 Tre i följd. @{winner}s ljussabel har börjat skifta i rött.',
    '🌌 Tre raka. Rådet kallar till extrainsatt session om @{winner}.',
    '🛰️ Tre på raken. @{winner} har byggt en liten rymdstation vid bordet.',
    '👁️ Tre i rad. Rådet känner en störning i kraften — den heter @{winner}.',
  ],
  SAME_KING_STREAK_4: [
    '🚨 Fyra raka. Jedirådet har öppnat en utredning om @{winner}.',
    '🌑 Fyra i följd. @{winner} går längre mot den mörka sidan för varje vinst.',
    '🛰️ Fyra raka. @{winner} har börjat bygga en Dödsstjärna vid bordet.',
    '⚡ Fyra i rad. Senaten har gett @{winner} nödbefogenheter.',
  ],
  SAME_KING_STREAK_5_PLUS: [
    '🔴 Fem raka. @{winner} har gått helt över till den mörka sidan.',
    '🏛️ Fem i följd. Republiken är nu ett imperium, och @{winner} är dess kejsare.',
    '🌌 Fem raka eller fler för @{winner}. Galaxen ropar på en utvald — ingen svarar.',
    '👑 @{winner} har slutat räkna vinster och börjat räkna stjärnsystem.',
  ],
  STREAK_BREAK_SMALL: [
    '💥 @{winner} sköt ner @{previousKing}s lilla svit. Två raka blev noll.',
    '🛡️ @{previousKing}s sköldar höll i två rundor. Sen kom @{winner}.',
    '🎯 @{winner} träffade avloppsschaktet: @{previousKing}s två raka är slut.',
  ],
  STREAK_BREAK_MEDIUM: [
    '🔥 Rebellerna slog till. @{winner} störtade @{previousKing} efter tre raka.',
    '🗡️ Tre raka, sen en duell på lavaplaneten. @{winner} hade höjdfördelen mot @{previousKing}.',
    '🚀 @{winner} bröt @{previousKing}s blockad efter tre raka. Hyperfart hem.',
  ],
  STREAK_BREAK_MAJOR: [
    '⚔️ @{previousKing}s välde på {previousStreakCount} raka föll. @{winner} höll i sabeln.',
    '🛰️ Dödsstjärnan sprängd: @{winner} stoppade @{previousKing} efter {previousStreakCount} raka.',
    '🌠 {previousStreakCount} raka fick ett slut i dag. Det var en fälla — och @{winner} gillrade den för @{previousKing}.',
  ],
  STREAK_BREAK_LEGENDARY: [
    '🌌 Balans i kraften är återställd. @{winner} fällde @{previousKing} efter {previousStreakCount} raka.',
    '🏛️ IMPERIET HAR FALLIT. Efter {previousStreakCount} raka avsattes kejsar @{previousKing} av @{winner}.',
    '🎆 Ewokerna firar på Endor: @{winner} avslutade @{previousKing}s {previousStreakCount}-svit.',
  ],
};

export const galaxyNationIntros: Record<string, string[]> = {
  STABLE_ERA: ['🪐 Galaxen vilar.', '🌌 En stilla dag i mellersta randen.'],
  TENSION: ['⚠️ Oro sprider sig i yttre randen.', '📡 Krypterade meddelanden går varma mellan systemen.'],
  INSTABILITY: ['🏛️ Senaten är i upplösning.', '🌀 Ingen vet vem som sitter i tronrummet i morgon.'],
  DYNASTY: ['🏛️ En orden reser sig.', '🌑 Skuggan över galaxen växer.'],
  TYRANNY: ['🛰️ Imperiet härskar.', '👁️ Kejsarens spioner finns i varje kantina.'],
  REVOLUTION: ['🔥 Rebellalliansen slår tillbaka.', '🕊️ Ett nytt hopp tänds i galaxen.'],
};

export const galaxyFridayIntros = [
  '⚔️ FREDAGENS DUELL I TRONRUMMET ÄR AVGJORD.',
  '🍻 Fredag i kantinan. Insatsen är kronan, och galaxen håller andan.',
  '🌌 Veckans sista hyperrymdshopp landade i ett avgörande.',
];
