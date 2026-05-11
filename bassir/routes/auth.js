/**
 * routes/auth.js — تسجيل الدخول وإنشاء الحساب
 * by omar benbouzid dev
 */

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, queryOne } = require('../database');
const { authRequired }    = require('../middleware/auth');

const SECRET = process.env.JWT_SECRET || 'baseer_dev_secret';

// ── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });

    if (password.length < 6)
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

    // التحقق من البريد
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing)
      return res.status(409).json({ error: 'البريد الإلكتروني مسجّل مسبقاً' });

    // توليد handle فريد
    let handle = '@' + name.trim().toLowerCase()
      .replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') || 'user';
    const handleExists = await queryOne('SELECT id FROM users WHERE handle = $1', [handle]);
    if (handleExists) handle += Math.floor(Math.random() * 9000 + 1000);

    const hashed = await bcrypt.hash(password, 10);

    const user = await queryOne(
      'INSERT INTO users (name, handle, email, password) VALUES ($1,$2,$3,$4) RETURNING id, name, email, handle',
      [name.trim(), handle, email.toLowerCase(), hashed]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, handle: user.handle },
      SECRET, { expiresIn: '30d' }
    );

    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح', token, user });
  } catch (err) {
    console.error('[register]', err.message);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });

    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (!user)
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, handle: user.handle },
      SECRET, { expiresIn: '30d' }
    );

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { id: user.id, name: user.name, email: user.email, handle: user.handle, bio: user.bio, location: user.location }
    });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authRequired, async (req, res) => {
  try {
    const user = await queryOne(
      'SELECT id, name, handle, email, bio, location, avatar_url, verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
