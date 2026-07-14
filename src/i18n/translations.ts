import type { Lang } from './lang'

export interface T {
  // ── Header ──────────────────────────────────────────────────────────────────
  waitingForPlayers: string
  loading: string
  spectatorBadge: string
  soundMuted: string
  soundOn: string
  languageToggleLabel: string
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
  insufficientFunds: string
  bankSupplyExhausted: string
  buildingsPresent: string
  mortgageToggleFailed: string
  netWorthLabel: string
  rentalIncomeLabel: string
  yourTurnIn: (n: number) => string
  doublesRoll: string
  doublesWarning: string
  jailEscapeDoubles: string
  inJail: (rounds: number) => string
  stuckInJail: (rounds: number) => string
  useJailCard: (n: number, rounds: number) => string
  payJailFine: (rounds: number) => string
  rollDice: string
  rollDiceKbd: string
  endTurn: string
  endTurnKbd: string
  rollAgainBtn: string
  rollAgainBtnKbd: string
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
  auctionWonWaiting: (name: string) => string
  auctionForSaleLabel: string
  auctionLeadTag: string
  auctionActorTag: string
  auctionPassedTag: string
  auctionYouWon: string
  auctionPlayerWon: (name: string) => string
  auctionYouPay: (amount: number) => string
  bidLabelYourTurn: string
  bidLabel: string
  auctionNoFundsInfo: (cash: number) => string
  placeBidBtn: string
  passAuctionBtn: string
  passAuctionBtnKbd: string
  waitingForOthers: string
  waitingForDebt: (playerName: string) => string
  // Debt
  debtTitle: (amount: number, creditor: string) => string
  debtCardTitle: string
  debtCreditorRow: (name: string) => string
  debtDebtorRow: (name: string) => string
  debtReasonLabel: string
  debtReasonRent: (propName: string) => string
  debtReasonTax: string
  debtReasonCard: string
  debtReasonRepairs: string
  debtReasonJail: string
  debtCashLabel: string
  debtLiquidationLabel: string
  debtCash: (n: number) => string
  debtLiquidation: (n: number) => string
  payDebtBtn: string
  debtShortfallLabel: string
  debtSuggestionLabel: string
  debtMortgageGroupTitle: string
  debtSellBuildingTitle: string
  mortgagePropBtn: (name: string) => string
  sellRoundBtn: (count: number, type: string) => string
  hotelLabel: string
  houseLabel: string
  sellBuildingBtn: (type: string, name: string) => string
  declareBankruptcy: string
  bankruptcyConfirmText: string
  bankruptcyConfirmTextPlayer: (creditorName: string) => string
  bankruptcyConfirmBtn: string
  bankLabel: string
  playerCreditorLabel: string
  // Trade
  tradeWaiting: string
  tradeCounterEditing: string
  tradeApplying: string
  tradeSpectatorBetween: (a: string, b: string) => string
  cancelOfferBtn: string
  tradeTitle: (partner: string) => string
  youOfferLabel: string
  youRequestLabel: string
  youGetLabel: string
  youGiveLabel: string
  tradeFairLabel: string
  tradeFavorsYouLabel: string
  tradeFavorsThemLabel: string
  sendOfferBtn: string
  cancelBtn: string
  tradeMadeOffer: string
  tradeOfferNoun: string
  tradeNothingLabel: string
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
  sessionNotFoundTitle: string
  sessionNotFoundMsg: string
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
  backendWaking: string
  backendWakingHint: string
  backendWakingSeconds: (s: number) => string
  gameNotFoundErr: string
  connectionErr: string
  quickStartFailed: string
  quickStartLabel: string
  quickStartHint: string
  appVersionLabel: string
  backendVersionLabel: string
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
  duplicateNameErr: string
  duplicateColorErr: string
  duplicateShapeErr: string
  lobbyFailedErr: (e: string) => string
  sessionFailedErr: (e: string) => string
  serverBusyErr: string
  serverFullErr: string
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
  nameTakenErr: string
  readyBtn: string
  cancelReadyBtn: string
  readyCount: (ready: number, total: number) => string
  waitingForReady: (ready: number, total: number) => string
  gameStarting: string
  removeBotBtn: string

  // LobbyScreen — mode toggle + opponents
  playingToggle: string
  spectatingToggle: string
  opponentsTitle: string
  computerPlayersLabel: (n: number) => string
  startNowBtn: string
  lobbyWaitHint: string

  // LobbyScreen — bot-only section (kept for compatibility)
  watchBotsTitle: string
  botCountLabel: (n: number) => string
  startBotsBtn: string

  // ActionPanel — spectator
  spectatorMsg: string
  endGameBtn: string
  retriggerBotBtn: string

  // ── GameOverOverlay ──────────────────────────────────────────────────────────
  gameOverScreenTitle: string
  wonLabel: (name: string) => string
  gameEndedNoWinner: string
  netWorthChartTitle: string
  richestMomentLabel: string
  shareResultsBtn: string
  copiedBtn: string
  continueWatchingBtn: string
  backToHomeBtn: string

  // ── PlayerList ───────────────────────────────────────────────────────────────
  youBadge: string
  bankruptBadge: string
  turnTimerLabel: string
  turnAfkHint: string
  noPropertiesMsg: string
  propAbbr: (n: number) => string
  mortgagedStat: (n: number) => string
  monopolyStatLabel: string
  tradeWithBtn: (name: string) => string

  // ── PropertyDetail ───────────────────────────────────────────────────────────
  streetTypeNames: Partial<Record<string, string>>
  monopolyCelebrationTitle: string
  monopolyCelebrationSub: (group: string) => string
  celebBoughtTitle: string
  celebAuctionWonTitle: string
  celebHotelTitle: string
  celebBigRentTitle: string
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
  closeLabel: string
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
  howToPlayBtn: string
  howToPlayTitle: string
  howToPlaySections: { title: string; body: string }[]
  howToPlayTipsTitle: string
  howToPlayTips: string[]
  hintFirstBuy: string
  hintFirstAuction: string
  hintFirstDebt: string
  hintFirstTradeEdit: string
  hintFirstTradeReceive: string
  hintFirstBuild: string
  hintFirstJail: string
  leaveGameBtn: string
  leaveGameConfirmMsg: string
  endGameForAllBtn: string
  endGameConfirmMsg: string
  onlyHostCanEndGame: string
  buildModalTitle: string
  buildSectionTitle: string
  mortgageSectionMenuTitle: string
  redeemSectionMenuTitle: string
  mortgageBtnMenu: string
  redeemBtnMenu: string
  themeLabel: string
  themeSystem: string
  themeLight: string
  themeDark: string
  zoomModeLabel: string
  zoomModeOff: string
  zoomModeOwn: string
  zoomModeAll: string
  zoomOutBtn: string
  skipAnimBtn: string

  // ── ErrorBoundary ────────────────────────────────────────────────────────────
  errorTitle: string
  errorReload: string
  errorReloadBtn: string

  // ── ActionPanel — auction bid labels ─────────────────────────────────────────
  notYourTurn: string
  cannotAfford: (cash: number) => string
  bidIncrement: (delta: number) => string
  bidOffer: string
  bidInsufficientCash: (cash: number) => string
  freeBidPlaceholder: (min: number) => string
  auctionMortgageHint: string

  // ── SoundSettings — extra labels ─────────────────────────────────────────────
  pingLatencyLabel: string
  volumeLabel: string
  diceZoomLabel: string
  diceZoomDesc: string
  hapticFeedbackLabel: string
  hapticFeedbackDesc: string
  hapticFeedbackIosNote: string
  screenNotifTitle: string
  notifYourTurnLabel: string
  notifYourTurnDesc: string
  notifRentLabel: string
  notifRentDesc: string
  notifDebtLabel: string
  notifDebtDesc: string
  notifAuctionLabel: string
  notifAuctionDesc: string
  notifTradeLabel: string
  notifTradeDesc: string
  notifBuildingLabel: string
  notifBuildingDesc: string
  notifCardsLabel: string
  notifCardsDesc: string
  notifCelebrationLabel: string
  notifCelebrationDesc: string

  // ── OverflowMenu — keyboard shortcut hints ───────────────────────────────────
  kbdRollOrEnd: string
  kbdCloseModal: string
  kbdMute: string

  // ── SessionListScreen — tooltip labels ───────────────────────────────────────
  copyCodeTitle: string
  deleteGameTitle: string

  // ── LobbyWaitingScreen ───────────────────────────────────────────────────────
  colorTakenTitle: string

  // ── Connection — cold start hint ─────────────────────────────────────────────
  coldStartHint: string

  // ── Duplicate client (two tabs open for same player) ─────────────────────────
  duplicateClientTitle: string
  duplicateClientMsg: string
  duplicateClientReactivate: string

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
  connSlowMsg: string
  connUnstableMsg: string
  commandErrorMsg: string

