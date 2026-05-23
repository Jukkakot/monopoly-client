import type { Lang } from './lang'

export interface T {
  // ── Header ──────────────────────────────────────────────────────────────────
  waitingForPlayers: string
  loading: string
  spectatorBadge: string
  soundMuted: string
  soundOn: string
  langLabel: string

  // Connection
  connecting: string
  reconnecting: string
  connectionFailed: string

  // Phase labels (active player info row)
  phases: Record<string, string>

  // ── ActionPanel ─────────────────────────────────────────────────────────────
  gameOverTitle: string
  bankruptLabel: string
  movingToken: string
  priceLabel: (price: number) => string
  buyBtn: (price: number) => string
  buyBtnKbd: (price: number) => string
  skipToAuction: string
  skipToAuctionKbd: string
  netWorthLabel: string
  rentalIncomeLabel: string
  yourTurnIn: (n: number) => string
  doublesRoll: string
  doublesWarning: string
  jailEscapeDoubles: string
  inJail: (rounds: number) => string
  useJailCard: (n: number) => string
  payJailFine: string
  rollDice: string
  rollDiceKbd: string
  endTurn: string
  endTurnKbd: string
  rentPopupText: (amount: number, ownerName: string) => string
  startTrade: (open: boolean) => string
  buildHousesSectionTitle: string
  mortgageSectionTitle: string
  redeemBtn: string
  redeemAllBtn: (cost: number) => string
  mortgageBtn: string
  unknownPhase: (phase: string) => string
  // Auction
  auctionTitle: (name: string) => string
  auctionHighest: (bid: number, leaderName: string | null) => string
  auctionRemaining: (n: number) => string
  auctionPassed: (names: string) => string
  auctionListPrice: (v: number) => string
  auctionActorWaiting: (name: string) => string
  auctionConfirmWin: string
  placeBidBtn: string
  passAuctionBtn: string
  passAuctionBtnKbd: string
  waitingForOthers: string
  // Debt
  debtTitle: (amount: number, creditor: string) => string
  debtReasonLabel: string
  debtReasonRent: (propName: string) => string
  debtReasonTax: string
  debtReasonCard: string
  debtReasonRepairs: string
  debtCashLabel: string
  debtLiquidationLabel: string
  debtCash: (n: number) => string
  debtLiquidation: (n: number) => string
  payDebtBtn: string
  mortgagePropBtn: (name: string) => string
  sellRoundBtn: (count: number, type: string) => string
  hotelLabel: string
  houseLabel: string
  sellBuildingBtn: (type: string, name: string) => string
  declareBankruptcy: string
  bankLabel: string
  playerCreditorLabel: string
  // Trade
  tradeWaiting: string
  tradeCounterEditing: string
  tradeApplying: string
  cancelOfferBtn: string
  tradeTitle: (partner: string) => string
  youOfferLabel: string
  youRequestLabel: string
  sendOfferBtn: string
  cancelBtn: string
  tradeOfferFrom: (initiator: string) => string
  theyOfferLabel: string
  theyRequestLabel: string
  acceptBtn: string
  counterOfferBtn: string
  declineBtn: string
  // Card popup
  cardOkBtn: string
  botDrawingCard: (name: string) => string
  actionTabLabel: string
  propertiesTabLabel: string
  tradeCashLabel: (amount: number) => string
  mortgagedInTrade: string

  // ── EventLog ────────────────────────────────────────────────────────────────
  filterAll: string
  filterTitles: Record<string, string>
  showMineOnly: string
  noEventsYet: string
  justNow: string
  secondsAgo: (n: number) => string
  minutesAgo: (n: number) => string

  // ── Board ────────────────────────────────────────────────────────────────────
  doublesLabel: string
  roundLabel: (n: number) => string
  freeLabel: string
  rentTooltip: (r: string | number) => string
  soldPropsTitle: string
  housesStockTitle: (h: number, left: number) => string
  hotelsStockTitle: (h: number, left: number) => string
  utilityDiceSmall: string
  utilityDiceLarge: string

  // Board corners
  goCollect: string
  jailLabel: string
  visitingLabel: string
  freeParkingLine1: string
  freeParkingLine2: string
  goToJailLine1: string
  goToJailLine2: string

  // ── Screens ──────────────────────────────────────────────────────────────────
  // GameScreen
  connectionLostTitle: string
  checkNetworkMsg: string
  gamePinLabel: string
  retryBtn: string
  loadingGame: string

  // SessionListScreen
  newGameBtn: string
  joinByCodeTitle: string
  joinCodePlaceholder: string
  joinBtnLabel: string
  joiningLabel: string
  sessionsLoadFailed: string
  gameNotFoundErr: string
  connectionErr: string
  quickStartFailed: string
  quickStartLabel: string
  quickStartHint: string
  rejoinBanner: string
  waitingRoomsTitle: string
  activeGamesTitle: string
  noActiveGames: string
  finishedGamesTitle: string
  refreshBtn: string
  watchLabel: string
  joinLabel: string
  joinLobbyLabel: string
  playerCountMeta: (n: number) => string
  deleteGameConfirm: (id: string) => string
  timeJustNow: string
  timeMinAgo: (n: number) => string
  timeHourAgo: (n: number) => string
  timeDayAgo: (n: number) => string

  // LobbyScreen
  playerCountLabel: string
  tokenLabel: string
  colorUsedByOther: string
  humanLabel: string
  botLabel: string
  easyLabel: string
  normalLabel: string
  strongLabel: string
  addHumanBtn: string
  addBotBtn: string
  removePlayerBtn: string
  randomizeNamesBtn: string
  randomizeBtn: string
  startGameBtn: string
  startingLabel: string
  createLobbyBtn: string
  creatingLabel: string
  lobbyHint: string
  immediateHint: string
  nameRequiredErr: string
  minPlayersErr: string
  colorsUniqueErr: string
  lobbyFailedErr: (e: string) => string
  sessionFailedErr: (e: string) => string
  backBtn: string
  playerPlaceholder: (i: number) => string

