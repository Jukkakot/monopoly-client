export type SeatKind = 'HUMAN' | 'BOT'
export type BotDifficulty = 'EASY' | 'NORMAL'
export type SessionStatus = 'LOBBY' | 'IN_PROGRESS' | 'GAME_OVER'
export type TurnPhase =
  | 'WAITING_FOR_ROLL'
  | 'WAITING_FOR_END_TURN'
  | 'WAITING_FOR_DECISION'
  | 'WAITING_FOR_AUCTION'
  | 'RESOLVING_DEBT'
  | 'GAME_OVER'
export type DebtAction = 'PAY_DEBT_NOW' | 'MORTGAGE_PROPERTY' | 'SELL_BUILDING' | 'DECLARE_BANKRUPTCY'
export type TradeStatus = 'EDITING' | 'SUBMITTED' | 'COUNTERED' | 'ACCEPTED_PENDING_APPLY' | 'DECLINED' | 'CANCELLED'
export type AuctionStatus = 'ACTIVE' | 'WON_PENDING_RESOLUTION'
export type DebtCreditorType = 'BANK' | 'PLAYER'

export interface SeatState {
  seatId: string
  seatIndex: number
  playerId: string
  seatKind: SeatKind
  displayName: string | null
  tokenColorHex: string
  joined: boolean
}

export interface PlayerSnapshot {
  playerId: string
  seatId: string
  name: string
  cash: number
  boardIndex: number
  bankrupt: boolean
  eliminated: boolean
  inJail: boolean
  jailRoundsRemaining: number
  getOutOfJailCards: number
  ownedPropertyIds: string[]
}

export interface PropertyStateSnapshot {
  propertyId: string
  ownerPlayerId: string | null
  mortgaged: boolean
  houseCount: number
  hotelCount: number
}

export interface TurnState {
  activePlayerId: string
  phase: TurnPhase
  canRoll: boolean
  canEndTurn: boolean
  consecutiveDoubles: number
}

export interface PendingDecision {
  decisionId: string
  decisionType: string
  actorPlayerId: string
  payload: {
    propertyId: string
    propertyDisplayName: string
    price: number
  }
}

export interface AuctionState {
  auctionId: string
  propertyId: string
  currentActorPlayerId: string
  leadingPlayerId: string | null
  currentBid: number
  minimumNextBid: number
  passedPlayerIds: string[]
  eligiblePlayerIds: string[]
  status: AuctionStatus
  winningBid?: number
  winningPlayerId?: string
}

export interface ActiveDebt {
  debtId: string
  debtorPlayerId: string
  creditorType: DebtCreditorType
  creditorPlayerId: string | null
  amountRemaining: number
  reason: string
  bankruptcyRisk: boolean
  currentCash: number
  estimatedLiquidationValue: number
  allowedActions: DebtAction[]
}

export interface TradeSelectionState {
  moneyAmount: number
  propertyIds: string[]
}

export interface TradeOfferState {
  offeredToRecipient: TradeSelectionState
  requestedFromRecipient: TradeSelectionState
}

export interface TradeState {
  tradeId: string
  initiatorPlayerId: string
  recipientPlayerId: string
  status: TradeStatus
  currentOffer: TradeOfferState
  editingPlayerId: string | null
  decisionRequiredFromPlayerId: string | null
}

export interface SessionState {
  sessionId: string
  version: number
  status: SessionStatus
  seats: SeatState[]
  players: PlayerSnapshot[]
  properties: PropertyStateSnapshot[]
  turn: TurnState | null
  pendingDecision: PendingDecision | null
  auctionState: AuctionState | null
  activeDebt: ActiveDebt | null
  tradeState: TradeState | null
  winnerPlayerId: string | null
  lastCardMessage: string | null
}

export interface ClientSessionSnapshot {
  sessionId: string
  version: number
  status: SessionStatus
  state: SessionState | null
}

export interface SessionSummary {
  sessionId: string
  status: SessionStatus
  playerCount: number
  createdAt: string
}

export interface CreateSessionRequest {
  names: string[]
  colors: string[]
  seatKinds: SeatKind[]
  difficulties: BotDifficulty[]
}

export interface CommandResult {
  accepted: boolean
  rejections: string[]
}
