export interface PokerLocation {
  id: number;
  name: string;
}

export interface PokerPlayer {
  id: number;
  name: string;
}

export interface PokerMatch {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  enteredAt: Date;
  locationId: number;
  buyIn: number;
  playersCount: number;
  chipsCount: number;
}

export interface PokerPlayerMatch {
  playerId: number;
  matchId: string;
  finalChipsCount: number;
  moneyEarned: number;
  profit: number;
}

export interface PokerDeal {
  id: string;
  num: number;
  minBet: number;
  dealerId: number;
  matchId: string;
  winnerId: number;
  splitWinnerId: number | null;
  winningHand: string;
  winningHandRank: number;
}

export enum PokerHandRank {
  HighCard = 1,
  Pair = 2,
  TwoPairs = 3,
  ThreeOfAKind = 4,
  Straight = 5,
  Flush = 6,
  FullHouse = 7,
  FourOfAKind = 8,
  StraightFlush = 9,
  RoyalFlush = 10,
}
