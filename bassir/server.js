// server.js — السيرفر الرئيسي لبصير
// dotenv فقط في بيئة التطوير — Render يحقن المتغيرات تلقائياً
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { getDB } = require('./database');

const app  = express();
// Render يضبط PORT — يجب الاستماع عليه حتى يكتشف البورت
const PORT = process.env.PORT || 3000;

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/users',  require('./routes/users'));

// Health check — Render يستخدمه للتحقق أن السيرفر يعمل
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'بصير', version: '1.0.0', time: new Date().toISOString() });
});

// ─── 404 for unknown API routes ─────────────────────────────────────────────
app.use('/api/{*path}', (req, res) => res.status(404).json({ error: 'المسار غير موجود' }));

// ─── Serve frontend (SPA) ───────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error handler ──────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ error: 'حجم الملف يتجاوز 500 ميغابايت' });
  res.status(500).json({ error: err.message || 'خطأ في الخادم' });
});

// ─── Start ──────────────────────────────────────────────────────────────────
async function start() {
  try {
    await getDB();
    // الاستماع على 0.0.0.0 ضروري على Render وليس localhost
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
