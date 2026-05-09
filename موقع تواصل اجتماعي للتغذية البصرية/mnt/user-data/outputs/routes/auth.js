// routes/auth.js — تسجيل الدخول وإنشاء الحساب
const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query, run } = require('../database');
const { SECRET }     = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });

    if (password.length < 6)
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

    // Check if email exists
    const existing = query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ error: 'البريد الإلكتروني مسجّل مسبقاً' });

    // Generate handle from name
    let handle = '@' + name.trim().toLowerCase()
      .replace(/\s+/g, '.')
      .replace(/[^a-z0-9.]/g, '')
      || 'user';

    // Make handle unique
    const handleExists = query('SELECT id FROM users WHERE handle = ?', [handle]);
    if (handleExists.length > 0) handle += Math.floor(Math.random() * 9000 + 1000);

    const hashed = await bcrypt.hash(password, 10);
    const result = run(
      'INSERT INTO users (name, handle, email, password) VALUES (?, ?, ?, ?)',
      [name.trim(), handle, email.toLowerCase(), hashed]
    );

    const token = jwt.sign({ id: result.lastID, email, name, handle }, SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { id: result.lastID, name, email, handle }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });

    const users = query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (users.length === 0)
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, handle: user.handle },
      SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: { id: user.id, name: user.name, email: user.email, handle: user.handle, bio: user.bio, location: user.location }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authRequired, (req, res) => {
  const users = query('SELECT id, name, handle, email, bio, location, avatar_url, verified, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!users.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json(users[0]);
});

module.exports = router;
