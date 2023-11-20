import { homeScene } from './cli';
import { initDb } from './db';

import dayjs from 'dayjs';

const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

async function main() {
  await initDb();
  await homeScene();
}

main();
