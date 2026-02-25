#!/usr/bin/env node
/** Quick query runner: node scripts/query.js "SELECT ..." */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });
const sql = process.argv[2];
if (!sql) { console.error('Usage: node scripts/query.js "SQL"'); process.exit(1); }
(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const res = await client.query(sql);
    if (res.rows) console.log(JSON.stringify(res.rows, null, 2));
    else console.log('OK, rows affected:', res.rowCount);
  } catch (err) { console.error('ERROR:', err.message); }
  await client.end();
})();
