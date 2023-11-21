import sqlite3 from 'sqlite3';
import fs from 'fs';

const db = new sqlite3.Database('poker.db');

export async function executeDbQuery(
  query: string,
  params: any[] = []
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

export async function executeDbQuerySingle(query: string, params: any[] = []) {
  const result = await executeDbQuery(query, params);
  if (!result.length) return null;
  return result[0];
}

export async function initDb() {
  const seedSql = fs.readFileSync('db/init.sql');

  await executeDbQuery(seedSql.toString());
}
