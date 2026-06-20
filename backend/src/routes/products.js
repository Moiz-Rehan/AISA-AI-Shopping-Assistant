import express from 'express';
import { many, one, query } from '../db/pool.js';
import { optionalUser } from '../middleware/auth.js';

export const productsRouter = express.Router();

productsRouter.get('/:id', optionalUser, async (req, res, next) => {
  try {
    const product = await one(`SELECT * FROM products WHERE id=$1`, [req.params.id]);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    if (req.userId) {
      await query(`INSERT INTO product_views(user_id, product_id) VALUES($1,$2)`, [req.userId, product.id]);
    }
    const history = await many(
      `SELECT price_pkr, captured_at FROM price_history WHERE product_id=$1 ORDER BY captured_at DESC LIMIT 20`,
      [product.id]
    );
    const similar = await many(
      `SELECT * FROM products WHERE category=$1 AND id<>$2 ORDER BY ai_score DESC, normalized_price_pkr ASC LIMIT 8`,
      [product.category, product.id]
    );
    res.json({ product, history, similar });
  } catch (error) {
    next(error);
  }
});

productsRouter.get('/:id/similar', async (req, res, next) => {
  try {
    const product = await one(`SELECT * FROM products WHERE id=$1`, [req.params.id]);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    const products = await many(
      `SELECT * FROM products WHERE category=$1 AND id<>$2 ORDER BY ai_score DESC LIMIT 12`,
      [product.category, product.id]
    );
    res.json({ products });
  } catch (error) {
    next(error);
  }
});