  // ── AppLayout ────────────────────────────────────────────────────────────────
  mobileTabs: Record<string, string>
  resizeHandleTitle: string
  playersTabLabel: string

  // ── Chat ─────────────────────────────────────────────────────────────────────
  chatTitle: string
  chatInputPlaceholder: string
  chatSend: string
  chatEmpty: string
  chatReactionsLabel: string
  chatSpectatorHint: string
  reactionButtonLabel: string
  // Bot chat phrases, keyed by situation. Bots send a (key, variant) pair; the client renders
  // the matching pool entry in its own language. Pool lengths mirror BotChatter.java on the
  // backend; a mismatched variant index is clamped modulo the pool length (never crashes).
  botChat: Record<string, string[]>

  // ── Events (deriveEvents, non-React) ─────────────────────────────────────────
  cashTooltip: (cash: number) => string
  kbdSpace: string
  tradeMortgagedDivider: string
  ev: {
    drewCard: (name: string, text: string) => string
    gameOver: (winner: string) => string
    passedGo: (name: string) => string
    paidRent: (name: string, amount: number, owner: string) => string
    wentToJail: (name: string) => string
    releasedFromJail: (name: string) => string
    wentBankrupt: (name: string) => string
    playerLeft: (name: string) => string
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
    /** Money-flow reason labels keyed by the backend's Finnish category strings. */
    moneyReasons: Record<string, string>
  }
}