  // LobbyWaitingScreen
  waitingRoomSubtitle: string
  gamePinLabel2: string
  seatsLabel: (joined: number, total: number) => string
  joinGameTitle: string
  yourNamePlaceholder: string
  freeSeatLabel: string
  lobbyFullMsg: string
  joinedMsg: string
  waitForHostMsg: string
  startBtn: string
  startingBtn: string
  needMorePlayers: (have: number, total: number) => string
  startFailedErr: string
  joinFailedErr: string
  readyBtn: string
  cancelReadyBtn: string
  readyCount: (ready: number, total: number) => string
  waitingForReady: (ready: number, total: number) => string
  gameStarting: string
  removeBotBtn: string

  // LobbyScreen — bot-only section
  watchBotsTitle: string
  botCountLabel: (n: number) => string
  startBotsBtn: string

  // ActionPanel — spectator
  spectatorMsg: string
  endGameBtn: string

  // ── GameOverOverlay ──────────────────────────────────────────────────────────
  gameOverScreenTitle: string
  wonLabel: (name: string) => string
  shareResultsBtn: string
  copiedBtn: string
  continueWatchingBtn: string
  backToHomeBtn: string

  // ── PlayerList ───────────────────────────────────────────────────────────────
  youBadge: string
  bankruptBadge: string
  noPropertiesMsg: string
  propAbbr: (n: number) => string
  mortgagedStat: (n: number) => string
  tradeWithBtn: (name: string) => string

  // ── PropertyDetail ───────────────────────────────────────────────────────────
  streetTypeNames: Partial<Record<string, string>>
  noOwnerMsg: string
  mortgagedBadge: string
  currentRentLabel: string
  noRentMsg: string
  priceLabelPD: string
  mortgageValueLabel: string
  redemptionLabel: string
  rentsTitle: string
  emptyRentRow: (isMonopoly: boolean) => string
  railroadRentsTitle: string
  utilityRentTitle: string
  utilityOwned1: string
  utilityOwned2: string
  stationsOwned: (n: number, total: number) => string
  roiLabel: string
  roiVal: (n: number) => string
  buildHouseBtn: string
  sellHouseBtn: string
  tradeBtnPD: string
  closeBtnPD: string
  monopolyBadge: string
  houseCountLabel: (n: number) => string
  hotelOwnedLabel: string

  // ── OverflowMenu ─────────────────────────────────────────────────────────────
  moreActionsTitle: string
  startTradeSection: string
  buildAndMortgageBtn: string
  copyInviteLink: string
  linkCopied: string
  soundSettingsBtn: string
  keyboardShortcutsBtn: string
  leaveGameBtn: string
  endGameForAllBtn: string
  endGameConfirmMsg: string
  onlyHostCanEndGame: string
  buildModalTitle: string
  buildSectionTitle: string
  mortgageSectionMenuTitle: string
  redeemSectionMenuTitle: string
  mortgageBtnMenu: string
  redeemBtnMenu: string

  // ── SoundSettings ────────────────────────────────────────────────────────────
  soundSettingsTitle: string
  uiSoundsLabel: string
  uiSoundsDesc: string
  notifSoundsLabel: string
  notifSoundsDesc: string
  gameSoundsLabel: string
  gameSoundsDesc: string
  saveBtn: string
  animSpeedLabel: string
  animSpeedFast: string
  animSpeedNormal: string
  animSpeedSlow: string
  botSpeedLabel: string
  botSpeedFast: string
  botSpeedNormal: string
  botSpeedSlow: string

  // ── FlashBanner ──────────────────────────────────────────────────────────────
  yourTurnMsg: string
  reconnectingMsg: string
  commandErrorMsg: string

  // ── AppLayout ────────────────────────────────────────────────────────────────
  mobileTabs: Record<string, string>
  resizeHandleTitle: string
  playersTabLabel: string

  // ── Events (deriveEvents, non-React) ─────────────────────────────────────────
  ev: {
    drewCard: (name: string, text: string) => string
    gameOver: (winner: string) => string
    passedGo: (name: string) => string
    paidRent: (name: string, amount: number, owner: string) => string
    wentToJail: (name: string) => string
    releasedFromJail: (name: string) => string
    wentBankrupt: (name: string) => string
    bought: (owner: string, prop: string) => string
    gotMonopoly: (owner: string, type: string) => string
    transferred: (prop: string, from: string, to: string) => string
    mortgaged: (owner: string, prop: string) => string
    redeemed: (owner: string, prop: string) => string
    builtHouse: (owner: string, prop: string) => string
    soldHouse: (owner: string, prop: string) => string
    builtHotel: (owner: string, prop: string) => string
    soldHotel: (owner: string, prop: string) => string
    auctionWon: (winner: string, prop: string) => string
    auctionNoWinner: string
    tradeAccepted: (a: string, b: string) => string
    tradeDeclined: (name: string) => string
    tradeCancelled: string
    rolledDice: (name: string, d1: number, d2: number) => string
  }
}

