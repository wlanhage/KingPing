export const streakTemplates: Record<string, string[]> = {
  NEW_KING: [
    '👑 @{winner} bestiger tronen. @{previousKing} får se kronan byta huvud.',
    '🥁 Ny regent! @{winner} tar över bordet.',
    '✨ @{winner} kliver fram och rycker kronan ur @{previousKing}s händer.',
    '🎺 Hör upp, riket — @{winner} är er nya regent.',
    '🪑 Tronen byter ägare. @{winner} sätter sig till rätta.',
    '🤝 Maktskifte utan blodspillan. @{winner} tar vid efter @{previousKing}.',
    '👑 @{winner} har krönts. Länge leve kungen — tills nästa runda.',
  ],
  FIRST_WIN: [
    '🐣 @{winner} öppnar kontot! Första kronan någonsin — skärmdumpa det här ögonblicket.',
    '🎉 Premiär för @{winner}! Nybörjartur räknas också som tur.',
    '🍾 @{winner} tar sin allra första seger. Tårta på fredag, någon?',
    '🌟 Historisk dag: @{winner} vinner för första gången. Någon väcker pressen.',
    '🎈 Första vinsten för @{winner}! Välkommen till toppen — det är ensamt men skönt här uppe.',
    '🚀 @{winner} debuterar med en seger. Från nolla till regent på en enda match.',
  ],
  COMEBACK: [
    '🐎 @{winner} är tillbaka! Första segern på {days} dagar.',
    '🎯 Efter {days} dagar i kylan kliver @{winner} upp på tronen igen.',
    '📈 @{winner} bryter en {days} dagar lång torka och rycker åt sig kronan.',
    '👏 Det var ett tag sen, @{winner} — {days} dagar för att vara exakt. Välkommen tillbaka till tronen.',
    '🕰 {days} dagar utan seger, sen detta. @{winner} har vaknat.',
  ],
  SAME_KING_STREAK_2: [
    '✌️ Två raka för @{winner}. Ren tur, eller? ...Eller?',
    '😏 @{winner} vägrade lämna ifrån sig kronan. Två på raken.',
    '🔁 Samma kung igen — @{winner} börjar gilla utsikten från tronen.',
    '☕ @{winner} tog en till. Kaffepausen får vänta, kronan sitter kvar.',
    '🍀 Två i rad för @{winner}. "Tillfällighet", hävdar @{winner} med ett leende.',
  ],
  SAME_KING_STREAK_3: [
    '⚠️ TRE raka. Det här är inte längre tur — det är ett mönster.',
    '😬 @{winner} har vunnit tre i följd. Nu skrattar ingen längre.',
    '🔥 Tre på raken. @{winner} börjar lukta dynasti.',
    '📢 Tre raka för @{winner}. Utmanarna kallar till krismöte.',
    '🧨 @{winner} x3. Tronrummet känns plötsligt trångt för alla andra.',
  ],
  SAME_KING_STREAK_4: [
    '🚨 FYRA RAKA. HR har informerats. Situationen utvecklas snabbt.',
    '🏛 Demokratin vid pingisbordet är officiellt hotad.',
    '👁 Fyra i följd. @{winner} styr inte längre — @{winner} härskar.',
  ],
  SAME_KING_STREAK_5_PLUS: [
    '☢️ FEM RAKA. Det här är inte längre sport, det är ett styrelseskick.',
    '📜 Barn kommer att läsa om @{winner}s era i historieböckerna.',
    '👑 @{winner} har slutat räkna segrar och börjat räkna år vid makten.',
  ],
  STREAK_BREAK_SMALL: [
    '✂️ @{winner} klippte av @{previousKing}s lilla svit. Ordningen återställd — för stunden.',
    '🛑 Två-på-raken-drömmen är över. @{winner} satte stopp för @{previousKing}.',
  ],
  STREAK_BREAK_MEDIUM: [
    '💥 @{winner} kapade @{previousKing}s tre raka. Korridorsviskandet tystnar tvärt.',
    '🪓 Tre i följd — sen kom @{winner}. Bygget rasade lika snabbt som det restes.',
  ],
  STREAK_BREAK_MAJOR: [
    '🔥 @{winner} störtade @{previousKing} efter {previousStreakCount} raka. Revolt vid bordet!',
    '⚔️ Fyra-svitens slut. @{winner} gjorde det ingen längre vågade hoppas på.',
  ],
  STREAK_BREAK_LEGENDARY: [
    '🏛 TYRANNEN HAR FALLIT. Efter {previousStreakCount} raka segrar stoppades @{previousKing} av @{winner}.',
    '🎆 @{winner} avslutade @{previousKing}s {previousStreakCount}-svit. Historieböckerna skrivs om i natt.',
  ],
};

export const nationIntros = {
  STABLE_ERA: ['🏛 Lugnet vilar över riket.', '🌤 En odramatisk dag vid bordet.'],
  TENSION: ['⚠️ Folket börjar bli rastlöst.', '🌡 Stämningen vid bordet stiger.'],
  INSTABILITY: ['🌀 Total politisk turbulens i pingisriket.', '🎲 Ingen vet vem som sitter på tronen imorgon.'],
  DYNASTY: ['👑 En dynasti håller på att formas.', '🏰 Maktens murar växer sig allt högre.'],
  TYRANNY: ['👁 Staten övervakar bordet.', '🔒 Oppositionen har gått under jorden.'],
  REVOLUTION: ['🔥 Regimen har fallit. En ny era börjar.', '🗽 Folket andas frihet igen.'],
};

export const fridayIntros = ['⚔️ FREDAGSFINALEN ÄR AVGJORD.', '🍻 Fredag, högsta insats — bordet skälver.'];
