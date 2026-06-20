import express from 'express';
import { many, query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const favoritesRouter = express.Router();
favoritesRouter.use(requireAuth);

favoritesRouter.get('/', async (req, res, next) => {
  try {
    const products = await many(
      `SELECT p.*, f.created_at AS favorited_at FROM favorites f JOIN products p ON p.id=f.product_id WHERE f.user_id=$1 ORDER BY f.created_at DESC`,
      [req.session.userId]
    );
    res.json({ products });
  } catch (error) {
    next(error);
  }
});

favoritesRouter.post('/', async (req, res, next) => {
  try {
    await query(`INSERT INTO favorites(user_id, product_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, [req.session.userId, req.body.productId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

favoritesRouter.delete('/:productId', async (req, res, next) => {
  try {
    await query(`DELETE FROM favorites WHERE user_id=$1 AND product_id=$2`, [req.session.userId, req.params.productId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
