// server.js — السيرفر الرئيسي لبصير
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { getDB } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/users',  require('./routes/users'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'بصير', version: '1.0.0', time: new Date().toISOString() });
});

// ─── 404 for unknown API routes ───────────────────────────────────────────
app.use('/api/{*path}', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

// ─── Serve frontend for all other routes (SPA) ────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error handler ────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌', err.message);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'حجم الملف يتجاوز 500 ميغابايت' });
  res.status(500).json({ error: err.message || 'خطأ في الخادم' });
});

// ─── Start ────────────────────────────────────────────────────────────────
async function start() {
  try {
    await getDB();
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════╗
║   🎬  بصير — سيرفر يعمل            ║
║   🌐  http://localhost:${PORT}          ║
║   📂  API: http://localhost:${PORT}/api ║
╚══════════════════════════════════════╝
      `);
    });
  } catch (err) {
    console.error('فشل تشغيل السيرفر:', err);
    process.exit(1);
  }
}

start();