const fi: T = {
  // Header
  waitingForPlayers: 'Odottaa pelaajia…',
  loading: 'Ladataan…',
  spectatorBadge: '👁 Katsoja',
  soundMuted: 'Äänet pois päältä (paina M)',
  soundOn: 'Äänet päällä (paina M)',
  languageToggleLabel: 'Vaihda englanniksi',
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
  insufficientFunds: 'Rahat eivät riitä',
  bankSupplyExhausted: 'Pankissa ei ole enempää rakennuksia',
  buildingsPresent: 'Myy ensin talot ja hotellit tästä väriryhmästä',
  mortgageToggleFailed: 'Kiinnityksen muutos ei onnistunut',
  netWorthLabel: 'Nettovarallisuus',
  rentalIncomeLabel: 'Vuokratulot/kierros',
  yourTurnIn: (n) => `${n} pelaajan jälkeen`,
  doublesRoll: '🎲 Tuplaheitto! Heitä uudelleen',
  doublesWarning: ' — varoitus: 3. tupla = vankila',
  jailEscapeDoubles: '🔓 Tupla vapautti vankilasta — uutta heittovuoroa ei saa',
  inJail: (r) => r <= 1
    ? '⛓ Viimeinen vankila-heitto! Vapaudut automaattisesti (sakko €50, ellei tupla)'
    : `⛓ Vankilassa — ${r} kierrosta jäljellä`,
  stuckInJail: (r) => r <= 1
    ? '⛓ Tupla ei tullut — vapaudut ensi vuorolla automaattisesti'
    : `⛓ Tupla ei tullut — ${r} yritystä jäljellä`,
  useJailCard: (n, r) => r > 1 ? `🃏 Käytä vapautuskortti (${n}) — ${r}kr.` : `🃏 Käytä vapautuskortti (${n})`,
  payJailFine: (r) => r > 1 ? `💸 Maksa €50 — ${r}kr.` : '💸 Maksa €50 ja vapaudu',
  rollDice: '🎲 Heitä nopat',
  rollDiceKbd: '🎲 Heitä nopat  [välilyönti]',
  endTurn: '✅ Lopeta vuoro',
  endTurnKbd: '✅ Lopeta vuoro  [välilyönti]',
  rollAgainBtn: '🎲 Heitä uudelleen',
  rollAgainBtnKbd: '🎲 Heitä uudelleen  [välilyönti]',
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
  auctionWonWaiting: (name) => `⏳ Odotetaan vahvistusta — ${name} vahvistaa ostonsa…`,
  auctionForSaleLabel: '🔨 Huutokaupattavana',
  auctionLeadTag: 'johtaa',
  auctionActorTag: 'vuorossa',
  auctionPassedTag: 'luovutti',
  auctionYouWon: '🏆 Voitit huutokaupan!',
  auctionPlayerWon: (name) => `🏆 ${name} voitti huutokaupan`,
  auctionYouPay: (amount) => `maksat €${amount}`,
  bidLabelYourTurn: 'Tarjoa — sinun vuorosi',
  bidLabel: 'Tarjoa',
  auctionNoFundsInfo: (cash) => `💸 Kassassa vain €${cash} — et pysty tarjoamaan enempää`,
  placeBidBtn: 'Tarjoa',
  passAuctionBtn: '🚫 Luovuta',
  passAuctionBtnKbd: '🚫 Luovuta  [P]',
  waitingForOthers: '⏳ Odotetaan muita pelaajia…',
  waitingForDebt: (name: string) => `⏳ ${name} maksaa velkaa…`,

  debtTitle: (amount, creditor) => `⚠️ Velka €${amount} → ${creditor}`,
  debtCardTitle: 'Velka',
  debtCreditorRow: (name) => `Velkojan: ${name}`,
  debtDebtorRow: (name) => `Velallinen: ${name}`,
  debtReasonLabel: 'Syy',
  debtReasonRent: (p) => `Vuokra: ${p}`,
  debtReasonTax: 'Veromaksu',
  debtReasonCard: 'Korttimaksu',
  debtReasonRepairs: 'Korttimaksu (korjaukset)',
  debtReasonJail: 'Vankilamaksu',
  debtCashLabel: 'Kassassa',
  debtLiquidationLabel: 'Realisoitavissa',
  debtCash: (n) => `Käteinen: €${n}`,
  debtLiquidation: (n) => `Likvidointiarvo: ~€${n}`,
  payDebtBtn: '💸 Maksa velka',
  debtShortfallLabel: 'Puuttuu vielä',
  debtSuggestionLabel: '💡 Ehdotus: panttaa',
  debtMortgageGroupTitle: 'Panttaa kiinteistö',
  debtSellBuildingTitle: 'Myy rakennuksia',
  mortgagePropBtn: (name) => `🏦 Panttaa ${name}`,
  sellRoundBtn: (count, type) => `🏘 Myy kierros (${count} kiin.): ${type}`,
  hotelLabel: 'hotelli',
  houseLabel: 'talo',
  sellBuildingBtn: (type, name) => `🏠 Myy ${type}: ${name}`,
  declareBankruptcy: '☠ Julistaudu konkurssiin',
  bankruptcyConfirmText: 'Oletko varma? Kaikki omaisuutesi menee huutokauppaan.',
  bankruptcyConfirmTextPlayer: (name) => `Oletko varma? Kaikki omaisuutesi siirtyy ${name}:lle.`,
  bankruptcyConfirmBtn: '☠ Vahvista konkurssi',
  bankLabel: 'Pankki',
  playerCreditorLabel: 'pelaaja',

  tradeWaiting: '⏳ Odotetaan kaupan vastausta…',
  tradeCounterEditing: '⏳ Vastapuoli muokkaa vastatarjousta…',
  tradeApplying: '✅ Kauppa hyväksytty, käsitellään…',
  tradeSpectatorBetween: (a, b) => `🤝 ${a} ↔ ${b}`,
  cancelOfferBtn: '❌ Peruuta tarjous',
  tradeTitle: (partner) => `🤝 Kauppa: ${partner}`,
  youOfferLabel: 'Tarjoat',
  youRequestLabel: 'Pyydät',
  youGetLabel: 'SAAT',
  youGiveLabel: 'ANNAT',
  tradeFairLabel: '⚖️ Reilu kauppa',
  tradeFavorsYouLabel: '👍 Sinulle edullinen',
  tradeFavorsThemLabel: '👎 Sinulle epäedullinen',
  sendOfferBtn: '📤 Lähetä tarjous',
  cancelBtn: '❌ Peruuta',
  tradeMadeOffer: 'teki kauppatarjouksen',
  tradeOfferNoun: 'tarjous',
  tradeNothingLabel: 'ei mitään',
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
  sessionNotFoundTitle: 'Peliä ei löydy',
  sessionNotFoundMsg: 'Peli on jo päättynyt tai poistettu. Palataan aulaan...',
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
  backendWaking: 'Herätellään palvelinta…',
  backendWakingHint: 'Ilmainen palvelin nukkuu käyttämättömänä – herääminen kestää ~30 s.',
  backendWakingSeconds: (s: number) => `${s} s`,
  gameNotFoundErr: 'Peliä ei löydy. Tarkista koodi.',
  connectionErr: 'Yhteysongelma. Yritä uudelleen.',
  quickStartFailed: 'Pikapelin luonti epäonnistui.',
  appVersionLabel: 'Sovellus',
  backendVersionLabel: 'Palvelin',
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
  duplicateNameErr: 'Nimi on jo käytössä — valitse toinen nimi.',
  duplicateColorErr: 'Väri on jo käytössä — valitse toinen väri.',
  duplicateShapeErr: 'Symboli on jo käytössä — valitse toinen symboli.',
  lobbyFailedErr: (e) => `Odotushuoneen luonti epäonnistui: ${e}`,
  sessionFailedErr: (e) => `Sessio ei onnistunut: ${e}`,
  serverBusyErr: 'Palvelin on juuri nyt kuormittunut — yritä hetken kuluttua uudelleen.',
  serverFullErr: 'Palvelimella on jo maksimimäärä pelejä käynnissä — yritä myöhemmin uudelleen.',
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
  nameTakenErr: 'Tämä nimi on jo käytössä — valitse toinen.',
  readyBtn: 'Olen valmis',
  cancelReadyBtn: 'Peru valmius',
  readyCount: (ready, total) => `${ready}/${total} valmis`,
  waitingForReady: (ready, total) => `Odotetaan pelaajia — ${ready}/${total} valmiina`,
  gameStarting: 'Peli alkaa…',
  removeBotBtn: 'Poista botti',
  playingToggle: 'Pelaan itse',
  spectatingToggle: 'En pelaa itse',
  opponentsTitle: 'Vastustajat',
  computerPlayersLabel: (n) => `🤖 Tietokonepelaajia: ${n}`,
  startNowBtn: 'Aloita heti',
  lobbyWaitHint: 'Muut voivat liittyä PIN-koodilla.',
  watchBotsTitle: '👁 Seuraa bottipeliä',
  botCountLabel: (n) => `Botteja: ${n}`,
  startBotsBtn: 'Aloita bottipeli',
  spectatorMsg: 'Olet katsojana',
  endGameBtn: '🛑 Lopeta peli',
  retriggerBotBtn: '▶ Jatka botti',

  // GameOverOverlay
  gameOverScreenTitle: 'Peli päättyi!',
  wonLabel: (name) => `${name} voitti!`,
  gameEndedNoWinner: 'Peli keskeytettiin — ei voittajaa',
  netWorthChartTitle: 'Varallisuuden kehitys',
  richestMomentLabel: 'Rikkain hetki',
  shareResultsBtn: '📋 Jaa tulokset',
  copiedBtn: '✓ Kopioitu!',
  continueWatchingBtn: 'Jatka katselemaan',
  backToHomeBtn: 'Takaisin etusivulle',

  // PlayerList
  youBadge: 'sinä',
  bankruptBadge: 'konkurssi',
  turnTimerLabel: 'Vuoron kesto',
  turnAfkHint: 'AFK?',
  noPropertiesMsg: 'Ei kiinteistöjä',
  propAbbr: (n) => `${n} kiin.`,
  mortgagedStat: (n) => `${n} pantattu`,
  monopolyStatLabel: 'monopoli',
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
  monopolyCelebrationTitle: 'MONOPOLI!',
  monopolyCelebrationSub: (group) => `${group}-ryhmä haltuun`,
  celebBoughtTitle: 'OSTETTU!',
  celebAuctionWonTitle: 'HUUTOKAUPPA VOITETTU!',
  celebHotelTitle: 'HOTELLI RAKENNETTU!',
  celebBigRentTitle: 'VUOKRAA KILAHTI!',
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
  closeLabel: 'Sulje',
  monopolyBadge: 'MONOPOLI',
  houseCountLabel: (n) => `${n} talo${n !== 1 ? 'a' : ''}`,
  hotelOwnedLabel: 'Hotelli',

  // OverflowMenu
  moreActionsTitle: 'Lisätoiminnot',
  startTradeSection: '🤝 Tee kauppa',
  buildAndMortgageBtn: '🏠 Rakenna / Panttaa',
  copyInviteLink: '🔗 Kopioi kutsulink',
  linkCopied: '✓ Linkki kopioitu!',
  soundSettingsBtn: '⚙️ Asetukset',
  keyboardShortcutsBtn: '⌨ Pikanäppäimet',
  howToPlayBtn: 'Näin pelaat',
  howToPlayTitle: 'Näin pelaat',
  howToPlaySections: [
    { title: '🎯 Tavoite', body: 'Ole viimeinen pelaaja joka ei ole vararikossa. Osta katuja, rakenna taloja ja kerää vuokraa vastustajilta.' },
    { title: '🎲 Vuorosi', body: 'Heitä noppaa (välilyönti tai “Heitä nopat”). Pelinappisi liikkuu, ja ruudun tapahtuma toteutuu. Kaksoisluku antaa uuden heiton. Lopeta vuoro kun olet valmis.' },
    { title: '🏠 Osto & huutokauppa', body: 'Kun laskeudut omistamattomaan katuun, voit ostaa sen pankilta. Jos jätät ostamatta, katu menee huutokauppaan — kaikki pelaajat voivat tarjota siitä.' },
    { title: '🏗 Rakentaminen', body: 'Kun omistat kokonaisen väriryhmän, voit rakentaa taloja ja hotelleja “Kiinteistöt”-välilehdeltä. Rakennukset nostavat vuokraa rajusti. Rakenna tasaisesti koko ryhmään.' },
    { title: '🔒 Vankila', body: 'Vankilasta pääset heittämällä kaksoisluvun, maksamalla €50 tai vapautuskortilla. Kolmannella kierroksella maksu on pakollinen.' },
    { title: '🤝 Kauppa', body: 'Voit tarjota rahaa ja katuja muille pelaajille (“Aloita kauppa”). Paras tapa täydentää oma väriryhmä tai estää vastustajaa.' },
  ],
  howToPlayTipsTitle: '💡 Hyvä tietää',
  howToPlayTips: [
    '~€-luku on nettovarallisuutesi (käteinen + katujen ja rakennusten arvo).',
    'Mitalit 🥇🥈🥉 näyttävät varallisuussijasi.',
    'Pelinappisi tunnistat väristä ja muodosta — sama kaikkialla.',
    'Välilyönti heittää nopat tai lopettaa vuoron nopeasti.',
  ],
  hintFirstBuy: 'Voit ostaa tämän kadun pankilta tai jättää sen huutokauppaan muille pelaajille.',
  hintFirstAuction: 'Huutokauppa: tarjoa summa tai jää pois. Korkein tarjous voittaa kadun.',
  hintFirstDebt: 'Maksa velka panttaamalla tai myymällä kiinteistöjä — tai julista vararikko.',
  hintFirstTradeEdit: 'Rakenna kauppa: lisää rahaa ja katuja molemmille puolille, sitten lähetä tarjous.',
  hintFirstTradeReceive: 'Sait kauppatarjouksen: voit hyväksyä, hylätä tai tehdä vastatarjouksen.',
  hintFirstBuild: 'Rakenna taloja tasaisesti koko väriryhmään. Rakennukset nostavat vuokraa rajusti.',
  hintFirstJail: 'Vankilassa: pääset pois heittämällä kaksoisluvun, maksamalla €50 tai vapautuskortilla.',
  leaveGameBtn: '🚪 Poistu pelistä',
  leaveGameConfirmMsg: 'Poistutko pelistä? Menetät paikkasi tässä pelissä.',
  endGameForAllBtn: '🛑 Lopeta peli kaikille',
  endGameConfirmMsg: 'Lopeta peli? Tämä päättää pelin kaikille pelaajille eikä ole peruutettavissa.',
  onlyHostCanEndGame: 'Vain host voi sulkea pelin',
  buildModalTitle: 'Rakenna / Panttaa',
  buildSectionTitle: '🏠 Rakenna taloja',
  mortgageSectionMenuTitle: '🏦 Panttaa',
  redeemSectionMenuTitle: '💳 Lunasta pantit',
  mortgageBtnMenu: 'Panttaa',
  redeemBtnMenu: 'Lunasta',
  themeLabel: 'Teema',
  themeSystem: 'Järjestelmä',
  themeLight: 'Vaalea',
  themeDark: 'Tumma',
  zoomModeLabel: 'Automaattinen lähennys',
  zoomModeOff: 'Pois päältä',
  zoomModeOwn: 'Seuraa omaa nappulaa',
  zoomModeAll: 'Seuraa kaikkia',
  zoomOutBtn: 'Loitonna',
  skipAnimBtn: 'Ohita',

  // ErrorBoundary
  errorTitle: 'Jokin meni pieleen',
  errorReload: 'Lataa sivu uudelleen jatkaaksesi.',
  errorReloadBtn: 'Lataa uudelleen',

  // ActionPanel — auction bid labels
  notYourTurn: 'Ei sinun vuorosi',
  cannotAfford: (cash) => `Ei varaa — kassassa vain €${cash}`,
  bidIncrement: (delta) => `korotus +${delta}`,
  bidOffer: 'tarjous',
  bidInsufficientCash: (cash) => `kassassa €${cash}`,
  freeBidPlaceholder: (min) => `vapaa tarjous (min €${min})`,
  auctionMortgageHint: 'Vihje: panttaa kiinteistöjä rahojen keräämiseksi — käytä Kiinteistöt-välilehteä',

  // SoundSettings — extra labels
  pingLatencyLabel: 'Verkkolatenssi (RTT/2)',
  volumeLabel: 'Volyymi',
  diceZoomLabel: 'Noppa-zoomi',
  diceZoomDesc: 'Lauta zoomaa noppiin kun ne heitetään',
  hapticFeedbackLabel: 'Tärinäpalaute',
  hapticFeedbackDesc: 'Värinä napeista ja pelin tapahtumista',
  hapticFeedbackIosNote: 'iOS-selaimet eivät tue tärinää',
  screenNotifTitle: 'Ruutu-ilmoitukset',
  notifYourTurnLabel: 'Sinun vuorosi',
  notifYourTurnDesc: '⭐ Ilmoitus kun oma vuoro alkaa',
  notifRentLabel: 'Vuokrat',
  notifRentDesc: '💸 Maksetut ja saadut vuokrat',
  notifDebtLabel: 'Velat',
  notifDebtDesc: '⛓ Velka, lunastus, konkurssi',
  notifAuctionLabel: 'Huutokauppa',
  notifAuctionDesc: '🔨 Huutokauppailmoitukset',
  notifTradeLabel: 'Kauppa',
  notifTradeDesc: '🤝 Kaupankäynti-ilmoitukset',
  notifBuildingLabel: 'Rakentaminen',
  notifBuildingDesc: '🏠 Talot ja hotellit',
  notifCardsLabel: 'Kortit',
  notifCardsDesc: '🃏 Sattuma- ja yhteiskassakorteista',
  notifCelebrationLabel: 'Juhla',
  notifCelebrationDesc: '🎊 Voitto ja erikoistapahtumat',

  // OverflowMenu — keyboard shortcut hints
  kbdRollOrEnd: 'Heitä nopat / Lopeta vuoro',
  kbdCloseModal: 'Sulje modaali / kiinteistö',
  kbdMute: 'Mykistä / Ota äänet käyttöön',

  // SessionListScreen — tooltip labels
  copyCodeTitle: 'Kopioi koodi',
  deleteGameTitle: 'Poista peli',

  // LobbyWaitingScreen
  colorTakenTitle: 'Varattu',

  // Connection — cold start hint
  coldStartHint: 'Palvelin herää lepotilasta — odota noin minuutti…',

  // Duplicate client
  duplicateClientTitle: 'Peli auki toisessa ikkunassa',
  duplicateClientMsg: 'Tämä pelaaja on aktiivinen toisessa selainvälilehdessä. Sulje toinen välilehti tai napsauta alla aktivoidaksesi tämän.',
  duplicateClientReactivate: 'Aktivoi tämä välilehti',

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
  connSlowMsg: 'Hidas yhteys palvelimeen — pelissä voi olla viivettä',
  connUnstableMsg: 'Epävakaa yhteys — peli voi pätkiä',
  commandErrorMsg: 'Komento epäonnistui — tarkista yhteys',

  // AppLayout
  mobileTabs: {
    board: 'Lauta',
    players: 'Pelaajat',
    log: 'Loki',
    chat: 'Chat',
    actions: 'Toiminnot',
  },
  resizeHandleTitle: 'Vedä muuttaaksesi leveyttä',
  playersTabLabel: '👥 Pelaajat',

  chatTitle: 'Chat',
  chatInputPlaceholder: 'Kirjoita viesti…',
  chatSend: 'Lähetä',
  chatEmpty: 'Ei viestejä vielä. Sano jotain! 👋',
  chatReactionsLabel: 'Reaktiot',
  chatSpectatorHint: 'Vain pelaajat voivat lähettää viestejä.',
  reactionButtonLabel: 'Lähetä reaktio',
  botChat: {
    boughtProperty: [
      'Joo-o, tää on nyt mun. 😎', 'Hyvä läträys!', 'Täst tulee kultakaivos. 💰',
      'Yks tontti listalt pois. 🏠', 'Mun imperiumi kasvaa taas. 🏰', 'Ei jätetä hyvii paloi muille.',
      'Tää täydentää setin. 🎯', 'Halvalla sain, kiitti. 🤝',
      'Otin tän vaan et te ette saa. 😏', 'Rautatiet on varmaa fyrkkaa. 🚂',
      'Vieres tontti — nyt on pari kasas. 👫', 'Pakko ottaa, en voinu vastustaa.',
      'Sijainti ratkasee, aina. 📍', 'Nam, hyvä lisä salkkuun. 💼',
      'Mine mine mine! 😆', 'Täst tulee teille kallista. 😈',
      'Sori muut, tää oli liian hyvä. 🤷', 'Instabuy, ei mietitty kauaa. ⚡',
    ],
    builtHotel: [
      'Hotelli pystys! 🏨', 'Tervetuloa — ei oo halpaa lystii. 😏',
      'Nyt alkaa kilahtaa kassaan. 🤑', 'Täst tuli kallis kulma teille.',
      'Maksaa ittensä takas ihan just. 💰', 'Jos tänne osutte ni voi voi. 💸',
      'Superhotelli valmis. 🏨', 'Tää ruutu on nyt puhdasta myrkkyy. ☠️',
      'Tällasii sijotuksii mä diggaan. 📈', 'Älkää astuko tänne. Tai astukaa. 😈',
      'Viiden tähden ansa valmis. ⭐', 'Kassakone käyntiin. 🤑',
    ],
    rentGloat: [
      'Kiitti vuokrist! 💰', 'Kassa kasvaa taas. 😎', 'Nam, kivaa lisää.',
      'Vuokran periminen on kyl parasta. 🤑', 'Näillä ostan lisää läträimii.',
      'Sijotus tuottaa, mitäs mä sanoin. 📈', 'Passiivist tuloo, rakastan tätä.',
      'Kiitti vaan, maksa pois. 😌', 'Tää tili paisuu mukavasti.',
      'Vuokralaiset on mun bestii. 🏦', 'Cha-ching! 🤑',
      'Ez money. 😎', 'Kiitos ku pysähdyit. 😏', 'Mun lompsa kiittää. 💸',
      'Free real estate. 🏠', 'Rakastan tätä peliä juuri nyt. 🥰',
    ],
    rentPain: [
      'Auts, kallis pysähdys. 😩', 'No täähän sattu.', 'Voi ei, melkein koko kassa meni. 😱',
      'Kallist lystii tää. 💸', 'Nyt pitää alkaa myymään taloi...',
      'Tos meni budjetti. 😰', 'Väärä ruutu, väärä hetki, äh.',
      'No siin meni säästöt, kiitti. 🙃', 'Täst pitää toipuu äkkii.',
      'Kallis oppiläksy tää. 📚', 'Auts, sattu kukkaroon. 😖',
      'F. 💀', 'Rip mun kassa. ⚰️', 'No tää oli tässä, kiitti vaan. 😤',
      'Miks aina mä?? 😭', 'Ei nyt yhtään sopinut budjettiin. 🫠',
    ],
    jail: [
      'No niin, koppiin taas. 😅', 'Nähää parin kierroksen päästä.',
      'Ei taas... äh.', 'Vankila kutsuu. 🚔',
      'No tää meni hyvin. 🙃', 'Linnaan siitä. 😔', 'Vitsi et taas. 🤦',
    ],
    opponentBankrupt: [
      'Yks vähemmän. 😎', 'Peli on peli. 🤝', 'Hyvin pelattu silti!',
      'Sääli, mut bisnes on bisnestä.', 'F sulle. 💀', 'Nähää ens pelis! 👋',
      'Yks kilpailija pois laskuist. 😏', 'GG, hyvä yritys. 🫡', 'Kilpailu just kevens. 😏',
    ],
    selfBankrupt: [
      'Hyvää peliä kaikille! 💀', 'No tähän se tyssäs — onnee muille!',
      'Konkkaan mentiin. Hyvin pelattu, muut.', 'GG, mä oon out. 🫡',
      'No niin, mun peli päätty tähän. 😔',
    ],
    tradeDone: [
      'Hyvä diili! 🤝', 'Kaupat klaari.', 'Molemmat voittaa — tai ainaki mä. 😏',
      'Tää kauppa vahvistaa mun asemaa. 💼', 'Sain just sen tontin mitä tarvin. 🎯', 'Jees, tästä on hyötyy.',
      'Win-win, painotus mun win. 😎', 'Deal! 🤝', 'Kiva tehä bisnest kaa. 😌',
    ],
    rejectOffer: [
      'Ei kiitti — ei hyödytä mua.', 'En luovu täst tontist. 🚫',
      'Toi tarjous on ihan yksipuolinen. 🤨', 'Pidän omani, kiitti.',
      'Tost mä häviäisin. Ei käy.', 'Keksi parempi tarjous. 😏',
      'Nice try. 😂', 'Luuletsä et mä oon tyhmä? 😅', 'Ei todellakaan. 🙅',
    ],
    greeting: [
      'No niin, pistetään pystyyn! 🎲', 'Tsemppii kaikille — mä en tarvii. 😏',
      'Antaa palaa, jäbät!', 'Onnee vaan, kyl te sitä tarttette. 😎',
      'Mennääks? Mä oon valmis. 🔥', 'Letsgooo! Valmiina häviää? 😜',
      'Nyt näytetään kuka on kingi. 👑', 'Mä oon jo voittanu mieles. 😎',
    ],
    passedGo: [
      'Kierros täys, +200! 💰', 'Kiitti pankki. 💵', 'Taas 200 taskuun. 😎',
      'Palkkapäivä! 🤑', 'Startti maksaa, jees. 💵',
      'Rahaa tuli, jees jees. 🤑', 'Kiva ku pankki maksaa. 💵',
    ],
    releasedFromJail: [
      'Vapaana taas! 🔓', 'Takas peliin. 😎', 'Ei mua kauaa pidellä.',
      'Ulkona koppist, nyt jyrätään. 💪',
    ],
    mortgaged: [
      'Pakko kiinnittää, äh... 😬', 'Tarviin cashii nyt heti.', 'Ei muuta vaihtoehtoo.',
      'Kiinnitän tän, tarviin fyrkkaa ostoon.', 'Väliaikanen juttu, nostan pian takas.',
      'Sori tontti, joudut pantiks hetkeks. 😔', 'Hätäkassa auki, äh. 🏦',
    ],
    tradeDeclined: [
      'No ei sitten. 🤷', 'Harmi, ois ollu hyvä diili.', 'Ehkä ens kerral. 🤔',
      'Sun tappio, ei mun. 😏', 'No okei, pidä tonttis. 😌',
    ],
    builtHouse: [
      'Talo nostaa vuokraa, jees. 🏠', 'Rakennan täst vahvan.',
      'Pieni panostus, iso tuotto. 📈', 'Talo kerrallaan kohti hotellii.',
      'Naapurusto kehittyy. 🔨', 'Pikkuhiljaa vaan ylöspäin. 🏗️',
    ],
    redeemed: [
      'Nostin kiinnityksen — kassa kestää taas. 💪', 'Takas omaks ilman velkaa.',
      'Nyt tää tuottaa taas täydet. 💰', 'Velat pois, taas mennään. 😎', 'Kiinnitys purku, jees. ✅',
    ],
    banter: [
      'Katotaas mitä nopat antaa. 🎲', 'Tuuria peliin!', 'Kunhan en mee vankilaan... 🤞',
      'Fyrkkaa on, uskallan pelaa. 💰', 'Tää kierros on mun. 😎',
      'Mietin seuraavaa siirtoo... 🤔', 'Nyt kannattaa säästää cashii.', 'Kohta iskee monopoli. 😏',
      'Ei kiirettä, peli on pitkä.', 'Rento meininki, homma hanskas. 😎',
      'Katotaan mihin toi nappula päätyy.', 'Pörssi nousee, ostan lisää. 📈',
      'Chillii vaan, ei stressii. 😌', 'Nopat, älkää pettäkö. 🎲',
      'Hmm, minne täst... 🤔', 'Vähän jännittää, mut hyväl taval. 😄',
    ],
    banterLead: [
      'Mä johdan — ja aion pitää sen niin. 😎', 'Mun kassa on paksuin täs pöydäs. 💰',
      'Voitto haisee jo. 🏆', 'Ei kukaan saa mua kii.',
      'Mun imperiumi vaan kasvaa. 🏰', 'Te muut pelaatte kakkossijast. 😏',
      'Helppoo tää on. 😌', 'Vuokrat virtaa, kiitti kaikille.',
      'Mä pidän ohjat käsis.', 'Kohta koko lauta on mun. 🗺️',
      'Ez game, ez life. 😎', 'Kukaa ei uhkaa mua just nyt. 👑',
    ],
    banterTrail: [
      'En oo viel ulkona täst. 💪', 'Kyl mä tän viel käännän.',
      'Yks hyvä diili ni oon taas mukan.', 'Alakynnes ollaan, mut en luovuta.',
      'Täst noustaan viel. 📈', 'Vähän tuuria kaipaisin nyt... 🍀',
      'Ei tää tähän lopu.', 'Comeback tulee, uskokaa pois. 😤',
      'Pakko pelaa varovasti nyt.', 'Odottakaa vaan, käännän tuulen. 🌬️',
      'Aliarvioitte mut viel. 😏', 'Underdog-tarina alkakoon. 🐕',
    ],
    banterLow: [
      'Kassa hupenee ihan hurjaa vauhtii... 😰', 'Nyt on tiukkaa, pitää säästää.',
      'Kunhan en osu kenenkään hotelliin. 😬', 'Vähän rahaa, paljon riskii.',
      'Yks iso vuokra ni oon liemes.', 'Pitää kai kiinnittää tontteja pian.',
      'Sydän hakkaa joka heitol. 💓', 'Rukoilen pieniä vuokrii. 🙏',
      'Selviänks mä täst kierrokses?', 'Kohta on kassakriisi... 😅',
      'Lompsa itkee. 😭', 'Nyt ei oo varaa mokaa. 😨',
    ],
    drewCard: [
      'Katotaas mitä kortti sanoo... 🃏', 'Vähän sattumaa peliin!', 'Toivotaan hyvää korttii. 🤞',
      'Kortit ratkasee. 🎴', 'Plis oo hyvä kortti... 🙏', 'Mitäköhän tää tuo tullessaan. 👀',
    ],
    soldBuilding: [
      'Pakko myydä rakennuksii... 😔', 'Harmi, talot lähtee.',
      'Tarviin cashii, myyn taloi. 💸', 'Askel taakspäin, mut pakko.',
      'Sori talot, teitä tarvitaan rahana. 🏚️', 'Ei muuta keinoo saada fyrkkaa. 😞',
    ],
    jailTaunt: [
      'Hei, koppiin siitä! 😂', 'Nauttikaa sellist. 😏', 'Yks vähemmän liikkeel. 😎',
      'Hah, linnareissu! 😆', 'Moro, nähää kolmen kierroksen päästä. 👋', 'Sinne meni. 😏',
      'Sori et nauran. 😂', 'Terkkuja sellist! 👋',
    ],
    playerLeft: [
      'No sepä harmi, joku lähti.', 'Yks vähemmän pöydäs.', 'Peli jatkuu ilman sitä. 🤷',
      'Ai lähti? No lisää fyrkkaa mulle. 😎',
    ],
    spectateRent: [
      'Ohohoh, kallista! 😮', 'Katotaas tätä draamaa. 🍿', 'Auts, ei onneks mun rahat. 😅',
      'Popkornit esiin. 🍿', 'Tosta se toinen kärsi. 😬', 'Nam, tykkään ku muut maksaa. 😏',
    ],
  },

  // Events
  cashTooltip: (cash) => `käteinen €${cash}`,
  kbdSpace: 'Välilyönti',
  tradeMortgagedDivider: '🔒 Pantatut',
  ev: {
    drewCard: (name, text) => `${name} nosti: ${text}`,
    gameOver: (winner) => `Peli päättyi! Voittaja: ${winner}`,
    passedGo: (name) => `${name} ohitti GO — +€200!`,
    paidRent: (name, amount, owner) => `${name} maksoi vuokraa €${amount} → ${owner}`,
    wentToJail: (name) => `${name} meni vankilaan`,
    releasedFromJail: (name) => `${name} vapautui vankilasta`,
    wentBankrupt: (name) => `${name} meni konkurssiin`,
    playerLeft: (name) => `${name} poistui pelistä`,
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
    moneyReasons: {
      vuokra: 'vuokra', vero: 'vero', kortti: 'kortti', velka: 'velka',
      kauppa: 'kauppa', osto: 'osto', myynti: 'myynti', rakennus: 'rakennus',
      kiinnitys: 'kiinnitys', lunastus: 'lunastus', huutokauppa: 'huutokauppa',
      vankilamaksu: 'vankilamaksu',
    },
  },
}

