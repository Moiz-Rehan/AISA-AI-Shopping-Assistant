import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = env.databaseUrl
  ? new Pool({
      connectionString: env.databaseUrl,
      ssl: env.databaseUrl.includes('supabase') ? { rejectUnauthorized: false } : false,
      max: 8,
      idleTimeoutMillis: 30_000
    })
  : null;

export async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database is not configured. Add DATABASE_URL in backend/.env.');
  }
  return pool.query(text, params);
}

export async function one(text, params = []) {
  const result = await query(text, params);
  return result.rows[0] || null;
}

export async function many(text, params = []) {
  const result = await query(text, params);
  return result.rows;
}
