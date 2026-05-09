/**
 * database.js — PostgreSQL
 * by omar benbouzid dev
 *
 * محلياً   : يستخدم DATABASE_URL من .env
 * على Render: يستخدم DATABASE_URL من متغيرات البيئة تلقائياً
 */

const { Pool } = require('pg');

let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL غير موجود — أضفه في متغيرات البيئة');
  }

  pool = new Pool({
    connectionString,
    // مطلوب على Render لأن اتصال PostgreSQL يكون عبر SSL
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected error:', err.message);
  });

  return pool;
}

// تنفيذ استعلام مع باراميترز
async function query(sql, params = []) {
  const client = getPool();
  const result = await client.query(sql, params);
  return result.rows;
}

// تنفيذ استعلام وإرجاع أول صف
async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// تهيئة جداول قاعدة البيانات
async function initDB() {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          SERIAL PRIMARY KEY,
        name        TEXT        NOT NULL,
        handle      TEXT        UNIQUE NOT NULL,
        email       TEXT        UNIQUE NOT NULL,
        password    TEXT        NOT NULL,
        bio         TEXT        DEFAULT '',
        location    TEXT        DEFAULT '',
        avatar_url  TEXT        DEFAULT '',
        verified    BOOLEAN     DEFAULT false,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       TEXT        NOT NULL,
        description TEXT        DEFAULT '',
        category    TEXT        DEFAULT 'general',
        tags        TEXT        DEFAULT '',
        visibility  TEXT        DEFAULT 'public',
        filename    TEXT        NOT NULL,
        thumbnail   TEXT        DEFAULT '',
        views       INTEGER     DEFAULT 0,
        duration    INTEGER     DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER     NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        video_id   INTEGER     NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, video_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS saves (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER     NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        video_id   INTEGER     NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, video_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id           SERIAL PRIMARY KEY,
        follower_id  INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(follower_id, following_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER     NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        video_id   INTEGER     NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        content    TEXT        NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('[DB] Tables ready ✅');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { query, queryOne, initDB };
