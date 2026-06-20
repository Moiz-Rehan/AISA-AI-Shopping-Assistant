import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import { env, requireDatabaseUrl } from './config/env.js';
import { pool, query } from './db/pool.js';
import { authRouter } from './routes/auth.js';
import { searchRouter } from './routes/search.js';
import { productsRouter } from './routes/products.js';
import { favoritesRouter } from './routes/favorites.js';
import { historyRouter } from './routes/history.js';
import { alertsRouter } from './routes/alerts.js';
import { dashboardRouter } from './routes/dashboard.js';
import { adminRouter } from './routes/admin.js';

requireDatabaseUrl();

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60_000, limit: 90 }));
app.use(
  session({
    name: 'aisa.sid',
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      secure: env.nodeEnv === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  })
);

app.get('/api/healthz', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true, db: true, scraperMode: env.scraperMode });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/search', searchRouter);
app.use('/api/products', productsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/history', historyRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/admin', adminRouter);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.name === 'ZodError') return res.status(400).json({ message: 'Validation error', issues: error.issues });
  res.status(500).json({ message: error.message || 'Internal server error' });
});

const server = app.listen(env.port, () => {
  console.log(`✅ AISA API running on http://localhost:${env.port}`);
});

process.on('SIGINT', async () => {
  server.close();
  if (pool) await pool.end();
  process.exit(0);
});
