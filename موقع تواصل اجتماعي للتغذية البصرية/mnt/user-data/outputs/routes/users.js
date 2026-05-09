// routes/users.js — الملف الشخصي والمتابعة
const router = require('express').Router();
const { query, run }             = require('../database');
const { authRequired, authOptional } = require('../middleware/auth');

// GET /api/users/:handle — ملف المستخدم
router.get('/:handle', authOptional, (req, res) => {
  const handle  = req.params.handle.startsWith('@') ? req.params.handle : '@' + req.params.handle;
  const userId  = req.user?.id || 0;

  const users = query(`
    SELECT u.id, u.name, u.handle, u.bio, u.location, u.avatar_url, u.verified, u.created_at,
      (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
      (SELECT COUNT(*) FROM follows WHERE follower_id  = u.id) as following_count,
      (SELECT COUNT(*) FROM videos  WHERE user_id      = u.id AND visibility = 'public') as videos_count,
      (SELECT COALESCE(SUM(views), 0) FROM videos WHERE user_id = u.id) as total_views,
      (SELECT COUNT(*) FROM likes l JOIN videos v ON l.video_id = v.id WHERE v.user_id = u.id) as total_likes,
      MAX(CASE WHEN f.follower_id = ${userId} THEN 1 ELSE 0 END) as is_following
    FROM users u
    LEFT JOIN follows f ON f.following_id = u.id AND f.follower_id = ${userId}
    WHERE u.handle = ?
    GROUP BY u.id
  `, [handle]);

  if (!users.length) return res.status(404).json({ error: 'المستخدم غير موجود' });
  res.json(users[0]);
});

// GET /api/users/:handle/videos
router.get('/:handle/videos', authOptional, (req, res) => {
  const handle = req.params.handle.startsWith('@') ? req.params.handle : '@' + req.params.handle;
  const userId = req.user?.id || 0;
  const { page = 1, limit = 12 } = req.query;
  const offset = (page - 1) * limit;

  const users = query('SELECT id FROM users WHERE handle = ?', [handle]);
  if (!users.length) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const videos = query(`
    SELECT v.id, v.title, v.category, v.filename, v.thumbnail, v.views, v.created_at,
           COUNT(DISTINCT l.id) as likes_count,
           MAX(CASE WHEN l.user_id = ${userId} THEN 1 ELSE 0 END) as is_liked
    FROM videos v
    LEFT JOIN likes l ON l.video_id = v.id
    WHERE v.user_id = ? AND (v.visibility = 'public' OR v.user_id = ${userId})
    GROUP BY v.id
    ORDER BY v.created_at DESC
    LIMIT ? OFFSET ?
  `, [users[0].id, Number(limit), Number(offset)]);

  res.json(videos);
});

// GET /api/users/:handle/saved
router.get('/:handle/saved', authRequired, (req, res) => {
  const videos = query(`
    SELECT v.id, v.title, v.category, v.filename, v.thumbnail, v.views,
           u.name as author_name, u.handle as author_handle,
           COUNT(DISTINCT l.id) as likes_count
    FROM saves s
    JOIN videos v ON s.video_id = v.id
    JOIN users  u ON v.user_id = u.id
    LEFT JOIN likes l ON l.video_id = v.id
    WHERE s.user_id = ?
    GROUP BY v.id
    ORDER BY s.created_at DESC
  `, [req.user.id]);
  res.json(videos);
});

// POST /api/users/:id/follow
router.post('/:id/follow', authRequired, (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.user.id) return res.status(400).json({ error: 'لا يمكنك متابعة نفسك' });

  const existing = query('SELECT id FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId]);
  if (existing.length) {
    run('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [req.user.id, targetId]);
    const count = query('SELECT COUNT(*) as n FROM follows WHERE following_id = ?', [targetId]);
    return res.json({ following: false, followers: count[0].n });
  }
  run('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [req.user.id, targetId]);
  const count = query('SELECT COUNT(*) as n FROM follows WHERE following_id = ?', [targetId]);
  res.json({ following: true, followers: count[0].n });
});

// PUT /api/users/me — تحديث الملف الشخصي
router.put('/me/update', authRequired, (req, res) => {
  const { name, bio, location } = req.body;
  run('UPDATE users SET name = ?, bio = ?, location = ? WHERE id = ?',
    [name || req.user.name, bio || '', location || '', req.user.id]);
  res.json({ message: 'تم تحديث الملف الشخصي' });
});

module.exports = router;
