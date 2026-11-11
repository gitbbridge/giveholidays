import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; select an isolated development or staging database.');
if (process.env.NODE_ENV === 'production' && process.env.CONFIRM_PRODUCTION_MIGRATION !== 'approved') throw new Error('Production migrations require explicit release approval and CONFIRM_PRODUCTION_MIGRATION=approved.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(19450231)');
  await client.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  await client.query('COMMIT');
  console.log('Migration 001_public_inquiries applied.');
} catch { await client.query('ROLLBACK'); throw new Error('Migration failed; transaction rolled back.'); }
finally { client.release(); await pool.end(); }
