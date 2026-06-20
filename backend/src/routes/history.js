import express from 'express';
import { many, query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const historyRouter = express.Router();
historyRouter.use(requireAuth);

historyRouter.get('/', async (req, res, next) => {
  try {
    const rows = await many(`SELECT * FROM search_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [req.session.userId]);
    res.json({ history: rows });
  } catch (error) {
    next(error);
  }
});

historyRouter.delete('/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM search_history WHERE id=$1 AND user_id=$2`, [req.params.id, req.session.userId]);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