const fi: T = {
  // Header
  waitingForPlayers: 'Odottaa pelaajia…',
  loading: 'Ladataan…',
  spectatorBadge: '👁 Katsoja',
  soundMuted: 'Äänet pois päältä (paina M)',
  soundOn: 'Äänet päällä (paina M)',
  langLabel: '🇫🇮',

  connecting: 'Yhdistetään…',
  reconnecting: 'Yhdistetään uudelleen…',
  connectionFailed: 'Yhteys katkesi',

  phases: {
    WAITING_FOR_ROLL: 'Heittää nopat',
    WAITING_FOR_CARD_ACK: 'Lukee korttia',
    WAITING_FOR_END_TURN: 'Lopettaa vuoron',
    WAITING_FOR_DECISION: 'Tekee päätöksen',
    WAITING_FOR_AUCTION: 'Huutokauppa',
    RESOLVING_DEBT: 'Selvittää velkaa',
    GAME_OVER: 'Peli päättynyt',
  },

  // ActionPanel
  gameOverTitle: '🏆 Peli päättyi!',
  bankruptLabel: 'KONKURSSI',
  movingToken: 'Siirretään pelimerkki…',
  priceLabel: (p) => `Hinta: €${p}`,
  buyBtn: (p) => `💰 Osta €${p}`,
  buyBtnKbd: (p) => `💰 Osta €${p}  [B]`,
  skipToAuction: '🏷 Ohita → huutokauppa',
  skipToAuctionKbd: '🏷 Ohita → huutokauppa  [D]',
  netWorthLabel: 'Nettovarallisuus',
  rentalIncomeLabel: 'Vuokratulot/kierros',
  yourTurnIn: (n) => `${n} pelaajan jälkeen`,
  doublesRoll: '🎲 Tuplaheitto! Heitä uudelleen',
  doublesWarning: ' — varoitus: 3. tupla = vankila',
  jailEscapeDoubles: '🔓 Tupla vapautti vankilasta — uutta heittovuoroa ei saa',
  inJail: (r) => `⛓ Vankilassa — ${r} kierrosta jäljellä`,
  useJailCard: (n) => `🃏 Käytä vapautuskortti (${n})`,
  payJailFine: '💸 Maksa €50 ja vapaudu',
  rollDice: '🎲 Heitä nopat',
  rollDiceKbd: '🎲 Heitä nopat  [välilyönti]',
  endTurn: '✅ Lopeta vuoro',
  endTurnKbd: '✅ Lopeta vuoro  [välilyönti]',
  rentPopupText: (amount, owner) => `Maksoit vuokraa €${amount} omistajalle ${owner}`,
  startTrade: (open) => `🤝 Aloita kauppa ${open ? '▴' : '▾'}`,
  buildHousesSectionTitle: 'Rakenna taloja',
  mortgageSectionTitle: 'Kiinnitys',
  redeemBtn: '💳 Lunasta',
  redeemAllBtn: (cost) => `💳 Lunasta kaikki €${cost}`,
  mortgageBtn: '🏦 Panttaa',
  unknownPhase: (p) => `Tila: ${p}`,

  auctionTitle: (name) => `🔨 Huutokauppa: ${name}`,
  auctionHighest: (bid, leader) => `Korkein: €${bid}${leader ? ` — ${leader}` : ''}`,
  auctionRemaining: (n) => `${n} pelaajaa jäljellä`,
  auctionPassed: (names) => ` · Passasi: ${names}`,
  auctionListPrice: (v) => `🏷 Listahinta €${v}`,
  auctionActorWaiting: (name) => `⏳ ${name} tekee tarjouksen…`,
  auctionConfirmWin: '🏆 Vahvista voitto',
  placeBidBtn: 'Tarjoa',
  passAuctionBtn: '🚫 Passi',
  passAuctionBtnKbd: '🚫 Passi  [P]',
  waitingForOthers: '⏳ Odotetaan muita pelaajia…',

  debtTitle: (amount, creditor) => `⚠️ Velka €${amount} → ${creditor}`,
  debtReasonLabel: 'Syy',
  debtReasonRent: (p) => `Vuokra: ${p}`,
  debtReasonTax: 'Veromaksu',
  debtReasonCard: 'Korttimaksu',
  debtReasonRepairs: 'Korttimaksu (korjaukset)',
  debtCashLabel: 'Kassassasi',
  debtLiquidationLabel: 'Realisoitavissa',
  debtCash: (n) => `Käteinen: €${n}`,
  debtLiquidation: (n) => `Likvidointiarvo: ~€${n}`,
  payDebtBtn: '💸 Maksa velka',
  mortgagePropBtn: (name) => `🏦 Panttaa ${name}`,
  sellRoundBtn: (count, type) => `🏘 Myy kierros (${count} kiin.): ${type}`,
  hotelLabel: 'hotelli',
  houseLabel: 'talo',
  sellBuildingBtn: (type, name) => `🏠 Myy ${type}: ${name}`,
  declareBankruptcy: '☠ Julistaudu konkurssiin',
  bankLabel: 'Pankki',
  playerCreditorLabel: 'pelaaja',

  tradeWaiting: '⏳ Odotetaan kaupan vastausta…',
  tradeCounterEditing: '⏳ Vastapuoli muokkaa vastatarjousta…',
  tradeApplying: '✅ Kauppa hyväksytty, käsitellään…',
  cancelOfferBtn: '❌ Peruuta tarjous',
  tradeTitle: (partner) => `🤝 Kauppa: ${partner}`,
  youOfferLabel: 'Sinä tarjoat',
  youRequestLabel: 'Sinä pyydät',
  sendOfferBtn: '📤 Lähetä tarjous',
  cancelBtn: '❌ Peruuta',
  tradeOfferFrom: (initiator) => `🤝 Kauppatarjous — ${initiator}`,
  theyOfferLabel: 'He tarjoavat',
  theyRequestLabel: 'He pyytävät',
  acceptBtn: '✅ Hyväksy',
  counterOfferBtn: '💬 Vastatarjous',
  declineBtn: '❌ Hylkää',
  cardOkBtn: '✓ Selvä',
  botDrawingCard: (name) => `${name} nostaa kortin`,
  actionTabLabel: '🎲 Vuoro',
  propertiesTabLabel: '🏠 Kiinteistöt',
  tradeCashLabel: (amount) => `Kassa: €${amount}`,
  mortgagedInTrade: 'pantattu',

  // EventLog
  filterAll: 'Kaikki',
  filterTitles: {
    dice:     'Nopanheitot',
    moves:    'Siirtymät',
    money:    'Raha & vuokrat',
    property: 'Kiinteistöt & huutokaupat',
    build:    'Rakentaminen & panttaus',
    trade:    'Kaupat',
    jail:     'Vankila & erikoistapahtumat',
  },
  showMineOnly: 'Näytä vain omat tapahtumat',
  noEventsYet: 'Ei tapahtumia vielä.',
  justNow: 'juuri nyt',
  secondsAgo: (n) => `${n}s sitten`,
  minutesAgo: (n) => `${n}m sitten`,

  // Board
  doublesLabel: 'tupla',
  roundLabel: (n) => `Kierros ${n}`,
  freeLabel: 'Vapaa',
  rentTooltip: (r) => `Vuokra ${r}`,
  soldPropsTitle: 'Myytyjen kiinteistöjen määrä',
  housesStockTitle: (h, left) => `${h} taloa pystyssä, ${left} pankissa`,
  hotelsStockTitle: (h, left) => `${h} hotellia pystyssä, ${left} pankissa`,
  utilityDiceSmall: '4× nopat',
  utilityDiceLarge: '10× nopat',

  goCollect: 'Kerää €200',
  jailLabel: 'Vankila',
  visitingLabel: 'Vierailulla',
  freeParkingLine1: 'Vapaa',
  freeParkingLine2: 'Pysäköinti',
  goToJailLine1: 'Mene',
  goToJailLine2: 'Vankilaan!',

  // GameScreen
  connectionLostTitle: 'Yhteys katkesi',
  checkNetworkMsg: 'Tarkista verkko tai lataa sivu uudelleen.',
  gamePinLabel: 'Pelin koodi:',
  retryBtn: 'Yritä uudelleen',
  loadingGame: 'Ladataan peliä…',

  // SessionListScreen
  newGameBtn: '+ Uusi peli',
  joinByCodeTitle: 'Liity koodilla',
  joinCodePlaceholder: 'esim. rohkea-karhu-47',
  joinBtnLabel: 'Liity',
  joiningLabel: '…',
  sessionsLoadFailed: 'Sessioiden lataus epäonnistui.',
  gameNotFoundErr: 'Peliä ei löydy. Tarkista koodi.',
  connectionErr: 'Yhteysongelma. Yritä uudelleen.',
  quickStartFailed: 'Pikapelin luonti epäonnistui.',
  quickStartLabel: 'tai aloita heti bottia vastaan',
  quickStartHint: 'Luo pelin heti sinulle + boteille',
  rejoinBanner: '↩ Jatkasitko viime peliä?',
  waitingRoomsTitle: 'Odotushuoneet',
  activeGamesTitle: 'Käynnissä olevat pelit',
  noActiveGames: 'Ei aktiivisia pelejä.',
  finishedGamesTitle: 'Päättyneet pelit',
  refreshBtn: 'Päivitä lista',
  watchLabel: 'Katso',
  joinLabel: 'Liity',
  joinLobbyLabel: 'Liity odotushuoneeseen',
  playerCountMeta: (n) => `${n} pelaajaa`,
  deleteGameConfirm: (id) => `Poistetaanko peli ${id}?`,
  timeJustNow: 'juuri nyt',
  timeMinAgo: (n) => `${n}min sitten`,
  timeHourAgo: (n) => `${n}h sitten`,
  timeDayAgo: (n) => `${Math.floor(n)}pv sitten`,

  // LobbyScreen
  playerCountLabel: 'Pelaajia',
  tokenLabel: 'Pelimerkki',
  colorUsedByOther: 'Väri on jo käytössä toisella pelaajalla',
  humanLabel: 'Ihminen',
  botLabel: 'Botti',
  easyLabel: 'Helppo',
  normalLabel: 'Normaali',
  strongLabel: 'Vahva',
  addHumanBtn: 'Lisää ihminen',
  addBotBtn: 'Lisää botti',
  removePlayerBtn: 'Poista',
  randomizeNamesBtn: '🎲 Arvo nimet',
  randomizeBtn: '🎲 Arvo pelaajat',
  startGameBtn: 'Aloita peli',
  startingLabel: 'Luodaan…',
  createLobbyBtn: 'Luo odotushuone',
  creatingLabel: 'Luodaan…',
  lobbyHint: 'Muut voivat liittyä jaettavalla koodilla',
  immediateHint: 'Peli alkaa heti — voit pelata botteja tai toisia vastaan',
  nameRequiredErr: 'Kaikilla pelaajilla pitää olla nimi.',
  minPlayersErr: 'Pelissä täytyy olla vähintään 2 pelaajaa.',
  colorsUniqueErr: 'Jokaisella pelaajalla pitää olla eri väri.',
  lobbyFailedErr: (e) => `Odotushuoneen luonti epäonnistui: ${e}`,
  sessionFailedErr: (e) => `Sessio ei onnistunut: ${e}`,
  backBtn: 'Takaisin',
  playerPlaceholder: (i) => `Pelaaja ${i + 1}`,

  // LobbyWaitingScreen
  waitingRoomSubtitle: 'Helsinki Edition — Odotushuone',
  gamePinLabel2: 'Pelin koodi:',
  seatsLabel: (joined, total) => `Pelaajat (${joined}/${total})`,
  joinGameTitle: 'Liity peliin',
  yourNamePlaceholder: 'Nimesi',
  freeSeatLabel: 'Vapaa paikka',
  lobbyFullMsg: 'Odotushuone on täynnä.',
  joinedMsg: 'Olet liittynyt peliin. Odota että host aloittaa pelin.',
  waitForHostMsg: 'Odota että host aloittaa pelin.',
  startBtn: 'Aloita peli',
  startingBtn: 'Aloitetaan…',
  needMorePlayers: (have, total) => `Tarvitaan vähintään 2 pelaajaa (${have}/${total})`,
  startFailedErr: 'Pelin aloitus epäonnistui.',
  joinFailedErr: 'Liittyminen epäonnistui — odotushuone täynnä tai peli jo aloitettu.',
  readyBtn: 'Olen valmis',
  cancelReadyBtn: 'Peru valmius',
  readyCount: (ready, total) => `${ready}/${total} valmis`,
  waitingForReady: (ready, total) => `Odotetaan pelaajia — ${ready}/${total} valmiina`,
  gameStarting: 'Peli alkaa…',
  removeBotBtn: 'Poista botti',
  watchBotsTitle: '👁 Seuraa bottipeliä',
  botCountLabel: (n) => `Botteja: ${n}`,
  startBotsBtn: 'Aloita bottipeli',
  spectatorMsg: 'Olet katsojana',
  endGameBtn: '🛑 Lopeta peli',

  // GameOverOverlay
  gameOverScreenTitle: 'Peli päättyi!',
  wonLabel: (name) => `${name} voitti!`,
  shareResultsBtn: '📋 Jaa tulokset',
  copiedBtn: '✓ Kopioitu!',
  continueWatchingBtn: 'Jatka katselemaan',
  backToHomeBtn: 'Takaisin etusivulle',

  // PlayerList
  youBadge: 'sinä',
  bankruptBadge: 'konkurssi',
  noPropertiesMsg: 'Ei kiinteistöjä',
  propAbbr: (n) => `${n} kiin.`,
  mortgagedStat: (n) => `🏦${n} pantattu`,
  tradeWithBtn: (name) => `🤝 Käy kauppaa ${name.split(' ')[0]}:n kanssa`,

  // PropertyDetail
  streetTypeNames: {
    BROWN:      'Ruskea',
    LIGHT_BLUE: 'Vaaleansininen',
    PURPLE:     'Violetti',
    ORANGE:     'Oranssi',
    RED:        'Punainen',
    YELLOW:     'Keltainen',
    GREEN:      'Vihreä',
    DARK_BLUE:  'Tummansininen',
    RAILROAD:   'Rautatieasema',
    UTILITY:    'Laitos',
  },
  noOwnerMsg: 'Ei omistajaa',
  mortgagedBadge: 'PANTATTU',
  currentRentLabel: 'Nykyinen vuokra',
  noRentMsg: 'Ei vuokraa — pantattu',
  priceLabelPD: 'Hinta',
  mortgageValueLabel: 'Panttausarvo',
  redemptionLabel: 'Lunastushinta (+10%)',
  rentsTitle: 'Vuokrat',
  emptyRentRow: (isMonopoly) => `Tyhjä${isMonopoly ? ' (monopoli 2×)' : ''}`,
  railroadRentsTitle: 'Vuokrat (asemien mukaan)',
  utilityRentTitle: 'Vuokra',
  utilityOwned1: '1 laitos omistettu',
  utilityOwned2: '2 laitosta omistettu',
  stationsOwned: (n, total) => `Omistajalla ${n}/${total} asemaa`,
  roiLabel: 'Takaisinmaksu (tyhjä)',
  roiVal: (n) => `~${n}× kierros`,
  buildHouseBtn: '🏠 Rakenna talo',
  sellHouseBtn: '−🏠 Myy talo',
  tradeBtnPD: '🤝 Tee kauppa',
  closeBtnPD: 'Sulje',
  monopolyBadge: 'MONOPOLI',
  houseCountLabel: (n) => `${'🏠'.repeat(n)} ${n} talo${n !== 1 ? 'a' : ''}`,
  hotelOwnedLabel: '🏨 Hotelli',

  // OverflowMenu
  moreActionsTitle: 'Lisätoiminnot',
  startTradeSection: '🤝 Tee kauppa',
  buildAndMortgageBtn: '🏠 Rakenna / Panttaa',
  copyInviteLink: '🔗 Kopioi kutsulink',
  linkCopied: '✓ Linkki kopioitu!',
  soundSettingsBtn: '⚙️ Asetukset',
  keyboardShortcutsBtn: '⌨ Pikanäppäimet',
  leaveGameBtn: '🚪 Poistu pelistä',
  endGameForAllBtn: '🛑 Lopeta peli kaikille',
  endGameConfirmMsg: 'Lopeta peli? Tämä päättää pelin kaikille pelaajille eikä ole peruutettavissa.',
  onlyHostCanEndGame: 'Vain host voi sulkea pelin',
  buildModalTitle: 'Rakenna / Panttaa',
  buildSectionTitle: '🏠 Rakenna taloja',
  mortgageSectionMenuTitle: '🏦 Panttaa',
  redeemSectionMenuTitle: '💳 Lunasta pantit',
  mortgageBtnMenu: 'Panttaa',
  redeemBtnMenu: 'Lunasta',

  // SoundSettings
  soundSettingsTitle: '⚙️ Asetukset',
  uiSoundsLabel: 'UI-äänet',
  uiSoundsDesc: 'Napit, siirtymät',
  notifSoundsLabel: 'Ilmoitusäänet',
  notifSoundsDesc: 'Vuoro, vuokra',
  gameSoundsLabel: 'Pelitapahtumat',
  gameSoundsDesc: 'Noppa, osto',
  saveBtn: 'Tallenna',
  animSpeedLabel: 'Animaationopeus',
  animSpeedFast: 'Nopein',
  animSpeedNormal: 'Normaali',
  animSpeedSlow: 'Hidas',
  botSpeedLabel: 'Botin nopeus',
  botSpeedFast: 'Nopein',
  botSpeedNormal: 'Normaali',
  botSpeedSlow: 'Hidas',

  // FlashBanner
  yourTurnMsg: 'Sinun vuorosi!',
  reconnectingMsg: 'Yhdistetään uudelleen…',
  commandErrorMsg: 'Komento epäonnistui — tarkista yhteys',

  // AppLayout
  mobileTabs: {
    board: '🎲 Lauta',
    players: '👥 Pelaajat',
    log: '📋 Loki',
    actions: '⚡ Toiminnot',
  },
  resizeHandleTitle: 'Vedä muuttaaksesi leveyttä',
  playersTabLabel: '👥 Pelaajat',

  // Events
  ev: {
    drewCard: (name, text) => `${name} nosti: ${text}`,
    gameOver: (winner) => `Peli päättyi! Voittaja: ${winner}`,
    passedGo: (name) => `${name} ohitti GO — +€200!`,
    paidRent: (name, amount, owner) => `${name} maksoi vuokraa €${amount} → ${owner}`,
    wentToJail: (name) => `${name} meni vankilaan`,
    releasedFromJail: (name) => `${name} vapautui vankilasta`,
    wentBankrupt: (name) => `${name} meni konkurssiin`,
    bought: (owner, prop) => `${owner} osti ${prop}`,
    gotMonopoly: (owner, type) => `${owner} sai monopolin: ${type}!`,
    transferred: (prop, from, to) => `${prop}: ${from} → ${to}`,
    mortgaged: (owner, prop) => `${owner} panttasi ${prop}`,
    redeemed: (owner, prop) => `${owner} lunasti ${prop}`,
    builtHouse: (owner, prop) => `${owner} rakensi talon → ${prop}`,
    soldHouse: (owner, prop) => `${owner} myi talon ← ${prop}`,
    builtHotel: (owner, prop) => `${owner} rakensi hotellin → ${prop}`,
    soldHotel: (owner, prop) => `${owner} myi hotellin ← ${prop}`,
    auctionWon: (winner, prop) => `Huutokauppa: ${winner} voitti ${prop}`,
    auctionNoWinner: 'Huutokauppa päättyi ilman voittajaa',
    tradeAccepted: (a, b) => `Kauppa hyväksytty: ${a} ↔ ${b}`,
    tradeDeclined: (name) => `${name} hylkäsi kauppatarjouksen`,
    tradeCancelled: 'Kaupankäynti peruutettu',
    rolledDice: (name, d1, d2) => `${name} heitti ${d1}+${d2}=${d1+d2}${d1===d2?' (tupla)':''}`,
  },
}