const en: T = {
  // Header
  waitingForPlayers: 'Waiting for players…',
  loading: 'Loading…',
  spectatorBadge: '👁 Spectator',
  soundMuted: 'Sound off (press M)',
  soundOn: 'Sound on (press M)',
  languageToggleLabel: 'Switch to Finnish',
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
  insufficientFunds: 'Not enough money',
  bankSupplyExhausted: 'No more buildings in the bank',
  buildingsPresent: 'Sell the houses and hotels in this colour group first',
  mortgageToggleFailed: 'Could not change the mortgage',
  netWorthLabel: 'Net worth',
  rentalIncomeLabel: 'Rental income/round',
  yourTurnIn: (n) => `after ${n} player${n !== 1 ? 's' : ''}`,
  doublesRoll: '🎲 Doubles! Roll again',
  doublesWarning: ' — warning: 3rd double = jail',
  jailEscapeDoubles: '🔓 Doubles released from jail — no extra turn',
  inJail: (r) => r <= 1
    ? '⛓ Last jail turn! Auto-released after roll (€50 fine unless doubles)'
    : `⛓ In jail — ${r} round${r !== 1 ? 's' : ''} left`,
  stuckInJail: (r) => r <= 1
    ? '⛓ No doubles — auto-released next turn'
    : `⛓ No doubles — ${r} attempt${r !== 1 ? 's' : ''} left`,
  useJailCard: (n, r) => r > 1 ? `🃏 Use get-out-of-jail card (${n}) — ${r}r.` : `🃏 Use get-out-of-jail card (${n})`,
  payJailFine: (r) => r > 1 ? `💸 Pay €50 — ${r}r.` : '💸 Pay €50 and get out',
  rollDice: '🎲 Roll dice',
  rollDiceKbd: '🎲 Roll dice  [space]',
  endTurn: '✅ End turn',
  endTurnKbd: '✅ End turn  [space]',
  rollAgainBtn: '🎲 Roll again',
  rollAgainBtnKbd: '🎲 Roll again  [space]',
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
  auctionWonWaiting: (name) => `⏳ Waiting for confirmation — ${name} is confirming their purchase…`,
  auctionForSaleLabel: '🔨 Up for auction',
  auctionLeadTag: 'leading',
  auctionActorTag: 'to bid',
  auctionPassedTag: 'passed',
  auctionYouWon: '🏆 You won the auction!',
  auctionPlayerWon: (name) => `🏆 ${name} won the auction`,
  auctionYouPay: (amount) => `you pay €${amount}`,
  bidLabelYourTurn: 'Bid — your turn',
  bidLabel: 'Bid',
  auctionNoFundsInfo: (cash) => `💸 Only €${cash} in cash — you cannot bid higher`,
  placeBidBtn: 'Bid',
  passAuctionBtn: '🚫 Pass',
  passAuctionBtnKbd: '🚫 Pass  [P]',
  waitingForOthers: '⏳ Waiting for others…',
  waitingForDebt: (name: string) => `⏳ ${name} is settling a debt…`,

  debtTitle: (amount, creditor) => `⚠️ Debt €${amount} → ${creditor}`,
  debtCardTitle: 'Debt',
  debtCreditorRow: (name) => `Creditor: ${name}`,
  debtDebtorRow: (name) => `Debtor: ${name}`,
  debtReasonLabel: 'Reason',
  debtReasonRent: (p) => `Rent: ${p}`,
  debtReasonTax: 'Tax',
  debtReasonCard: 'Card payment',
  debtReasonRepairs: 'Card payment (repairs)',
  debtReasonJail: 'Jail fine',
  debtCashLabel: 'Cash',
  debtLiquidationLabel: 'Liquidatable',
  debtCash: (n) => `Cash: €${n}`,
  debtLiquidation: (n) => `Liquidation value: ~€${n}`,
  payDebtBtn: '💸 Pay debt',
  debtShortfallLabel: 'Still short',
  debtSuggestionLabel: '💡 Suggestion: mortgage',
  debtMortgageGroupTitle: 'Mortgage property',
  debtSellBuildingTitle: 'Sell buildings',
  mortgagePropBtn: (name) => `🏦 Mortgage ${name}`,
  sellRoundBtn: (count, type) => `🏘 Sell round (${count} prop.): ${type}`,
  hotelLabel: 'hotel',
  houseLabel: 'house',
  sellBuildingBtn: (type, name) => `🏠 Sell ${type}: ${name}`,
  declareBankruptcy: '☠ Declare bankruptcy',
  bankruptcyConfirmText: 'Are you sure? All your assets will go to auction.',
  bankruptcyConfirmTextPlayer: (creditorName) => `Are you sure? All your assets will be transferred to ${creditorName}.`,
  bankruptcyConfirmBtn: '☠ Confirm bankruptcy',
  bankLabel: 'Bank',
  playerCreditorLabel: 'player',

  tradeWaiting: '⏳ Waiting for trade response…',
  tradeCounterEditing: '⏳ Other player is editing their counter-offer…',
  tradeApplying: '✅ Trade accepted, applying…',
  tradeSpectatorBetween: (a, b) => `🤝 ${a} ↔ ${b}`,
  cancelOfferBtn: '❌ Cancel offer',
  tradeTitle: (partner) => `🤝 Trade: ${partner}`,
  youOfferLabel: 'You offer',
  youRequestLabel: 'You request',
  youGetLabel: 'YOU GET',
  youGiveLabel: 'YOU GIVE',
  tradeFairLabel: '⚖️ Fair trade',
  tradeFavorsYouLabel: '👍 In your favour',
  tradeFavorsThemLabel: '👎 Against you',
  sendOfferBtn: '📤 Send offer',
  cancelBtn: '❌ Cancel',
  tradeMadeOffer: 'made a trade offer',
  tradeOfferNoun: 'offer',
  tradeNothingLabel: 'nothing',
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
  sessionNotFoundTitle: 'Game not found',
  sessionNotFoundMsg: 'The game has ended or been deleted. Returning to lobby...',
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
  backendWaking: 'Waking up the server…',
  backendWakingHint: 'Free server sleeps when idle – waking takes ~30 s.',
  backendWakingSeconds: (s: number) => `${s} s`,
  gameNotFoundErr: 'Game not found. Check the code.',
  connectionErr: 'Connection error. Try again.',
  quickStartFailed: 'Failed to create quick game.',
  appVersionLabel: 'App',
  backendVersionLabel: 'Backend',
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
  duplicateNameErr: 'Name already taken — choose a different name.',
  duplicateColorErr: 'Color already taken — choose a different color.',
  duplicateShapeErr: 'Symbol already taken — choose a different symbol.',
  lobbyFailedErr: (e) => `Failed to create waiting room: ${e}`,
  sessionFailedErr: (e) => `Session failed: ${e}`,
  serverBusyErr: 'The server is under heavy load right now — please try again in a moment.',
  serverFullErr: 'The server has reached the maximum number of concurrent games — please try again later.',
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
  nameTakenErr: 'This name is already in use — please choose another.',
  readyBtn: 'Ready',
  cancelReadyBtn: 'Cancel ready',
  readyCount: (ready, total) => `${ready}/${total} ready`,
  waitingForReady: (ready, total) => `Waiting for players — ${ready}/${total} ready`,
  gameStarting: 'Game starting…',
  removeBotBtn: 'Remove bot',
  playingToggle: 'I\'m playing',
  spectatingToggle: 'Not playing',
  opponentsTitle: 'Opponents',
  computerPlayersLabel: (n) => `🤖 Computer players: ${n}`,
  startNowBtn: 'Start now',
  lobbyWaitHint: 'Others can join with a PIN.',
  watchBotsTitle: '👁 Watch bot game',
  botCountLabel: (n) => `Bots: ${n}`,
  startBotsBtn: 'Start bot game',
  spectatorMsg: 'You are a spectator',
  endGameBtn: '🛑 End game',
  retriggerBotBtn: '▶ Unstick bot',

  // GameOverOverlay
  netWorthChartTitle: 'Net worth over time',
  richestMomentLabel: 'Richest moment',
  gameOverScreenTitle: 'Game over!',
  wonLabel: (name) => `${name} wins!`,
  gameEndedNoWinner: 'Game ended early — no winner',
  shareResultsBtn: '📋 Share results',
  copiedBtn: '✓ Copied!',
  continueWatchingBtn: 'Continue watching',
  backToHomeBtn: 'Back to home',

  // PlayerList
  youBadge: 'you',
  bankruptBadge: 'bankrupt',
  turnTimerLabel: 'Turn time',
  turnAfkHint: 'AFK?',
  noPropertiesMsg: 'No properties',
  propAbbr: (n) => `${n} prop.`,
  mortgagedStat: (n) => `${n} mortgaged`,
  monopolyStatLabel: 'monopoly',
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
  monopolyCelebrationTitle: 'MONOPOLY!',
  monopolyCelebrationSub: (group) => `${group} set complete`,
  celebBoughtTitle: 'PURCHASED!',
  celebAuctionWonTitle: 'AUCTION WON!',
  celebHotelTitle: 'HOTEL BUILT!',
  celebBigRentTitle: 'RENT COLLECTED!',
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
  closeLabel: 'Close',
  monopolyBadge: 'MONOPOLY',
  houseCountLabel: (n) => `${n} house${n !== 1 ? 's' : ''}`,
  hotelOwnedLabel: 'Hotel',

  // OverflowMenu
  moreActionsTitle: 'More actions',
  startTradeSection: '🤝 Trade',
  buildAndMortgageBtn: '🏠 Build / Mortgage',
  copyInviteLink: '🔗 Copy invite link',
  linkCopied: '✓ Link copied!',
  soundSettingsBtn: '⚙️ Settings',
  keyboardShortcutsBtn: '⌨ Keyboard shortcuts',
  howToPlayBtn: 'How to play',
  howToPlayTitle: 'How to play',
  howToPlaySections: [
    { title: '🎯 Goal', body: 'Be the last player standing (not bankrupt). Buy streets, build houses and collect rent from your opponents.' },
    { title: '🎲 Your turn', body: 'Roll the dice (spacebar or “Roll dice”). Your token moves and the space’s effect happens. Doubles give you another roll. End your turn when you’re done.' },
    { title: '🏠 Buy & auction', body: 'When you land on an unowned street you may buy it from the bank. If you decline, it goes to auction — every player can bid for it.' },
    { title: '🏗 Building', body: 'Once you own a whole colour group you can build houses and hotels from the “Properties” tab. Buildings raise rent steeply. Build evenly across the group.' },
    { title: '🔒 Jail', body: 'Get out of jail by rolling doubles, paying €50, or with a get-out card. On the third round the fee is mandatory.' },
    { title: '🤝 Trading', body: 'Offer money and streets to other players (“Start trade”). The best way to complete your own colour group or block an opponent.' },
  ],
  howToPlayTipsTitle: '💡 Good to know',
  howToPlayTips: [
    'The ~€ figure is your net worth (cash + value of streets and buildings).',
    'Medals 🥇🥈🥉 show your wealth ranking.',
    'You recognise your token by its colour and shape — the same everywhere.',
    'Spacebar rolls the dice or ends your turn quickly.',
  ],
  hintFirstBuy: 'You can buy this street from the bank, or leave it to auction for the other players.',
  hintFirstAuction: 'Auction: place a bid or pass. The highest bid wins the street.',
  hintFirstDebt: 'Settle the debt by mortgaging or selling properties — or declare bankruptcy.',
  hintFirstTradeEdit: 'Build a trade: add money and streets to each side, then send the offer.',
  hintFirstTradeReceive: 'You received a trade offer: you can accept, decline or make a counter-offer.',
  hintFirstBuild: 'Build houses evenly across a whole colour group. Buildings raise rent steeply.',
  hintFirstJail: 'In jail: get out by rolling doubles, paying €50, or using a get-out-of-jail card.',
  leaveGameBtn: '🚪 Leave game',
  leaveGameConfirmMsg: 'Leave the game? You will lose your place in this game.',
  endGameForAllBtn: '🛑 End game for all',
  endGameConfirmMsg: 'End game? This ends the game for all players and cannot be undone.',
  onlyHostCanEndGame: 'Only the host can end the game',
  buildModalTitle: 'Build / Mortgage',
  buildSectionTitle: '🏠 Build houses',
  mortgageSectionMenuTitle: '🏦 Mortgage',
  redeemSectionMenuTitle: '💳 Redeem mortgages',
  mortgageBtnMenu: 'Mortgage',
  redeemBtnMenu: 'Redeem',
  themeLabel: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  zoomModeLabel: 'Auto-zoom',
  zoomModeOff: 'Off',
  zoomModeOwn: 'Follow own token',
  zoomModeAll: 'Follow all players',
  zoomOutBtn: 'Zoom out',
  skipAnimBtn: 'Skip',

  // ErrorBoundary
  errorTitle: 'Something went wrong',
  errorReload: 'Reload the page to continue.',
  errorReloadBtn: 'Reload',

  // ActionPanel — auction bid labels
  notYourTurn: 'Not your turn',
  cannotAfford: (cash) => `Can't afford — only €${cash} in hand`,
  bidIncrement: (delta) => `raise +${delta}`,
  bidOffer: 'offer',
  bidInsufficientCash: (cash) => `cash €${cash}`,
  freeBidPlaceholder: (min) => `free bid (min €${min})`,
  auctionMortgageHint: 'Tip: mortgage properties to raise funds — use the Properties tab',

  // SoundSettings — extra labels
  pingLatencyLabel: 'Network latency (RTT/2)',
  volumeLabel: 'Volume',
  diceZoomLabel: 'Dice zoom',
  diceZoomDesc: 'Board zooms in on dice when rolled',
  hapticFeedbackLabel: 'Haptic feedback',
  hapticFeedbackDesc: 'Vibration on buttons and game events',
  hapticFeedbackIosNote: 'iOS browsers do not support vibration',
  screenNotifTitle: 'Screen notifications',
  notifYourTurnLabel: 'Your turn',
  notifYourTurnDesc: '⭐ Alert when your turn starts',
  notifRentLabel: 'Rent',
  notifRentDesc: '💸 Rent paid and received',
  notifDebtLabel: 'Debt',
  notifDebtDesc: '⛓ Debt, redemption, bankruptcy',
  notifAuctionLabel: 'Auction',
  notifAuctionDesc: '🔨 Auction notifications',
  notifTradeLabel: 'Trade',
  notifTradeDesc: '🤝 Trade notifications',
  notifBuildingLabel: 'Building',
  notifBuildingDesc: '🏠 Houses and hotels',
  notifCardsLabel: 'Cards',
  notifCardsDesc: '🃏 Chance and Community Chest',
  notifCelebrationLabel: 'Celebration',
  notifCelebrationDesc: '🎊 Win and special events',

  // OverflowMenu — keyboard shortcut hints
  kbdRollOrEnd: 'Roll dice / End turn',
  kbdCloseModal: 'Close modal / property',
  kbdMute: 'Mute / Unmute',

  // SessionListScreen — tooltip labels
  copyCodeTitle: 'Copy code',
  deleteGameTitle: 'Delete game',

  // LobbyWaitingScreen
  colorTakenTitle: 'Taken',

  // Connection — cold start hint
  coldStartHint: 'Server waking from sleep — please wait about a minute…',

  // Duplicate client
  duplicateClientTitle: 'Game open in another window',
  duplicateClientMsg: 'This player is active in another browser tab. Close the other tab or click below to activate this one.',
  duplicateClientReactivate: 'Activate this tab',

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
  connSlowMsg: 'Slow connection to the server — there may be lag',
  connUnstableMsg: 'Unstable connection — the game may stutter',
  commandErrorMsg: 'Command failed — check connection',

  // AppLayout
  mobileTabs: {
    board: 'Board',
    players: 'Players',
    log: 'Log',
    chat: 'Chat',
    actions: 'Actions',
  },
  resizeHandleTitle: 'Drag to resize',
  playersTabLabel: '👥 Players',

  chatTitle: 'Chat',
  chatInputPlaceholder: 'Type a message…',
  chatSend: 'Send',
  chatEmpty: 'No messages yet. Say something! 👋',
  chatReactionsLabel: 'Reactions',
  chatSpectatorHint: 'Only players can send messages.',
  reactionButtonLabel: 'Send a reaction',
  botChat: {
    boughtProperty: [
      'Yep, this one\'s mine. 😎', 'Nice grab!', 'This\'ll be a goldmine. 💰',
      'One off the list. 🏠', 'My empire\'s growing again. 🏰', 'Not leaving the good ones for you.',
      'That completes the set. 🎯', 'Got it cheap, thanks. 🤝',
      'Took it just so you can\'t. 😏', 'Railroads are easy money. 🚂',
      'Neighbouring lot — that\'s a pair now. 👫', 'Had to, couldn\'t resist.',
      'Location is everything. 📍', 'Nice one for the portfolio. 💼',
      'Mine mine mine! 😆', 'This\'ll cost you lot. 😈',
      'Sorry folks, too good to pass. 🤷', 'Instabuy, no thinking needed. ⚡',
    ],
    builtHotel: [
      'Hotel\'s up! 🏨', 'Welcome — this ain\'t cheap. 😏',
      'Now the cash starts rolling. 🤑', 'This corner just got pricey for ya.',
      'Pays for itself real soon. 💰', 'Land here and oof. 💸',
      'Mega hotel, done. 🏨', 'This square\'s pure poison now. ☠️',
      'This is the kind of play I love. 📈', 'Don\'t step here. Or do. 😈',
      'Five-star trap ready. ⭐', 'Cash machine\'s on. 🤑',
    ],
    rentGloat: [
      'Thanks for the rent! 💰', 'Cash stack\'s growing. 😎', 'Mmm, nice bonus.',
      'Collecting rent is the best. 🤑', 'Gonna buy more with this.',
      'Told ya the investment pays. 📈', 'Passive income, love it.',
      'Thanks, just pay up. 😌', 'This account\'s fattening up nice.',
      'Tenants are my besties. 🏦', 'Cha-ching! 🤑',
      'Ez money. 😎', 'Thanks for stopping by. 😏', 'My wallet thanks you. 💸',
      'Free real estate. 🏠', 'Loving this game right now. 🥰',
    ],
    rentPain: [
      'Ouch, pricey stop. 😩', 'Well, that stung.', 'Oh no, nearly cleaned me out. 😱',
      'Expensive lil detour. 💸', 'Gotta start selling houses...',
      'There goes the budget. 😰', 'Wrong square, wrong time, ugh.',
      'There go my savings, thanks. 🙃', 'Gotta bounce back fast.',
      'Expensive lesson, that. 📚', 'Ouch, right in the wallet. 😖',
      'F. 💀', 'RIP my cash. ⚰️', 'Well, that\'s me done, thanks. 😤',
      'Why always me?? 😭', 'That did not fit the budget. 🫠',
    ],
    jail: [
      'Welp, back in the cell. 😅', 'See ya in a couple rounds.',
      'Not again... ugh.', 'Jail\'s calling. 🚔',
      'Well, that went great. 🙃', 'Off to the slammer. 😔', 'Ugh, not again. 🤦',
    ],
    opponentBankrupt: [
      'One down. 😎', 'It\'s just a game. 🤝', 'Well played though!',
      'Shame, but that\'s business.', 'F to you. 💀', 'See ya next game! 👋',
      'One rival off the board. 😏', 'GG, nice try. 🫡', 'Competition just got lighter. 😏',
    ],
    selfBankrupt: [
      'GG everyone! 💀', 'That\'s where it ends — good luck!',
      'Went bust. Well played, folks.', 'GG, I\'m out. 🫡',
      'Well, my game ends here. 😔',
    ],
    tradeDone: [
      'Nice deal! 🤝', 'Deal\'s done.', 'We both win — well, mostly me. 😏',
      'This deal boosts my position. 💼', 'Got exactly the lot I needed. 🎯', 'Yep, this helps.',
      'Win-win, emphasis on my win. 😎', 'Deal! 🤝', 'Pleasure doing business. 😌',
    ],
    rejectOffer: [
      'Nah — doesn\'t help me.', 'Not giving up this lot. 🚫',
      'That offer\'s way one-sided. 🤨', 'I\'ll keep mine, thanks.',
      'I\'d lose on that. Nope.', 'Come back with a better offer. 😏',
      'Nice try. 😂', 'You think I\'m dumb? 😅', 'Absolutely not. 🙅',
    ],
    greeting: [
      'Alright, let\'s do this! 🎲', 'Good luck all — I won\'t need it. 😏',
      'Let\'s go, folks!', 'Good luck, you\'ll need it. 😎',
      'Ready? \'Cause I am. 🔥', 'Let\'s gooo! Ready to lose? 😜',
      'Let\'s see who\'s king. 👑', 'Already won it in my head. 😎',
    ],
    passedGo: [
      'Lap done, +200! 💰', 'Thanks bank. 💵', 'Another 200 in the pocket. 😎',
      'Payday! 🤑', 'GO pays out, nice. 💵',
      'Money in, yeah yeah. 🤑', 'Love it when the bank pays. 💵',
    ],
    releasedFromJail: [
      'Free again! 🔓', 'Back in the game. 😎', 'Can\'t hold me long.',
      'Out of the cell, let\'s roll. 💪',
    ],
    mortgaged: [
      'Gotta mortgage, ugh... 😬', 'Need cash right now.', 'No other option.',
      'Mortgaging this, need money for a buy.', 'Just temporary, redeeming it soon.',
      'Sorry lot, you\'re collateral for a bit. 😔', 'Emergency fund unlocked, ugh. 🏦',
    ],
    tradeDeclined: [
      'Guess not. 🤷', 'Shame, coulda been a good deal.', 'Maybe next time. 🤔',
      'Your loss, not mine. 😏', 'Alright, keep your lot. 😌',
    ],
    builtHouse: [
      'A house bumps the rent, nice. 🏠', 'Building this one up strong.',
      'Small spend, big return. 📈', 'One house at a time toward a hotel.',
      'The neighbourhood\'s developing. 🔨', 'Slowly but surely, up we go. 🏗️',
    ],
    redeemed: [
      'Mortgage lifted — cash holds up again. 💪', 'Back to mine, debt-free.',
      'Full rent again now. 💰', 'Debt cleared, back at it. 😎', 'Un-mortgaged, nice. ✅',
    ],
    banter: [
      'Let\'s see what the dice do. 🎲', 'Gimme some luck!', 'Just don\'t land in jail... 🤞',
      'Got cash, I can play bold. 💰', 'This round\'s mine. 😎',
      'Thinking about my next move... 🤔', 'Better save some cash now.', 'A monopoly\'s coming soon. 😏',
      'No rush, it\'s a long game.', 'Chill vibes, I got this. 😎',
      'Let\'s see where that token lands.', 'Market\'s up, buying more. 📈',
      'Just chilling, no stress. 😌', 'Dice, don\'t fail me now. 🎲',
      'Hmm, where to from here... 🤔', 'A little nervous, in a good way. 😄',
    ],
    banterLead: [
      'I\'m leading — and keeping it that way. 😎', 'Fattest wallet at the table. 💰',
      'I can smell the win. 🏆', 'Nobody\'s catching me.',
      'My empire just keeps growing. 🏰', 'Y\'all playing for second. 😏',
      'This is easy. 😌', 'Rent\'s flowing, thanks everyone.',
      'I\'m holding the reins.', 'Soon the whole board\'s mine. 🗺️',
      'Ez game, ez life. 😎', 'Nothing threatens me right now. 👑',
    ],
    banterTrail: [
      'I\'m not out of this yet. 💪', 'I\'ll turn this around.',
      'One good deal and I\'m back.', 'Behind, but not giving up.',
      'I\'ll climb back up. 📈', 'Could use some luck rn... 🍀',
      'This ain\'t over.', 'Comeback incoming, trust. 😤',
      'Gotta play it safe now.', 'Just wait, I\'ll flip it. 🌬️',
      'You\'re underestimating me. 😏', 'Underdog arc begins. 🐕',
    ],
    banterLow: [
      'My cash is vanishing fast... 😰', 'It\'s tight now, gotta save.',
      'Please don\'t let me hit a hotel. 😬', 'Low money, high risk.',
      'One big rent and I\'m done for.', 'Might have to mortgage soon.',
      'Heart\'s pounding every roll. 💓', 'Praying for small rents. 🙏',
      'Will I even survive this lap?', 'Cash crisis incoming... 😅',
      'My wallet\'s crying. 😭', 'Can\'t afford a mistake now. 😨',
    ],
    drewCard: [
      'Let\'s see what the card says... 🃏', 'Bit of chance!', 'Hoping for a good one. 🤞',
      'The cards decide. 🎴', 'Please be a good card... 🙏', 'Wonder what this brings. 👀',
    ],
    soldBuilding: [
      'Gotta sell some buildings... 😔', 'Shame, the houses go.',
      'Need cash, selling houses. 💸', 'A step back, but no choice.',
      'Sorry houses, you\'re cash now. 🏚️', 'No other way to get money. 😞',
    ],
    jailTaunt: [
      'Haha, off to jail! 😂', 'Enjoy the cell. 😏', 'One less on the move. 😎',
      'Ha, jail trip! 😆', 'Later, see ya in three rounds. 👋', 'Down you go. 😏',
      'Sorry for laughing. 😂', 'Regards from outside the cell! 👋',
    ],
    playerLeft: [
      'Aw, someone bailed.', 'One fewer at the table.', 'Game goes on without \'em. 🤷',
      'They left? More cash for me. 😎',
    ],
    spectateRent: [
      'Ooh, that\'s pricey! 😮', 'Let\'s watch this drama. 🍿', 'Ouch, glad it\'s not my cash. 😅',
      'Popcorn time. 🍿', 'That one really hurt \'em. 😬', 'Mmm, love it when others pay. 😏',
    ],
  },

  // Events
  cashTooltip: (cash) => `cash €${cash}`,
  kbdSpace: 'Space',
  tradeMortgagedDivider: '🔒 Mortgaged',
  ev: {
    drewCard: (name, text) => `${name} drew: ${text}`,
    gameOver: (winner) => `Game over! Winner: ${winner}`,
    passedGo: (name) => `${name} passed GO — +€200!`,
    paidRent: (name, amount, owner) => `${name} paid rent €${amount} → ${owner}`,
    wentToJail: (name) => `${name} went to jail`,
    releasedFromJail: (name) => `${name} was released from jail`,
    wentBankrupt: (name) => `${name} went bankrupt`,
    playerLeft: (name) => `${name} left the game`,
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
    moneyReasons: {
      vuokra: 'rent', vero: 'tax', kortti: 'card', velka: 'debt',
      kauppa: 'trade', osto: 'purchase', myynti: 'sale', rakennus: 'building',
      kiinnitys: 'mortgage', lunastus: 'redeemed', huutokauppa: 'auction',
      vankilamaksu: 'jail fee',
    },
  },
}

export const translations: Record<Lang, T> = { fi, en }
