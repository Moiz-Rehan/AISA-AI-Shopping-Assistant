import { env } from '../config/env.js';
import { one, query } from '../db/pool.js';
import { normalizeQuery } from '../utils/text.js';

export function cacheKey(platform, queryText) {
  return `${platform}:${normalizeQuery(queryText)}`;
}

export async function getFreshCache(platform, queryText) {
  const key = cacheKey(platform, queryText);
  const row = await one(
    `SELECT payload FROM search_cache WHERE cache_key=$1 AND expires_at > NOW()`,
    [key]
  );
  return row?.payload || null;
}

export async function getStaleCache(platform, queryText) {
  const key = cacheKey(platform, queryText);
  const row = await one(
    `SELECT payload FROM search_cache WHERE cache_key=$1 ORDER BY updated_at DESC LIMIT 1`,
    [key]
  );
  return row?.payload || null;
}

export async function setCache(platform, queryText, payload, status = 'fresh', message = null) {
  const key = cacheKey(platform, queryText);
  await query(
    `INSERT INTO search_cache(cache_key, query, platform, payload, status, message, expires_at, updated_at)
     VALUES($1,$2,$3,$4::jsonb,$5,$6,NOW() + ($7::text || ' hours')::interval,NOW())
     ON CONFLICT(cache_key) DO UPDATE SET payload=$4::jsonb,status=$5,message=$6,expires_at=NOW() + ($7::text || ' hours')::interval,updated_at=NOW()`,
    [key, queryText, platform, JSON.stringify(payload), status, message, env.cacheTtlHours]
  );
}

export async function setPlatformStatus(platform, status, message) {
  await query(
    `INSERT INTO platform_status(platform, status, message, last_checked_at)
     VALUES($1,$2,$3,NOW())
     ON CONFLICT(platform) DO UPDATE SET status=$2,message=$3,last_checked_at=NOW()`,
    [platform, status, message]
  );
}
