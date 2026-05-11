/**
 * ╔══════════════════════════════════════════════════════╗
 * ║           بصير — Visual Feed Platform               ║
 * ║           Express 5 + PostgreSQL                     ║
 * ║                                                      ║
 * ║   by omar benbouzid dev                              ║
 * ╚══════════════════════════════════════════════════════╝
 */

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { initDB } = require('./database');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ──────────────────────────────────────────────────────────────────
const authRoutes   = require('./routes/auth');
const videosRoutes = require('./routes/videos');
const usersRoutes  = require('./routes/users');

app.use('/api/auth',   authRoutes);
app.use('/api/videos', videosRoutes);
app.use('/api/users',  usersRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'بصير', version: '1.0.0', author: 'omar benbouzid dev' });
});

// ─── 404 API ──────────────────────────────────────────────────────────────────
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ error: 'المسار غير موجود' });
});

// ─── SPA fallback ─────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'حجم الملف يتجاوز 500 ميغابايت' });
  res.status(500).json({ error: err.message || 'خطأ في الخادم' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
async function start() {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[بصير] Server running on port ${PORT}`);
      console.log('[بصير] by omar benbouzid dev');
    });
  } catch (err) {
    console.error('[Fatal]', err.message);
    process.exit(1);
  }
}

start();
