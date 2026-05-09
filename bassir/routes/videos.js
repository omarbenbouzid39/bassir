// routes/videos.js — رفع وعرض وإدارة الفيديوهات
const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const { query, run }             = require('../database');
const { authRequired, authOptional } = require('../middleware/auth');

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `vid_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowed = ['video/mp4','video/quicktime','video/webm','video/avi','image/jpeg','image/png','image/gif'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('نوع الملف غير مدعوم'));
  }
});

// ─── GET /api/videos — جلب خلاصة الفيديوهات ───────────────────────────────
router.get('/', authOptional, (req, res) => {
  const { category, page = 1, limit = 10 } = req.query;
  const offset  = (page - 1) * limit;
  const userId  = req.user?.id || 0;

  let sql = `
    SELECT
      v.id, v.title, v.description, v.category, v.tags,
      v.filename, v.thumbnail, v.views, v.duration, v.created_at, v.visibility,
      u.id as user_id, u.name as author_name, u.handle as author_handle,
      u.avatar_url, u.verified,
      COUNT(DISTINCT l.id) as likes_count,
      COUNT(DISTINCT s.id) as saves_count,
      COUNT(DISTINCT c.id) as comments_count,
      MAX(CASE WHEN l.user_id = ${userId} THEN 1 ELSE 0 END) as is_liked,
      MAX(CASE WHEN s.user_id = ${userId} THEN 1 ELSE 0 END) as is_saved
    FROM videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN likes l ON l.video_id = v.id
    LEFT JOIN saves s ON s.video_id = v.id
    LEFT JOIN comments c ON c.video_id = v.id
    WHERE v.visibility = 'public'
  `;
  const params = [];
  if (category && category !== 'all') {
    sql += ' AND v.category = ?';
    params.push(category);
  }
  sql += ` GROUP BY v.id ORDER BY v.created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));

  const videos = query(sql, params);
  const total  = query('SELECT COUNT(*) as n FROM videos WHERE visibility = "public"' + (category && category !== 'all' ? ' AND category = ?' : ''), category && category !== 'all' ? [category] : []);

  res.json({ videos, total: total[0]?.n || 0, page: Number(page) });
});

// ─── GET /api/videos/trending ──────────────────────────────────────────────
router.get('/trending', (req, res) => {
  const videos = query(`
    SELECT v.id, v.title, v.category, v.filename, v.thumbnail, v.views,
           u.name as author_name, u.handle as author_handle,
           COUNT(DISTINCT l.id) as likes_count
    FROM videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN likes l ON l.video_id = v.id
    WHERE v.visibility = 'public'
    GROUP BY v.id
    ORDER BY (v.views + COUNT(DISTINCT l.id) * 10) DESC
    LIMIT 10
  `);
  res.json(videos);
});

// ─── GET /api/videos/:id ───────────────────────────────────────────────────
router.get('/:id', authOptional, (req, res) => {
  const userId = req.user?.id || 0;
  const videos = query(`
    SELECT v.*, u.name as author_name, u.handle as author_handle, u.avatar_url, u.bio as author_bio,
           COUNT(DISTINCT l.id) as likes_count,
           COUNT(DISTINCT s.id) as saves_count,
           COUNT(DISTINCT c.id) as comments_count,
           MAX(CASE WHEN l.user_id = ${userId} THEN 1 ELSE 0 END) as is_liked,
           MAX(CASE WHEN s.user_id = ${userId} THEN 1 ELSE 0 END) as is_saved,
           (SELECT COUNT(*) FROM follows WHERE following_id = v.user_id) as author_followers
    FROM videos v
    JOIN users u ON v.user_id = u.id
    LEFT JOIN likes l ON l.video_id = v.id
    LEFT JOIN saves s ON s.video_id = v.id
    LEFT JOIN comments c ON c.video_id = v.id
    WHERE v.id = ?
    GROUP BY v.id
  `, [req.params.id]);

  if (!videos.length) return res.status(404).json({ error: 'الفيديو غير موجود' });

  // Increment views
  run('UPDATE videos SET views = views + 1 WHERE id = ?', [req.params.id]);

  res.json(videos[0]);
});

