import { executeDbQuery, executeDbQuerySingle } from './db';
import { getMatches, mapRowToMatch } from './repos';

import dayjs from 'dayjs';

export async function buildPokerReport(startDate: Date, endDate: Date) {
  const dateFilterParams = [startDate.valueOf(), endDate.valueOf()];

  const matchesRows = await executeDbQuery(
    `SELECT * FROM matches WHERE started_at BETWEEN ? AND ?`,
    dateFilterParams
  );

  const matches = matchesRows.map(mapRowToMatch);

  let lines = [
    `
    Poker playing report from ${dayjs(startDate).format(
      'DD.MM.YYYY'
    )} to ${dayjs(endDate).format('DD.MM.YYYY')}    
  `,
  ];

  const locationsPopularityRows = await executeDbQuery(
    `select matches.location_id, locations.name as location_name, count(*) as cnt from matches join locations on matches.location_id = locations.id where started_at between ? and ? group by location_id, location_name`,
    dateFilterParams
  );

  const averagePlayersCount =
    matches.reduce((a, b) => a + b.playersCount, 0) / matches.length;

  const appendReport = (line: string) => lines.push(line);
  appendReport('------');
  appendReport(`Total matches played: ${matches.length}`);
  appendReport(
    `Total money spent for buying in: ${matches.reduce(
      (a, b) => a + b.buyIn * b.playersCount,
      0
    )} UAH`
  );
  appendReport(
    `Average players count per match: ${Math.round(averagePlayersCount)}`
  );

  const locationsPopularityList = locationsPopularityRows.map(
    (r, i) => `${i + 1}. ${r.location_name} - ${r.cnt} matches`
  );

  appendReport('Matches count by locations: ');
  appendReport(locationsPopularityList.join('\n'));

  const maxMatchDurationRow = await executeDbQuerySingle(
    `select MAX(ROUND((ended_at - started_at) / 1000 / 60)) as duration from matches where started_at is not null and ended_at not null and started_at between ? and ?;`,
    dateFilterParams
  );
  const avgMatchDurationRow = await executeDbQuerySingle(
    `select ROUND(AVG((ended_at - started_at) / 1000 / 60)) as duration from matches where started_at is not null and ended_at not null and started_at between ? and ?;`,
    dateFilterParams
  );

  appendReport(
    `Longest match duration: ${maxMatchDurationRow.duration} minutes`
  );
  appendReport(
    `Average match duration: ${avgMatchDurationRow.duration} minutes`
  );

  return lines.join('\n');
}
