/**
 * routes/users.js — الملف الشخصي والمتابعة
 * by omar benbouzid dev
 */

const express = require('express');
const router  = express.Router();
const { query, queryOne }            = require('../database');
const { authRequired, authOptional } = require('../middleware/auth');

// ── GET /api/users/:handle ───────────────────────────────────────────────────
router.get('/:handle', authOptional, async (req, res) => {
  try {
    const handle = req.params.handle.startsWith('@') ? req.params.handle : '@' + req.params.handle;
    const userId = req.user?.id || 0;

    const user = await queryOne(`
      SELECT
        u.id, u.name, u.handle, u.bio, u.location, u.avatar_url, u.verified, u.created_at,
        (SELECT COUNT(*)::int FROM follows WHERE following_id = u.id) AS followers_count,
        (SELECT COUNT(*)::int FROM follows WHERE follower_id  = u.id) AS following_count,
        (SELECT COUNT(*)::int FROM videos  WHERE user_id = u.id AND visibility = 'public') AS videos_count,
        (SELECT COALESCE(SUM(views),0)::int FROM videos WHERE user_id = u.id) AS total_views,
        (SELECT COUNT(*)::int FROM likes l JOIN videos v ON l.video_id = v.id WHERE v.user_id = u.id) AS total_likes,
        EXISTS(SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = u.id) AS is_following
      FROM users u WHERE u.handle = $2
    `, [userId, handle]);

    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    res.json(user);
  } catch (err) {
    console.error('[users/profile]', err.message);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── GET /api/users/:handle/videos ────────────────────────────────────────────
router.get('/:handle/videos', authOptional, async (req, res) => {
  try {
    const handle = req.params.handle.startsWith('@') ? req.params.handle : '@' + req.params.handle;
    const userId = req.user?.id || 0;
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const owner = await queryOne('SELECT id FROM users WHERE handle = $1', [handle]);
    if (!owner) return res.status(404).json({ error: 'المستخدم غير موجود' });

    const videos = await query(`
      SELECT v.id, v.title, v.category, v.filename, v.thumbnail, v.views, v.created_at,
             COUNT(DISTINCT l.id)::int AS likes_count,
             EXISTS(SELECT 1 FROM likes WHERE user_id=$1 AND video_id=v.id) AS is_liked
      FROM videos v
      LEFT JOIN likes l ON l.video_id = v.id
      WHERE v.user_id = $2 AND (v.visibility = 'public' OR v.user_id = $1)
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT $3 OFFSET $4
    `, [userId, owner.id, Number(limit), Number(offset)]);

    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── GET /api/users/me/saved ───────────────────────────────────────────────────
router.get('/me/saved', authRequired, async (req, res) => {
  try {
    const videos = await query(`
      SELECT v.id, v.title, v.category, v.filename, v.thumbnail, v.views,
             u.name AS author_name, u.handle AS author_handle,
             COUNT(DISTINCT l.id)::int AS likes_count
      FROM saves s
      JOIN videos v ON s.video_id = v.id
      JOIN users  u ON v.user_id  = u.id
      LEFT JOIN likes l ON l.video_id = v.id
      WHERE s.user_id = $1
      GROUP BY v.id, u.id, s.created_at
      ORDER BY s.created_at DESC
    `, [req.user.id]);
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── POST /api/users/:id/follow ────────────────────────────────────────────────
router.post('/:id/follow', authRequired, async (req, res) => {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.user.id) return res.status(400).json({ error: 'لا يمكنك متابعة نفسك' });

    const existing = await queryOne('SELECT id FROM follows WHERE follower_id=$1 AND following_id=$2', [req.user.id, targetId]);
    if (existing) {
      await query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2', [req.user.id, targetId]);
    } else {
      await query('INSERT INTO follows (follower_id,following_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.user.id, targetId]);
    }
    const count = await queryOne('SELECT COUNT(*)::int AS n FROM follows WHERE following_id=$1', [targetId]);
    res.json({ following: !existing, followers: count?.n || 0 });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ── PUT /api/users/me/update ──────────────────────────────────────────────────
router.put('/me/update', authRequired, async (req, res) => {
  try {
    const { name, bio, location } = req.body;
    await query(
      'UPDATE users SET name=$1, bio=$2, location=$3 WHERE id=$4',
      [name || req.user.name, bio || '', location || '', req.user.id]
    );
    res.json({ message: 'تم تحديث الملف الشخصي' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
