/**
 * routes/videos.js — رفع وعرض وإدارة الفيديوهات (Cloudinary)
 * by omar benbouzid dev
 */

const express = require('express');
const router  = express.Router();
const { upload, cloudinary }         = require('../middleware/upload');
const { query, queryOne }            = require('../database');
const { authRequired, authOptional } = require('../middleware/auth');

// ── GET /api/videos ──────────────────────────────────────────────────────────
router.get('/', authOptional, async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id || 0;

    const params  = [userId];
    let catFilter = '';
    if (category && category !== 'all') {
      params.push(category);
      catFilter = `AND v.category = $${params.length}`;
    }
    params.push(Number(limit), Number(offset));
    const lIdx = params.length - 1;
    const oIdx = params.length;

    const videos = await query(`
      SELECT
        v.id, v.title, v.description, v.category, v.tags,
        v.video_url, v.thumbnail_url, v.views, v.duration,
        v.created_at, v.visibility,
        u.id AS user_id, u.name AS author_name, u.handle AS author_handle,
        u.avatar_url, u.verified,
        COUNT(DISTINCT l.id)::int  AS likes_count,
        COUNT(DISTINCT s.id)::int  AS saves_count,
        COUNT(DISTINCT c.id)::int  AS comments_count,
        MAX(CASE WHEN l.user_id = $1 THEN 1 ELSE 0 END)::int AS is_liked,
        MAX(CASE WHEN s.user_id = $1 THEN 1 ELSE 0 END)::int AS is_saved
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN likes    l ON l.video_id = v.id
      LEFT JOIN saves    s ON s.video_id = v.id
      LEFT JOIN comments c ON c.video_id = v.id
      WHERE v.visibility = 'public' ${catFilter}
      GROUP BY v.id, u.id
      ORDER BY v.created_at DESC
      LIMIT $${lIdx} OFFSET $${oIdx}
    `, params);

    const countRows = await queryOne(
      `SELECT COUNT(*)::int AS n FROM videos WHERE visibility='public'${category && category !== 'all' ? ' AND category=$1' : ''}`,
      category && category !== 'all' ? [category] : []
    );

    res.json({ videos, total: countRows?.n || 0, page: Number(page) });
  } catch (err) {
    console.error('[videos/feed]', err.message);
    res.status(500).json({ error: 'خطأ في جلب الفيديوهات' });
  }
});

// ── GET /api/videos/trending ─────────────────────────────────────────────────
router.get('/trending', async (req, res) => {
  try {
    const videos = await query(`
      SELECT v.id, v.title, v.category, v.video_url, v.thumbnail_url, v.views,
             u.name AS author_name, u.handle AS author_handle,
             COUNT(DISTINCT l.id)::int AS likes_count
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN likes l ON l.video_id = v.id
      WHERE v.visibility = 'public'
      GROUP BY v.id, u.id
      ORDER BY (v.views + COUNT(DISTINCT l.id) * 10) DESC
      LIMIT 10
    `);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── GET /api/videos/:id ──────────────────────────────────────────────────────
router.get('/:id', authOptional, async (req, res) => {
  try {
    const userId = req.user?.id || 0;
    const video = await queryOne(`
      SELECT v.*, u.name AS author_name, u.handle AS author_handle,
             u.avatar_url, u.bio AS author_bio,
             COUNT(DISTINCT l.id)::int  AS likes_count,
             COUNT(DISTINCT s.id)::int  AS saves_count,
             COUNT(DISTINCT c.id)::int  AS comments_count,
             MAX(CASE WHEN l.user_id = $1 THEN 1 ELSE 0 END)::int AS is_liked,
             MAX(CASE WHEN s.user_id = $1 THEN 1 ELSE 0 END)::int AS is_saved
      FROM videos v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN likes    l ON l.video_id = v.id
      LEFT JOIN saves    s ON s.video_id = v.id
      LEFT JOIN comments c ON c.video_id = v.id
      WHERE v.id = $2
      GROUP BY v.id, u.id
    `, [userId, req.params.id]);

    if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });
    await query('UPDATE videos SET views = views + 1 WHERE id = $1', [req.params.id]);
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── POST /api/videos — رفع على Cloudinary ────────────────────────────────────
router.post('/', authRequired, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'لم يتم رفع أي ملف' });

    const { title, description = '', category = 'general', tags = '', visibility = 'public' } = req.body;
    if (!title) return res.status(400).json({ error: 'العنوان مطلوب' });

    // Cloudinary يُعيد الـ URL تلقائياً
    const videoUrl     = req.file.path;
    const thumbnailUrl = req.file.path.replace('/upload/', '/upload/so_0,w_400,h_600,c_fill,q_auto/').replace(/\.[^.]+$/, '.jpg');
    const publicId     = req.file.filename;

    const video = await queryOne(
      `INSERT INTO videos
        (user_id, title, description, category, tags, visibility, video_url, thumbnail_url, cloudinary_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, title, video_url, thumbnail_url`,
      [req.user.id, title, description, category, tags, visibility, videoUrl, thumbnailUrl, publicId]
    );

    res.status(201).json({ message: 'تم رفع الفيديو بنجاح', video });
  } catch (err) {
    console.error('[upload]', err.message);
    res.status(500).json({ error: 'خطأ أثناء الرفع: ' + err.message });
  }
});

