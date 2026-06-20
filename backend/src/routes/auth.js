import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { one, query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const authRouter = express.Router();

const registerSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function publicUser(user) {
  return user ? { id: user.id, username: user.username, email: user.email, role: user.role } : null;
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const hash = await bcrypt.hash(data.password, 12);
    const row = await one(
      `INSERT INTO users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id,username,email,role`,
      [data.username, data.email.toLowerCase(), hash]
    );
    req.session.userId = row.id;
    req.session.role = row.role;
    res.json({ user: publicUser(row) });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'Email already registered' });
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = await one(`SELECT * FROM users WHERE email=$1`, [data.email.toLowerCase()]);
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    const ok = await bcrypt.compare(data.password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await one(`SELECT id,username,email,role FROM users WHERE id=$1`, [req.session.userId]);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/make-demo-admin', requireAuth, async (req, res, next) => {
  try {
    const row = await one(`UPDATE users SET role='admin' WHERE id=$1 RETURNING id,username,email,role`, [req.session.userId]);
    req.session.role = 'admin';
    res.json({ user: publicUser(row), message: 'Demo admin enabled for this account.' });
  } catch (error) {
    next(error);
  }
});