// ─── POST /api/videos — رفع فيديو ─────────────────────────────────────────
router.post('/', authRequired, upload.single('video'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    const { title, description = '', category = 'general', tags = '', visibility = 'public' } = req.body;
    if (!title) return res.status(400).json({ error: 'العنوان مطلوب' });

    const result = run(
      'INSERT INTO videos (user_id, title, description, category, tags, visibility, filename) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, category, tags, visibility, req.file.filename]
    );

    res.status(201).json({
      message: 'تم رفع الفيديو بنجاح',
      video: { id: result.lastID, title, filename: req.file.filename }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ أثناء الرفع' });
  }
});

// ─── DELETE /api/videos/:id ────────────────────────────────────────────────
router.delete('/:id', authRequired, (req, res) => {
  const videos = query('SELECT * FROM videos WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!videos.length) return res.status(403).json({ error: 'غير مصرح' });

  // Delete file
  const filePath = path.join(__dirname, '../uploads', videos[0].filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  run('DELETE FROM videos WHERE id = ?', [req.params.id]);
  run('DELETE FROM likes WHERE video_id = ?', [req.params.id]);
  run('DELETE FROM saves WHERE video_id = ?', [req.params.id]);
  run('DELETE FROM comments WHERE video_id = ?', [req.params.id]);

  res.json({ message: 'تم حذف الفيديو' });
});

// ─── POST /api/videos/:id/like ─────────────────────────────────────────────
router.post('/:id/like', authRequired, (req, res) => {
  const existing = query('SELECT id FROM likes WHERE user_id = ? AND video_id = ?', [req.user.id, req.params.id]);
  if (existing.length) {
    run('DELETE FROM likes WHERE user_id = ? AND video_id = ?', [req.user.id, req.params.id]);
    const count = query('SELECT COUNT(*) as n FROM likes WHERE video_id = ?', [req.params.id]);
    return res.json({ liked: false, count: count[0].n });
  }
  run('INSERT INTO likes (user_id, video_id) VALUES (?, ?)', [req.user.id, req.params.id]);
  const count = query('SELECT COUNT(*) as n FROM likes WHERE video_id = ?', [req.params.id]);
  res.json({ liked: true, count: count[0].n });
});

// ─── POST /api/videos/:id/save ─────────────────────────────────────────────
router.post('/:id/save', authRequired, (req, res) => {
  const existing = query('SELECT id FROM saves WHERE user_id = ? AND video_id = ?', [req.user.id, req.params.id]);
  if (existing.length) {
    run('DELETE FROM saves WHERE user_id = ? AND video_id = ?', [req.user.id, req.params.id]);
    return res.json({ saved: false });
  }
  run('INSERT INTO saves (user_id, video_id) VALUES (?, ?)', [req.user.id, req.params.id]);
  res.json({ saved: true });
});

// ─── GET /api/videos/:id/comments ─────────────────────────────────────────
router.get('/:id/comments', (req, res) => {
  const comments = query(`
    SELECT c.id, c.content, c.created_at, u.name, u.handle, u.avatar_url
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.video_id = ? ORDER BY c.created_at DESC LIMIT 50
  `, [req.params.id]);
  res.json(comments);
});

// ─── POST /api/videos/:id/comments ────────────────────────────────────────
router.post('/:id/comments', authRequired, (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'التعليق فارغ' });
  const result = run(
    'INSERT INTO comments (user_id, video_id, content) VALUES (?, ?, ?)',
    [req.user.id, req.params.id, content.trim()]
  );
  res.status(201).json({ id: result.lastID, content: content.trim(), name: req.user.name, handle: req.user.handle });
});

module.exports = router;
