#!/usr/bin/env node
/**
 * migrate.js — Run SQL migration files against the Supabase database.
 *
 * Usage:
 *   node scripts/migrate.js docs/MIGRATION_MEDIA_LIBRARY.sql docs/MIGRATION_LEGAL.sql
 *   npm run db:migrate -- docs/MIGRATION_LEGAL.sql
 *   npm run db:migrate                  # runs all docs/MIGRATION_*.sql files
 *
 * Reads DATABASE_URL from .env.local (gitignored).
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env.local not found. Create it with DATABASE_URL=postgresql://...');
  process.exit(1);
}
dotenv.config({ path: envPath });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL not set in .env.local');
  process.exit(1);
}

async function runMigration(filePath) {
  const fullPath = path.resolve(filePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`  File not found: ${fullPath}`);
    return false;
  }
  const sql = fs.readFileSync(fullPath, 'utf8');
  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    await client.query(sql);
    console.log(`  OK: ${path.basename(filePath)}`);
    return true;
  } catch (err) {
    console.error(`  FAIL: ${path.basename(filePath)} — ${err.message}`);
    return false;
  } finally {
    await client.end();
  }
}

async function main() {
  let files = process.argv.slice(2);

  // If no files specified, find all docs/MIGRATION_*.sql
  if (files.length === 0) {
    const docsDir = path.resolve(__dirname, '..', 'docs');
    files = fs.readdirSync(docsDir)
      .filter(f => f.startsWith('MIGRATION_') && f.endsWith('.sql'))
      .sort()
      .map(f => path.join('docs', f));
  }

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  console.log(`Running ${files.length} migration(s)...`);
  let passed = 0;
  for (const file of files) {
    const ok = await runMigration(file);
    if (ok) passed++;
  }
  console.log(`\nDone: ${passed}/${files.length} succeeded.`);
  if (passed < files.length) process.exit(1);
}

main();
