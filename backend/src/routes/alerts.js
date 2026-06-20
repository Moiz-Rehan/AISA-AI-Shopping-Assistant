import express from 'express';
import { many, query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const alertsRouter = express.Router();
alertsRouter.use(requireAuth);

alertsRouter.get('/', async (req, res, next) => {
  try {
    const rows = await many(
      `SELECT a.*, p.name, p.platform, p.normalized_price_pkr FROM price_alerts a LEFT JOIN products p ON p.id=a.product_id WHERE a.user_id=$1 ORDER BY a.created_at DESC`,
      [req.session.userId]
    );
    res.json({ alerts: rows });
  } catch (error) {
    next(error);
  }
});

alertsRouter.post('/', async (req, res, next) => {
  try {
    const { productId, query: searchQuery, targetPricePkr } = req.body;
    await query(
      `INSERT INTO price_alerts(user_id, product_id, query, target_price_pkr) VALUES($1,$2,$3,$4)`,
      [req.session.userId, productId || null, searchQuery || null, Number(targetPricePkr)]
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

alertsRouter.delete('/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM price_alerts WHERE id=$1 AND user_id=$2`, [req.params.id, req.session.userId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
