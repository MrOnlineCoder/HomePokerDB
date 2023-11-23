import inquirer from 'inquirer';
import {
  addDeal,
  addLocation,
  addMatch,
  addPlayer,
  addPlayerMatch,
  findPlayerByName,
  getLocations,
  getMatchesAtDate,
  getPlayers,
} from './repos';

import pc from 'picocolors';
import crypto from 'crypto';
import dayjs from 'dayjs';
import fs from 'fs';
import childProcess from 'child_process';
import { PokerDeal, PokerMatch, PokerPlayerMatch } from './entities';
import { PokerHandRank } from './entities';
import { buildPokerReport, renderReportAsHtml } from './report';

export async function addPlayerScene() {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Player name:',
    },
  ]);

  const existing = await findPlayerByName(name);

  if (existing) {
    console.log(pc.red('✗ ') + pc.white(`Player "${name}" already exists!`));
    console.log();
    return;
  }

  await addPlayer(name);

  console.log(pc.green('✓ ') + pc.white(`Player "${name}" added!`));
  console.log();
}

export async function addLocationScene() {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Location name:',
    },
  ]);

  await addLocation(name);

  console.log(pc.green('✓ ') + pc.white(`Location "${name}" added!`));
  console.log();
}

export async function addMatchScene() {
  const { locationId, date, startTime, playersCount, buyIn, chipsCount } =
    await inquirer.prompt([
      {
        type: 'rawlist',
        name: 'locationId',
        message: 'Okay, new match! Select a location where it took place:',
        choices: async () =>
          (await getLocations()).map((l) => ({ name: l.name, value: l.id })),
      },
      {
        type: 'input',
        name: 'date',
        message: 'Date (DD.MM.YYYY):',
      },
      {
        type: 'input',
        name: 'startTime',
        message: 'Start time (HH:mm) or empty if unknown:',
        default: '',
      },
      {
        type: 'input',
        name: 'playersCount',
        message: 'Number of players:',
        validate: (input: string) => {
          if (isNaN(parseInt(input))) {
            return 'Invalid number!';
          }

          return true;
        },
      },
      {
        type: 'input',
        name: 'buyIn',
        message: 'Buy-in amount in UAH:',
        default: '100',
        validate: (input: string) => {
          if (isNaN(parseInt(input))) {
            return 'Invalid number!';
          }

          if (+input < 0) {
            return 'Buy-in amount should be greater or equal to 0!';
          }

          return true;
        },
      },
      {
        type: 'input',
        name: 'chipsCount',
        message: 'Number of chips, bought for given buy-in:',
        default: '500',
        validate: (input: string) => {
          if (isNaN(parseInt(input))) {
            return 'Invalid number!';
          }

          if (+input <= 0) {
            return 'Chips count should be greater than 0!';
          }

          return true;
        },
      },
    ]);

  const dayMatches = await getMatchesAtDate(dayjs(date, 'DD.MM.YYYY').toDate());

  if (dayMatches.length) {
    console.log(
      pc.yellow('! ') +
        pc.white(
          `There are ${dayMatches.length} matches present on given date:`
        )
    );
    for (const match of dayMatches) {
      console.log(
        pc.yellow('► ') +
          pc.white(
            ` ${match.startedAt.toLocaleTimeString()}, ${match.buyIn} buy-in, ${
              match.playersCount
            } players count`
          )
      );
    }
  }

  const match: PokerMatch = {
    id: crypto.randomUUID(),
    buyIn: +buyIn,
    chipsCount: +chipsCount,
    endedAt: null,
    enteredAt: new Date(),
    locationId: +locationId,
    playersCount: +playersCount,
    startedAt: startTime
      ? dayjs(`${date} ${startTime}`, 'DD.MM.YYYY HH:mm').toDate()
      : dayjs(date, 'DD.MM.YYYY').toDate(),
  };

  console.log(match);

  const playerMatches: PokerPlayerMatch[] = [];

  const allPlayers = await getPlayers();

  const getPlayerName = (id: number) => {
    return allPlayers.find((p) => p.id == id)?.name;
  };

  for (let i = 0; i < match.playersCount; i++) {
    const availablePlayers = allPlayers.filter(
      (p) => !playerMatches.find((pm) => pm.playerId == p.id)
    );

    const choices = availablePlayers.map((p) => ({
      name: p.name,
      value: p.id,
    }));

    const { playerId } = await inquirer.prompt([
      {
        type: 'rawlist',
        name: 'playerId',
        message: `Select player #${i + 1}:`,
        choices,
      },
    ]);

    playerMatches.push({
      matchId: match.id,
      finalChipsCount: 0,
      moneyEarned: 0,
      playerId: +playerId,
      profit: 0,
    });

    console.log(
      pc.green('✓ ') +
        pc.white(`Player #${i + 1} added as player ID ${playerId}!`)
    );
  }

  const deals: PokerDeal[] = [];

  let lastMinBet = 10;

  while (true) {
    const { confimation } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confimation',
        message: 'Do you want to add another deal?',
        default: true,
      },
    ]);

    if (!confimation) break;

    const dealNumber = deals.length + 1;

    console.log();
    console.log(pc.magenta('► ') + pc.white(`Deal #${dealNumber}`));
    console.log();

    const possibleWinners = playerMatches.map((pm) => ({
      name: getPlayerName(pm.playerId),
      value: pm.playerId,
    }));

    const { dealerId, winnerId, winningHand, winningHandRank, minBet } =
      await inquirer.prompt([
        {
          type: 'rawlist',
          name: 'dealerId',
          message: 'Select dealer:',
          default: deals.length % playerMatches.length,
          choices: possibleWinners,
        },
        {
          type: 'input',
          name: 'minBet',
          message: 'Minimum bet (big blind):',
          default: lastMinBet,
        },
        {
          type: 'rawlist',
          name: 'winnerId',
          message: 'Select winner:',
          choices: possibleWinners,
        },
        {
          type: 'list',
          name: 'winningHandRank',
          message: 'Select winning hand rank:',
          choices: [
            {
              name: '* all folded *',
              value: PokerHandRank.AllFolded,
            },
            {
              name: 'High card',
              value: PokerHandRank.HighCard,
            },
            {
              name: 'Pair',
              value: PokerHandRank.Pair,
            },
            {
              name: 'Two pairs',
              value: PokerHandRank.TwoPairs,
            },
            {
              name: 'Three of a kind / set / trips',
              value: PokerHandRank.ThreeOfAKind,
            },
            {
              name: 'Straight',
              value: PokerHandRank.Straight,
            },
            {
              name: 'Flush',
              value: PokerHandRank.Flush,
            },
            {
              name: 'Full house',
              value: PokerHandRank.FullHouse,
            },
            {
              name: 'Four of a kind / quads',
              value: PokerHandRank.FourOfAKind,
            },
            {
              name: 'Straight flush',
              value: PokerHandRank.StraightFlush,
            },
            {
              name: 'Royal flush',
              value: PokerHandRank.RoyalFlush,
            },
          ],
        },
        {
          type: 'input',
          name: 'winningHand',
          message: 'Enter winning hand additional data, if present:',
          default: '',
        },
      ]);

    if (minBet) lastMinBet = +minBet;

    const deal: PokerDeal = {
      id: crypto.randomUUID(),
      dealerId: +dealerId,
      matchId: match.id,
      minBet,
      num: dealNumber,
      splitWinnerId: null,
      winnerId: +winnerId,
      winningHandRank,
      winningHand,
    };

    deals.push(deal);

    console.log();
    console.log(pc.green('✓ ') + pc.white(`Deal #${dealNumber} added!`));
    console.log();
  }

  if (!deals.length) {
    console.log(
      pc.yellow('! ') + pc.white('No deals added! Match adding cancelled')
    );
    return;
  }

  const { endTime } = await inquirer.prompt([
    {
      type: 'input',
      name: 'endTime',
      message: 'End time (HH:mm) or empty if unknown:',
      default: '',
    },
  ]);

  if (endTime) {
    match.endedAt = dayjs(`${date} ${endTime}`, 'DD.MM.YYYY HH:mm').toDate();
  }

  for (const pm of playerMatches) {
    const { finalChipsCount } = await inquirer.prompt([
      {
        type: 'input',
        name: 'finalChipsCount',
        message: `Enter final chips count for player ${getPlayerName(
          pm.playerId
        )}:`,
      },
    ]);

    const moneyEarned = Math.floor(
      +finalChipsCount * (match.buyIn / match.chipsCount)
    );

    pm.finalChipsCount = +finalChipsCount;
    pm.moneyEarned = moneyEarned;
    pm.profit = pm.moneyEarned - match.buyIn;
  }

  console.log(pc.magenta('! ') + pc.white('Match preview:'));
  console.log(pc.yellow('► ') + pc.white(`Location: ${match.locationId}`));
  console.log(
    pc.yellow('► ') + pc.white(`Date: ${match.startedAt.toLocaleDateString()}`)
  );
  console.log(
    pc.yellow('► ') + pc.white(`Time: ${match.startedAt.toLocaleTimeString()}`)
  );
  console.log(
    pc.yellow('► ') + pc.white(`Players count: ${match.playersCount}`)
  );
  console.log(pc.yellow('► ') + pc.white(`Buy-in: ${match.buyIn}`));
  console.log(pc.yellow('► ') + pc.white(`Chips count: ${match.chipsCount}`));
  console.log(pc.yellow('► ') + pc.white('Players:'));
  for (const pm of playerMatches) {
    const playerName = allPlayers.find((p) => p.id == pm.playerId)?.name;
    console.log(
      pc.yellow('► ') +
        pc.white(
          ` ${playerName} (${pm.playerId}), ${pm.finalChipsCount} chips, ${pm.moneyEarned} UAH`
        )
    );
  }
  console.log(pc.yellow('! ') + pc.white('Deals:'));
  for (const deal of deals) {
    const dealerName = allPlayers.find((p) => p.id == deal.dealerId)?.name;
    const winnerName = allPlayers.find((p) => p.id == deal.winnerId)?.name;

    console.log(
      pc.red('► ') +
        pc.white(` #${deal.num} / Dealer `) +
        pc.cyan(dealerName) +
        pc.white(' / Winner ') +
        pc.green(winnerName) +
        pc.white(' / Winning hand ') +
        pc.bold(
          Object.entries(PokerHandRank).find(
            ([, rank]) => rank == deal.winningHandRank
          )?.[0]
        )
    );
  }

  const { confirmation } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmation',
      message: 'Do you want to add this match?',
      default: true,
    },
  ]);

  if (!confirmation) return;

  await addMatch(match);
  for (const playerMatch of playerMatches) {
    await addPlayerMatch(playerMatch);
  }
  for (const deal of deals) {
    await addDeal(deal);
  }

  console.log(
    pc.green('✓ ') + pc.white(`Match '${match.id}' added successfully!`)
  );
}

