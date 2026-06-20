import express from 'express';
import { many, one, query } from '../db/pool.js';
import { requireAdmin, requireAuth } from '../middleware/auth.js';

export const adminRouter = express.Router();
adminRouter.use(requireAuth, requireAdmin);

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const stats = await one(
      `SELECT
       (SELECT COUNT(*)::int FROM users) AS users,
       (SELECT COUNT(*)::int FROM products) AS products,
       (SELECT COUNT(*)::int FROM search_history) AS searches,
       (SELECT COUNT(*)::int FROM search_cache WHERE expires_at > NOW()) AS fresh_cache`
    );
    const platforms = await many(`SELECT * FROM platform_status ORDER BY platform`);
    res.json({ stats, platforms });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/cache', async (_req, res, next) => {
  try {
    await query(`DELETE FROM search_cache`);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
