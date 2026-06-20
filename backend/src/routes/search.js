import express from 'express';
import { z } from 'zod';
import { optionalUser } from '../middleware/auth.js';
import { analyzeQuery, summarizeProducts } from '../services/gemini.js';
import { collectSources } from '../services/scrapers.js';
import { rankProducts } from '../services/ranking.js';
import { persistProducts, markFavorites } from '../services/products.js';
import { query } from '../db/pool.js';

export const searchRouter = express.Router();
const searchSchema = z.object({ q: z.string().min(1).max(160) });

searchRouter.post('/', optionalUser, async (req, res, next) => {
  try {
    const { q } = searchSchema.parse(req.body);
    const analysis = await analyzeQuery(q);
    const scraped = await collectSources(analysis);
    const ranked = rankProducts(scraped, analysis);
    const saved = await persistProducts(ranked);
    const withFav = await markFavorites(saved, req.userId);
    const summary = await summarizeProducts(withFav, analysis);

    await query(
      `INSERT INTO search_history(user_id, query, processed_query, category, results_count) VALUES($1,$2,$3,$4,$5)`,
      [req.userId, q, analysis.processedQuery, analysis.category, withFav.length]
    );

    res.json({ analysis, products: withFav, ai: summary });
  } catch (error) {
    next(error);
  }
});

searchRouter.get('/suggestions', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').toLowerCase();
    const base = [
      'gaming laptop under 1 lakh',
      'rtx 4060 laptop',
      'iphone under 200000',
      'wireless earbuds under 10000',
      'samsung phone PTA approved',
      'laptop 16GB RAM 512GB SSD',
      'smartwatch under 10000',
      'mouse under 3k',
      'wireless mouse under 3000',
      'gaming mouse under 3000'
    ];
    res.json({ suggestions: base.filter((x) => x.includes(q)).slice(0, 6) });
  } catch (error) {
    next(error);
  }
});
