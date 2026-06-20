import dotenv from 'dotenv';
dotenv.config();

function intEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : fallback;
}

function floatEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : fallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: intEnv('PORT', 8080),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  scraperMode: process.env.SCRAPER_MODE || 'hybrid',
  cacheTtlHours: intEnv('CACHE_TTL_HOURS', 6),
  maxProductsPerPlatform: intEnv('MAX_PRODUCTS_PER_PLATFORM', 12),
  inrToPkr: floatEnv('INR_TO_PKR', 3.3),
  usdToPkr: floatEnv('USD_TO_PKR', 278)
};

export function requireDatabaseUrl() {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL missing. Create backend/.env using .env.example.');
  }
}