const en: T = {
  // Header
  waitingForPlayers: 'Waiting for players…',
  loading: 'Loading…',
  spectatorBadge: '👁 Spectator',
  soundMuted: 'Sound off (press M)',
  soundOn: 'Sound on (press M)',
  langLabel: '🇬🇧',

  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  connectionFailed: 'Connection lost',

  phases: {
    WAITING_FOR_ROLL: 'Rolling dice',
    WAITING_FOR_CARD_ACK: 'Reading card',
    WAITING_FOR_END_TURN: 'Ending turn',
    WAITING_FOR_DECISION: 'Deciding',
    WAITING_FOR_AUCTION: 'Auction',
    RESOLVING_DEBT: 'Resolving debt',
    GAME_OVER: 'Game over',
  },

  // ActionPanel
  gameOverTitle: '🏆 Game over!',
  bankruptLabel: 'BANKRUPT',
  movingToken: 'Moving token…',
  priceLabel: (p) => `Price: €${p}`,
  buyBtn: (p) => `💰 Buy €${p}`,
  buyBtnKbd: (p) => `💰 Buy €${p}  [B]`,
  skipToAuction: '🏷 Skip → auction',
  skipToAuctionKbd: '🏷 Skip → auction  [D]',
  netWorthLabel: 'Net worth',
  rentalIncomeLabel: 'Rental income/round',
  yourTurnIn: (n) => `after ${n} player${n !== 1 ? 's' : ''}`,
  doublesRoll: '🎲 Doubles! Roll again',
  doublesWarning: ' — warning: 3rd double = jail',
  jailEscapeDoubles: '🔓 Doubles released from jail — no extra turn',
  inJail: (r) => `⛓ In jail — ${r} round${r !== 1 ? 's' : ''} left`,
  useJailCard: (n) => `🃏 Use get-out-of-jail card (${n})`,
  payJailFine: '💸 Pay €50 and get out',
  rollDice: '🎲 Roll dice',
  rollDiceKbd: '🎲 Roll dice  [space]',
  endTurn: '✅ End turn',
  endTurnKbd: '✅ End turn  [space]',
  rentPopupText: (amount, owner) => `You paid €${amount} rent to ${owner}`,
  startTrade: (open) => `🤝 Trade ${open ? '▴' : '▾'}`,
  buildHousesSectionTitle: 'Build houses',
  mortgageSectionTitle: 'Mortgage',
  redeemBtn: '💳 Redeem',
  redeemAllBtn: (cost) => `💳 Redeem all €${cost}`,
  mortgageBtn: '🏦 Mortgage',
  unknownPhase: (p) => `State: ${p}`,

  auctionTitle: (name) => `🔨 Auction: ${name}`,
  auctionHighest: (bid, leader) => `Highest: €${bid}${leader ? ` — ${leader}` : ''}`,
  auctionRemaining: (n) => `${n} player${n !== 1 ? 's' : ''} remaining`,
  auctionPassed: (names) => ` · Passed: ${names}`,
  auctionListPrice: (v) => `🏷 List price €${v}`,
  auctionActorWaiting: (name) => `⏳ ${name} is bidding…`,
  auctionConfirmWin: '🏆 Confirm win',
  placeBidBtn: 'Bid',
  passAuctionBtn: '🚫 Pass',
  passAuctionBtnKbd: '🚫 Pass  [P]',
  waitingForOthers: '⏳ Waiting for others…',

  debtTitle: (amount, creditor) => `⚠️ Debt €${amount} → ${creditor}`,
  debtReasonLabel: 'Reason',
  debtReasonRent: (p) => `Rent: ${p}`,
  debtReasonTax: 'Tax',
  debtReasonCard: 'Card payment',
  debtReasonRepairs: 'Card payment (repairs)',
  debtCashLabel: 'Your cash',
  debtLiquidationLabel: 'Liquidatable',
  debtCash: (n) => `Cash: €${n}`,
  debtLiquidation: (n) => `Liquidation value: ~€${n}`,
  payDebtBtn: '💸 Pay debt',
  mortgagePropBtn: (name) => `🏦 Mortgage ${name}`,
  sellRoundBtn: (count, type) => `🏘 Sell round (${count} prop.): ${type}`,
  hotelLabel: 'hotel',
  houseLabel: 'house',
  sellBuildingBtn: (type, name) => `🏠 Sell ${type}: ${name}`,
  declareBankruptcy: '☠ Declare bankruptcy',
  bankLabel: 'Bank',
  playerCreditorLabel: 'player',

  tradeWaiting: '⏳ Waiting for trade response…',
  tradeCounterEditing: '⏳ Other player is editing their counter-offer…',
  tradeApplying: '✅ Trade accepted, applying…',
  cancelOfferBtn: '❌ Cancel offer',
  tradeTitle: (partner) => `🤝 Trade: ${partner}`,
  youOfferLabel: 'You offer',
  youRequestLabel: 'You request',
  sendOfferBtn: '📤 Send offer',
  cancelBtn: '❌ Cancel',
  tradeOfferFrom: (initiator) => `🤝 Trade offer — ${initiator}`,
  theyOfferLabel: 'They offer',
  theyRequestLabel: 'They request',
  acceptBtn: '✅ Accept',
  counterOfferBtn: '💬 Counter offer',
  declineBtn: '❌ Decline',
  cardOkBtn: '✓ Got it',
  botDrawingCard: (name) => `${name} draws a card`,
  actionTabLabel: '🎲 Turn',
  propertiesTabLabel: '🏠 Properties',
  tradeCashLabel: (amount) => `Cash: €${amount}`,
  mortgagedInTrade: 'mortgaged',

  // EventLog
  filterAll: 'All',
  filterTitles: {
    dice:     'Dice rolls',
    moves:    'Movement',
    money:    'Money & rent',
    property: 'Properties & auctions',
    build:    'Building & mortgages',
    trade:    'Trades',
    jail:     'Jail & special events',
  },
  showMineOnly: 'Show my events only',
  noEventsYet: 'No events yet.',
  justNow: 'just now',
  secondsAgo: (n) => `${n}s ago`,
  minutesAgo: (n) => `${n}m ago`,

  // Board
  doublesLabel: 'doubles',
  roundLabel: (n) => `Round ${n}`,
  freeLabel: 'Free',
  rentTooltip: (r) => `Rent ${r}`,
  soldPropsTitle: 'Number of sold properties',
  housesStockTitle: (h, left) => `${h} houses standing, ${left} in bank`,
  hotelsStockTitle: (h, left) => `${h} hotels standing, ${left} in bank`,
  utilityDiceSmall: '4× dice',
  utilityDiceLarge: '10× dice',

  goCollect: 'Collect €200',
  jailLabel: 'Jail',
  visitingLabel: 'Visiting',
  freeParkingLine1: 'Free',
  freeParkingLine2: 'Parking',
  goToJailLine1: 'Go to',
  goToJailLine2: 'Jail!',

  // GameScreen
  connectionLostTitle: 'Connection lost',
  checkNetworkMsg: 'Check your network or reload the page.',
  gamePinLabel: 'Game code:',
  retryBtn: 'Try again',
  loadingGame: 'Loading game…',

  // SessionListScreen
  newGameBtn: '+ New game',
  joinByCodeTitle: 'Join by code',
  joinCodePlaceholder: 'e.g. bold-bear-47',
  joinBtnLabel: 'Join',
  joiningLabel: '…',
  sessionsLoadFailed: 'Failed to load sessions.',
  gameNotFoundErr: 'Game not found. Check the code.',
  connectionErr: 'Connection error. Try again.',
  quickStartFailed: 'Failed to create quick game.',
  quickStartLabel: 'or start instantly vs bots',
  quickStartHint: 'Creates a game for you + bots immediately',
  rejoinBanner: '↩ Continue last game?',
  waitingRoomsTitle: 'Waiting rooms',
  activeGamesTitle: 'Active games',
  noActiveGames: 'No active games.',
  finishedGamesTitle: 'Finished games',
  refreshBtn: 'Refresh',
  watchLabel: 'Watch',
  joinLabel: 'Join',
  joinLobbyLabel: 'Join waiting room',
  playerCountMeta: (n) => `${n} player${n !== 1 ? 's' : ''}`,
  deleteGameConfirm: (id) => `Delete game ${id}?`,
  timeJustNow: 'just now',
  timeMinAgo: (n) => `${n}min ago`,
  timeHourAgo: (n) => `${n}h ago`,
  timeDayAgo: (n) => `${Math.floor(n)}d ago`,

  // LobbyScreen
  playerCountLabel: 'Players',
  tokenLabel: 'Token',
  colorUsedByOther: 'Color already used by another player',
  humanLabel: 'Human',
  botLabel: 'Bot',
  easyLabel: 'Easy',
  normalLabel: 'Normal',
  strongLabel: 'Strong',
  addHumanBtn: 'Add human',
  addBotBtn: 'Add bot',
  removePlayerBtn: 'Remove',
  randomizeNamesBtn: '🎲 Random names',
  randomizeBtn: '🎲 Randomize players',
  startGameBtn: 'Start game',
  startingLabel: 'Creating…',
  createLobbyBtn: 'Create waiting room',
  creatingLabel: 'Creating…',
  lobbyHint: 'Others can join with a shared code',
  immediateHint: 'Game starts immediately — play against bots or others',
  nameRequiredErr: 'All players must have a name.',
  minPlayersErr: 'The game requires at least 2 players.',
  colorsUniqueErr: 'Each player must have a unique color.',
  lobbyFailedErr: (e) => `Failed to create waiting room: ${e}`,
  sessionFailedErr: (e) => `Session failed: ${e}`,
  backBtn: 'Back',
  playerPlaceholder: (i) => `Player ${i + 1}`,

  // LobbyWaitingScreen
  waitingRoomSubtitle: 'Helsinki Edition — Waiting Room',
  gamePinLabel2: 'Game code:',
  seatsLabel: (joined, total) => `Players (${joined}/${total})`,
  joinGameTitle: 'Join game',
  yourNamePlaceholder: 'Your name',
  freeSeatLabel: 'Open seat',
  lobbyFullMsg: 'Waiting room is full.',
  joinedMsg: 'You have joined. Wait for the host to start the game.',
  waitForHostMsg: 'Wait for the host to start the game.',
  startBtn: 'Start game',
  startingBtn: 'Starting…',
  needMorePlayers: (have, total) => `Need at least 2 players (${have}/${total})`,
  startFailedErr: 'Failed to start game.',
  joinFailedErr: 'Join failed — waiting room full or game already started.',
  readyBtn: 'Ready',
  cancelReadyBtn: 'Cancel ready',
  readyCount: (ready, total) => `${ready}/${total} ready`,
  waitingForReady: (ready, total) => `Waiting for players — ${ready}/${total} ready`,
  gameStarting: 'Game starting…',
  removeBotBtn: 'Remove bot',
  watchBotsTitle: '👁 Watch bot game',
  botCountLabel: (n) => `Bots: ${n}`,
  startBotsBtn: 'Start bot game',
  spectatorMsg: 'You are a spectator',
  endGameBtn: '🛑 End game',

  // GameOverOverlay
  gameOverScreenTitle: 'Game over!',
  wonLabel: (name) => `${name} wins!`,
  shareResultsBtn: '📋 Share results',
  copiedBtn: '✓ Copied!',
  continueWatchingBtn: 'Continue watching',
  backToHomeBtn: 'Back to home',

  // PlayerList
  youBadge: 'you',
  bankruptBadge: 'bankrupt',
  noPropertiesMsg: 'No properties',
  propAbbr: (n) => `${n} prop.`,
  mortgagedStat: (n) => `🏦${n} mortgaged`,
  tradeWithBtn: (name) => `🤝 Trade with ${name.split(' ')[0]}`,

  // PropertyDetail
  streetTypeNames: {
    BROWN:      'Brown',
    LIGHT_BLUE: 'Light Blue',
    PURPLE:     'Purple',
    ORANGE:     'Orange',
    RED:        'Red',
    YELLOW:     'Yellow',
    GREEN:      'Green',
    DARK_BLUE:  'Dark Blue',
    RAILROAD:   'Railroad',
    UTILITY:    'Utility',
  },
  noOwnerMsg: 'No owner',
  mortgagedBadge: 'MORTGAGED',
  currentRentLabel: 'Current rent',
  noRentMsg: 'No rent — mortgaged',
  priceLabelPD: 'Price',
  mortgageValueLabel: 'Mortgage value',
  redemptionLabel: 'Redemption price (+10%)',
  rentsTitle: 'Rents',
  emptyRentRow: (isMonopoly) => `Empty${isMonopoly ? ' (monopoly 2×)' : ''}`,
  railroadRentsTitle: 'Rents (by stations)',
  utilityRentTitle: 'Rent',
  utilityOwned1: '1 utility owned',
  utilityOwned2: '2 utilities owned',
  stationsOwned: (n, total) => `Owner has ${n}/${total} stations`,
  roiLabel: 'Payback (empty)',
  roiVal: (n) => `~${n}× rounds`,
  buildHouseBtn: '🏠 Build house',
  sellHouseBtn: '−🏠 Sell house',
  tradeBtnPD: '🤝 Trade',
  closeBtnPD: 'Close',
  monopolyBadge: 'MONOPOLY',
  houseCountLabel: (n) => `${'🏠'.repeat(n)} ${n} house${n !== 1 ? 's' : ''}`,
  hotelOwnedLabel: '🏨 Hotel',

  // OverflowMenu
  moreActionsTitle: 'More actions',
  startTradeSection: '🤝 Trade',
  buildAndMortgageBtn: '🏠 Build / Mortgage',
  copyInviteLink: '🔗 Copy invite link',
  linkCopied: '✓ Link copied!',
  soundSettingsBtn: '⚙️ Settings',
  keyboardShortcutsBtn: '⌨ Keyboard shortcuts',
  leaveGameBtn: '🚪 Leave game',
  endGameForAllBtn: '🛑 End game for all',
  endGameConfirmMsg: 'End game? This ends the game for all players and cannot be undone.',
  onlyHostCanEndGame: 'Only the host can end the game',
  buildModalTitle: 'Build / Mortgage',
  buildSectionTitle: '🏠 Build houses',
  mortgageSectionMenuTitle: '🏦 Mortgage',
  redeemSectionMenuTitle: '💳 Redeem mortgages',
  mortgageBtnMenu: 'Mortgage',
  redeemBtnMenu: 'Redeem',

  // SoundSettings
  soundSettingsTitle: '⚙️ Settings',
  uiSoundsLabel: 'UI sounds',
  uiSoundsDesc: 'Buttons, movement',
  notifSoundsLabel: 'Notification sounds',
  notifSoundsDesc: 'Turn, rent',
  gameSoundsLabel: 'Game events',
  gameSoundsDesc: 'Dice, purchase',
  saveBtn: 'Save',
  animSpeedLabel: 'Animation speed',
  animSpeedFast: 'Fastest',
  animSpeedNormal: 'Normal',
  animSpeedSlow: 'Slow',
  botSpeedLabel: 'Bot speed',
  botSpeedFast: 'Fastest',
  botSpeedNormal: 'Normal',
  botSpeedSlow: 'Slow',

  // FlashBanner
  yourTurnMsg: 'Your turn!',
  reconnectingMsg: 'Reconnecting…',
  commandErrorMsg: 'Command failed — check connection',

  // AppLayout
  mobileTabs: {
    board: '🎲 Board',
    players: '👥 Players',
    log: '📋 Log',
    actions: '⚡ Actions',
  },
  resizeHandleTitle: 'Drag to resize',
  playersTabLabel: '👥 Players',

  // Events
  ev: {
    drewCard: (name, text) => `${name} drew: ${text}`,
    gameOver: (winner) => `Game over! Winner: ${winner}`,
    passedGo: (name) => `${name} passed GO — +€200!`,
    paidRent: (name, amount, owner) => `${name} paid rent €${amount} → ${owner}`,
    wentToJail: (name) => `${name} went to jail`,
    releasedFromJail: (name) => `${name} was released from jail`,
    wentBankrupt: (name) => `${name} went bankrupt`,
    bought: (owner, prop) => `${owner} bought ${prop}`,
    gotMonopoly: (owner, type) => `${owner} got a monopoly: ${type}!`,
    transferred: (prop, from, to) => `${prop}: ${from} → ${to}`,
    mortgaged: (owner, prop) => `${owner} mortgaged ${prop}`,
    redeemed: (owner, prop) => `${owner} redeemed ${prop}`,
    builtHouse: (owner, prop) => `${owner} built a house → ${prop}`,
    soldHouse: (owner, prop) => `${owner} sold a house ← ${prop}`,
    builtHotel: (owner, prop) => `${owner} built a hotel → ${prop}`,
    soldHotel: (owner, prop) => `${owner} sold a hotel ← ${prop}`,
    auctionWon: (winner, prop) => `Auction: ${winner} won ${prop}`,
    auctionNoWinner: 'Auction ended without a winner',
    tradeAccepted: (a, b) => `Trade accepted: ${a} ↔ ${b}`,
    tradeDeclined: (name) => `${name} declined the trade offer`,
    tradeCancelled: 'Trade cancelled',
    rolledDice: (name, d1, d2) => `${name} rolled ${d1}+${d2}=${d1+d2}${d1===d2?' (doubles)':''}`,
  },
}

export const translations: Record<Lang, T> = { fi, en }
