/**
 * database.js — PostgreSQL
 * by omar benbouzid dev
 */

const { Pool } = require('pg');
let pool = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL غير موجود');

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', err => console.error('[DB]', err.message));
  return pool;
}

async function query(sql, params = []) {
  const result = await getPool().query(sql, params);
  return result.rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

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
      )`);

    // video_url و thumbnail_url بدلاً من filename
    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title          TEXT        NOT NULL,
        description    TEXT        DEFAULT '',
        category       TEXT        DEFAULT 'general',
        tags           TEXT        DEFAULT '',
        visibility     TEXT        DEFAULT 'public',
        video_url      TEXT        NOT NULL,
        thumbnail_url  TEXT        DEFAULT '',
        cloudinary_id  TEXT        DEFAULT '',
        views          INTEGER     DEFAULT 0,
        duration       INTEGER     DEFAULT 0,
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        video_id   INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, video_id)
      )`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS saves (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        video_id   INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, video_id)
      )`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id           SERIAL PRIMARY KEY,
        follower_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(follower_id, following_id)
      )`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
        video_id   INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        content    TEXT    NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);

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
