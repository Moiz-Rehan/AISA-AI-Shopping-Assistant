import express from 'express';
import { many, one } from '../db/pool.js';
import { optionalUser, requireAuth } from '../middleware/auth.js';

export const dashboardRouter = express.Router();

dashboardRouter.get('/public', async (_req, res, next) => {
  try {
    const stats = await one(`SELECT COUNT(*)::int AS total_products, COALESCE(ROUND(AVG(ai_score)::numeric,2),0) AS avg_score FROM products`);
    const trending = await many(`SELECT query, COUNT(*)::int AS searches FROM search_history GROUP BY query ORDER BY searches DESC LIMIT 8`);
    res.json({ stats, trending });
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const stats = await one(
      `SELECT
        (SELECT COUNT(*)::int FROM search_history WHERE user_id=$1) AS searches,
        (SELECT COUNT(*)::int FROM favorites WHERE user_id=$1) AS favorites,
        (SELECT COUNT(*)::int FROM price_alerts WHERE user_id=$1 AND is_active=true) AS alerts`,
      [req.session.userId]
    );
    const recent = await many(`SELECT * FROM search_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 8`, [req.session.userId]);
    res.json({ stats, recent });
  } catch (error) {
    next(error);
  }
});
