import { many, one, query } from '../db/pool.js';

export async function persistProducts(products) {
  const saved = [];
  for (const p of products) {
    const row = await one(
      `INSERT INTO products(source_product_id,name,price,native_price,native_currency,normalized_price_pkr,platform,category,url,image_url,rating,reviews,availability,ai_score,ai_reason,specs,last_seen_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,NOW())
       ON CONFLICT(platform, source_product_id) DO UPDATE SET
       name=$2, price=$3, native_price=$4, native_currency=$5, normalized_price_pkr=$6, category=$8, url=$9, image_url=$10, rating=$11, reviews=$12, availability=$13, ai_score=$14, ai_reason=$15, specs=$16::jsonb, last_seen_at=NOW()
       RETURNING *`,
      [p.source_product_id, p.name, p.price, p.native_price, p.native_currency, p.normalized_price_pkr, p.platform, p.category, p.url, p.image_url, p.rating, p.reviews, p.availability, p.ai_score, p.ai_reason, JSON.stringify(p.specs || {})]
    );
    if (row) {
      saved.push(row);
      await query(
        `INSERT INTO price_history(product_id, price_pkr, platform) VALUES($1,$2,$3)`,
        [row.id, row.normalized_price_pkr, row.platform]
      );
    }
  }
  return saved;
}

export async function markFavorites(products, userId) {
  if (!userId || !products.length) return products.map((p) => ({ ...p, is_favorite: false }));
  const ids = products.map((p) => p.id);
  const rows = await many(`SELECT product_id FROM favorites WHERE user_id=$1 AND product_id = ANY($2::uuid[])`, [userId, ids]);
  const set = new Set(rows.map((r) => r.product_id));
  return products.map((p) => ({ ...p, is_favorite: set.has(p.id) }));
}