// ── DELETE /api/videos/:id ───────────────────────────────────────────────────
router.delete('/:id', authRequired, async (req, res) => {
  try {
    const video = await queryOne(
      'SELECT * FROM videos WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]
    );
    if (!video) return res.status(403).json({ error: 'غير مصرح' });

    // حذف من Cloudinary
    if (video.cloudinary_id) {
      await cloudinary.uploader.destroy(video.cloudinary_id, { resource_type: 'video' }).catch(() => {});
    }

    await query('DELETE FROM videos WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الفيديو' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── POST /api/videos/:id/like ─────────────────────────────────────────────────
router.post('/:id/like', authRequired, async (req, res) => {
  try {
    const existing = await queryOne(
      'SELECT id FROM likes WHERE user_id=$1 AND video_id=$2',
      [req.user.id, req.params.id]
    );
    if (existing) {
      await query('DELETE FROM likes WHERE user_id=$1 AND video_id=$2', [req.user.id, req.params.id]);
    } else {
      await query('INSERT INTO likes (user_id,video_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
    }
    const count = await queryOne('SELECT COUNT(*)::int AS n FROM likes WHERE video_id=$1', [req.params.id]);
    res.json({ liked: !existing, count: count?.n || 0 });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── POST /api/videos/:id/save ─────────────────────────────────────────────────
router.post('/:id/save', authRequired, async (req, res) => {
  try {
    const existing = await queryOne(
      'SELECT id FROM saves WHERE user_id=$1 AND video_id=$2',
      [req.user.id, req.params.id]
    );
    if (existing) {
      await query('DELETE FROM saves WHERE user_id=$1 AND video_id=$2', [req.user.id, req.params.id]);
    } else {
      await query('INSERT INTO saves (user_id,video_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, req.params.id]);
    }
    res.json({ saved: !existing });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── GET /api/videos/:id/comments ─────────────────────────────────────────────
router.get('/:id/comments', async (req, res) => {
  try {
    const comments = await query(`
      SELECT c.id, c.content, c.created_at, u.name, u.handle, u.avatar_url
      FROM comments c JOIN users u ON c.user_id = u.id
      WHERE c.video_id = $1 ORDER BY c.created_at DESC LIMIT 50
    `, [req.params.id]);
    res.json(comments);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── POST /api/videos/:id/comments ────────────────────────────────────────────
router.post('/:id/comments', authRequired, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'التعليق فارغ' });
    const comment = await queryOne(
      'INSERT INTO comments (user_id,video_id,content) VALUES ($1,$2,$3) RETURNING id, content',
      [req.user.id, req.params.id, content.trim()]
    );
    res.status(201).json({ ...comment, name: req.user.name, handle: req.user.handle });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