async function showReport() {
  const { startDate, endDate } = await inquirer.prompt([
    {
      type: 'input',
      name: 'startDate',
      message: 'Start date (DD.MM.YYYY):',
    },
    {
      type: 'input',
      name: 'endDate',
      message: 'End date (DD.MM.YYYY):',
    },
  ]);

  const report = await buildPokerReport(
    dayjs(startDate, 'DD.MM.YYYY').startOf('day').toDate(),
    dayjs(endDate, 'DD.MM.YYYY').endOf('day').toDate()
  );

  const html = await renderReportAsHtml(report);

  fs.writeFileSync('/tmp/poker_report.html', html);

  console.log(
    pc.green('✓ ') + pc.white('Report generated! Opening in browser...')
  );

  await childProcess.spawn('open', ['/tmp/poker_report.html']);
}

export async function homeScene() {
  while (true) {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: 'Add a new player', value: 'add-player' },
          { name: 'Add a new location', value: 'add-location' },
          { name: 'Add a new match', value: 'add-match' },
          { name: 'Show report', value: 'show-report' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);

    if (action == 'exit') break;

    if (action == 'add-player') {
      await addPlayerScene();
    }

    if (action == 'add-location') {
      await addLocationScene();
    }

    if (action == 'add-match') {
      await addMatchScene();
    }

    if (action == 'show-report') {
      await showReport();
    }
  }
}
