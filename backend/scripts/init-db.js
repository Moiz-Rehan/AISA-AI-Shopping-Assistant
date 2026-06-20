import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing. Create backend/.env first.');
    process.exit(1);
  }
  const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf8');
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('supabase') ? { rejectUnauthorized: false } : false
  });
  try {
    await pool.query(sql);
    console.log('✅ Database schema created/updated successfully.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('❌ Database init failed:', err.message);
  process.exit(1);
});
