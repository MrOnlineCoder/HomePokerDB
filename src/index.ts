import { homeScene } from './cli';
import { executeDbQuery, initDb } from './db';

import dayjs from 'dayjs';
import crypto from 'crypto';
import fs from 'fs';

const customParseFormat = require('dayjs/plugin/customParseFormat');
dayjs.extend(customParseFormat);

async function main() {
  await initDb();
  await homeScene();
}

main();
