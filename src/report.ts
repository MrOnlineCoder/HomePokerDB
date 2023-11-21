import { executeDbQuery, executeDbQuerySingle } from './db';
import { localizeHandRank } from './entities';
import { getMatches, mapRowToMatch } from './repos';

import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';
import handlebars from 'handlebars';

export interface PokerReport {
  startDateString: string;
  endDateString: string;
  totalMatchesCount: number;
  totalDealsCount: number;
  totalMoneyInvested: number;
  averagePlayerCount: number;
  longestMatchDuration: number;
  averageMatchDuration: number;

  byLocations: {
    locationName: string;
    matchesCount: number;
  }[];

  byIncome: {
    playerName: string;
    moneyEarned: number;
  }[];

  byProfit: {
    playerName: string;
    profit: number;
  }[];

  byCombinations: {
    combinationName: string;
    combinationsCount: number;
  }[];

  byVictories: {
    playerName: string;
    victoriesCount: number;
  }[];

  byDealerWins: {
    playerName: string;
    winsPercent: number;
  }[];
}

export async function buildPokerReport(
  startDate: Date,
  endDate: Date
): Promise<PokerReport> {
  const dateFilterParams = [startDate.valueOf(), endDate.valueOf()];

  const matchesRows = await executeDbQuery(
    `SELECT * FROM matches WHERE started_at BETWEEN ? AND ?`,
    dateFilterParams
  );

  const dealsRows = await executeDbQuery(
    `SELECT * FROM deals JOIN matches ON deals.match_id = matches.id JOIN players ON deals.dealer_id == players.id WHERE matches.started_at BETWEEN ? AND ?`,
    dateFilterParams
  );

  const matches = matchesRows.map(mapRowToMatch);

  const locationsPopularityRows = await executeDbQuery(
    `select matches.location_id, locations.name as location_name, count(*) as cnt from matches join locations on matches.location_id = locations.id where started_at between ? and ? group by location_id, location_name order by cnt desc`,
    dateFilterParams
  );

  const totalMoneyInvestedRow = await executeDbQuerySingle(
    `select SUM(matches.buy_in * matches.players_count) as money_invested from matches where matches.started_at between ? and ?;`,
    dateFilterParams
  );

  const averagePlayersCount =
    matches.reduce((a, b) => a + b.playersCount, 0) / matches.length;

  const maxMatchDurationRow = await executeDbQuerySingle(
    `select MAX(ROUND((ended_at - started_at) / 1000 / 60)) as duration from matches where started_at is not null and ended_at not null and started_at between ? and ?;`,
    dateFilterParams
  );
  const avgMatchDurationRow = await executeDbQuerySingle(
    `select ROUND(AVG((ended_at - started_at) / 1000 / 60)) as duration from matches where started_at is not null and ended_at not null and started_at between ? and ?;`,
    dateFilterParams
  );

  const topProfitMakersRows = await executeDbQuery(
    `select players.id as player_id, players.name as player_name, SUM(players_matches.profit) as profit from matches join players_matches on players_matches.match_id = matches.id join players on players.id = players_matches.player_id where matches.started_at between ? and ? group by player_id, player_name order  by profit  desc; `,
    dateFilterParams
  );

  const topMoneyEarnersMakersRows = await executeDbQuery(
    `select players.id as player_id, players.name as player_name, SUM(players_matches.money_earned) as money_earned from matches join players_matches on players_matches.match_id = matches.id join players on players.id = players_matches.player_id where matches.started_at between ? and ? group by player_id, player_name order  by money_earned  desc; `,
    dateFilterParams
  );

  const combinationsRows = await executeDbQuery(
    `select winning_hand_rank, count(*) as cnt  from deals join matches on deals.match_id = matches.id where matches.started_at between ? and ? group by winning_hand_rank order by cnt desc; `,
    dateFilterParams
  );

  const victoriesRows = await executeDbQuery(
    `select players.name as player_name, count(*) as wins from deals join matches on matches.id = deals.match_id join players on deals.winner_id = players.id where matches.started_at between ? and ? group by player_name order by wins desc;`,
    dateFilterParams
  );

  const selfDealWinRows = await executeDbQuery(
    `select players.id as player_id, players.name as player_name, count(*) as wins from deals join matches on matches.id = deals.match_id join players on deals.winner_id = players.id where deals.winner_id = deals.dealer_id and matches.started_at between ? and ? group by player_id, player_name order by wins desc;`,
    dateFilterParams
  );

  return {
    averageMatchDuration: avgMatchDurationRow.duration,
    longestMatchDuration: maxMatchDurationRow.duration,
    averagePlayerCount: Math.round(averagePlayersCount),
    byLocations: locationsPopularityRows.map((r) => ({
      locationName: r.location_name,
      matchesCount: r.cnt,
    })),
    byIncome: topMoneyEarnersMakersRows.map((r) => ({
      playerName: r.player_name,
      moneyEarned: r.money_earned,
    })),
    byProfit: topProfitMakersRows.map((r) => ({
      playerName: r.player_name,
      profit: r.profit,
    })),
    byCombinations: combinationsRows.map((r) => ({
      combinationName: localizeHandRank(r.winning_hand_rank),
      combinationsCount: r.cnt,
    })),
    byVictories: victoriesRows.map((r) => ({
      playerName: r.player_name,
      victoriesCount: r.wins,
    })),
    byDealerWins: selfDealWinRows.map((r) => ({
      playerName: r.player_name,
      winsPercent: Math.round(
        (r.wins / dealsRows.filter((v) => v.dealer_id == r.player_id).length) *
          100
      ),
    })),
    endDateString: dayjs(endDate).format('DD.MM.YYYY'),
    startDateString: dayjs(startDate).format('DD.MM.YYYY'),
    totalDealsCount: dealsRows.length,
    totalMoneyInvested: totalMoneyInvestedRow.money_invested,
    totalMatchesCount: matches.length,
  };
}

export function renderReportAsHtml(report: PokerReport) {
  const template = fs.readFileSync(
    path.join(__dirname, '../resources/report.html'),
    'utf8'
  );
  const compiledTemplate = handlebars.compile(template);
  return compiledTemplate(report);
}
