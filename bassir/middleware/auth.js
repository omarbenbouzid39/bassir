// middleware/auth.js — التحقق من التوكن
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'baseer_secret_2024';

function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'جلسة منتهية، سجّل الدخول مجدداً' });
  }
}

function authOptional(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.split(' ')[1], SECRET);
    } catch {}
  }
  next();
}

module.exports = { authRequired, authOptional, SECRET };
