import { executeDbQuery } from './db';
import {
  PokerDeal,
  PokerLocation,
  PokerMatch,
  PokerPlayer,
  PokerPlayerMatch,
} from './entities';

function mapRowToPlayer(row: any): PokerPlayer {
  return {
    id: row.id,
    name: row.name,
  };
}

function mapRowToLocation(row: any): PokerLocation {
  return {
    id: row.id,
    name: row.name,
  };
}

function mapRowToMatch(row: any): PokerMatch {
  return {
    id: row.id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    locationId: row.location_id,
    buyIn: row.buy_in,
    playersCount: row.players_count,
    chipsCount: row.chips_count,
  };
}

function mapRowToPlayerMatch(row: any): PokerPlayerMatch {
  return {
    playerId: row.player_id,
    matchId: row.match_id,
    finalChipsCount: row.final_chips_count,
    moneyEarned: row.money_earned,
  };
}

function mapRowToDeal(row: any): PokerDeal {
  return {
    id: row.id,
    num: row.num,
    minBet: row.min_bet,
    dealerId: row.dealer_id,
    matchId: row.match_id,
    winnerId: row.winner_id,
    splitWinnerId: row.split_winner_id,
    winningHand: row.winning_hand,
    winningHandRank: row.winning_hand_rank,
  };
}

export async function getPlayers(): Promise<PokerPlayer[]> {
  const result = await executeDbQuery('SELECT * FROM players');
  return result.map(mapRowToPlayer);
}

export async function findPlayerByName(
  name: string
): Promise<PokerPlayer | null> {
  const result = await executeDbQuery('SELECT * FROM players WHERE name = ?', [
    name,
  ]);
  if (!result.length) return null;
  return mapRowToPlayer(result[0]);
}

export async function getLocations(): Promise<PokerLocation[]> {
  const result = await executeDbQuery('SELECT * FROM locations');
  return result.map(mapRowToLocation);
}

export async function getMatches(): Promise<PokerMatch[]> {
  const result = await executeDbQuery('SELECT * FROM matches');
  return result.map(mapRowToMatch);
}

export async function addPlayer(name: string) {
  await executeDbQuery('INSERT INTO players (name) VALUES (?)', [name]);
}

export async function addLocation(name: string) {
  await executeDbQuery('INSERT INTO locations (name) VALUES (?)', [name]);
}

export async function addMatch(match: Partial<PokerMatch>) {
  await executeDbQuery(
    'INSERT INTO matches (started_at, ended_at, location_id, buy_in, players_count, chips_count) VALUES (?, ?, ?, ?, ?, ?)',
    [
      match.startedAt?.valueOf(),
      match.endedAt?.valueOf(),
      match.locationId,
      match.buyIn,
      match.playersCount,
      match.chipsCount,
    ]
  );
}

export async function getMatchesAtDate(date: Date): Promise<PokerMatch[]> {
  const result = await executeDbQuery(
    'SELECT * FROM matches WHERE started_at >= ? AND started_at < ?',
    [date.valueOf(), date.valueOf() + 24 * 60 * 60 * 1000]
  );
  return result.map(mapRowToMatch);
}

export async function addDeal(deal: Partial<PokerDeal>) {
  await executeDbQuery(
    'INSERT INTO deals (num, min_bet, dealer_id, match_id, winner_id, split_winner_id, winning_hand, winning_hand_rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      deal.num,
      deal.minBet,
      deal.dealerId,
      deal.matchId,
      deal.winnerId,
      deal.splitWinnerId,
      deal.winningHand,
      deal.winningHandRank,
    ]
  );
}

export async function addPlayerMatch(playerMatch: Partial<PokerPlayerMatch>) {
  await executeDbQuery(
    'INSERT INTO players_matches (player_id, match_id, final_chips_count, money_earned) VALUES (?, ?, ?, ?)',
    [
      playerMatch.playerId,
      playerMatch.matchId,
      playerMatch.finalChipsCount,
      playerMatch.moneyEarned,
    ]
  );
}

export async function getMatchDeals(matchId: number): Promise<PokerDeal[]> {
  const result = await executeDbQuery(
    'SELECT * FROM deals WHERE match_id = ?',
    [matchId]
  );
  return result.map(mapRowToDeal);
}
