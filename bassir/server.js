/**
 * ╔══════════════════════════════════════════════════════╗
 * ║           بصير — Visual Feed Platform               ║
 * ║           Backend Server — Express 5 + SQL.js        ║
 * ║                                                      ║
 * ║   by omar benbouzid dev                              ║
 * ╚══════════════════════════════════════════════════════╝
 *
 * الإصلاحات المطبّقة:
 *  ✔ app.use(cors())       — دالة وليس مرجعاً
 *  ✔ app.use(express.json()) — مستدعاة بأقواس
 *  ✔ كل router يُصدَّر بـ module.exports = router
 *  ✔ app.use('/api/...', router) يستقبل Router حقيقي
 *  ✔ app.listen('0.0.0.0') للنشر على Render
 *  ✔ dotenv يُحمَّل فقط خارج بيئة الإنتاج
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { getDB } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────────
// ✔ cors()           — function call, not reference
// ✔ express.json()   — function call, not reference
// ✔ express.urlencoded({ extended: true }) — function call with options
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ─────────────────────────────────────────────────────────────
// ✔ كل ملف route يُصدَّر Router حقيقي بـ module.exports = router
// ✔ app.use() يستقبل function وليس object
app.use('/api/auth',   require('./routes/auth'));    // Router ✔
app.use('/api/videos', require('./routes/videos')); // Router ✔
app.use('/api/users',  require('./routes/users'));   // Router ✔

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status:  'ok',
    app:     'بصير',
    version: '1.0.0',
    author:  'omar benbouzid dev',
    time:    new Date().toISOString()
  });
});

// ─── 404 — Unknown API routes ────────────────────────────────────────────────
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// ─── SPA Fallback ────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'حجم الملف يتجاوز 500 ميغابايت' });
  res.status(500).json({ error: err.message || 'خطأ في الخادم' });
});

// ─── Start ───────────────────────────────────────────────────────────────────
async function start() {
  try {
    await getDB();

    // ✔ الاستماع على '0.0.0.0' ضروري لـ Render وليس 'localhost'
    app.listen(PORT, '0.0.0.0', () => {
      console.log('╔══════════════════════════════════════╗');
      console.log(`║  Server running on port ${PORT}           ║`);
      console.log(`║  http://localhost:${PORT}/api/health   ║`);
      console.log('║  by omar benbouzid dev               ║');
      console.log('╚══════════════════════════════════════╝');
    });
  } catch (err) {
    console.error('[Fatal] Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
