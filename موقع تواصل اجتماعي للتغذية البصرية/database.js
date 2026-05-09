// database.js — إعداد قاعدة البيانات
const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');

const DB_PATH = path.join(__dirname, 'baseer.db');

let db = null;

async function getDB() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Load existing DB file if it exists
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Save DB to disk helper
  db.save = () => {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  };

  createTables();
  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      handle      TEXT    UNIQUE NOT NULL,
      email       TEXT    UNIQUE NOT NULL,
      password    TEXT    NOT NULL,
      bio         TEXT    DEFAULT '',
      location    TEXT    DEFAULT '',
      avatar_url  TEXT    DEFAULT '',
      verified    INTEGER DEFAULT 0,
      created_at  TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL,
      title        TEXT    NOT NULL,
      description  TEXT    DEFAULT '',
      category     TEXT    DEFAULT 'general',
      tags         TEXT    DEFAULT '',
      visibility   TEXT    DEFAULT 'public',
      filename     TEXT    NOT NULL,
      thumbnail    TEXT    DEFAULT '',
      views        INTEGER DEFAULT 0,
      duration     INTEGER DEFAULT 0,
      created_at   TEXT    DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      video_id   INTEGER NOT NULL,
      created_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(user_id, video_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS saves (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      video_id   INTEGER NOT NULL,
      created_at TEXT    DEFAULT (datetime('now')),
      UNIQUE(user_id, video_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS follows (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      follower_id INTEGER NOT NULL,
      following_id INTEGER NOT NULL,
      created_at  TEXT    DEFAULT (datetime('now')),
      UNIQUE(follower_id, following_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      video_id   INTEGER NOT NULL,
      content    TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);

  db.save();
  console.log('✅ قاعدة البيانات جاهزة');
}

// Helper: run query and return rows as objects
function query(sql, params = []) {
  const stmt   = db.prepare(sql);
  const result = [];
  stmt.bind(params);
  while (stmt.step()) {
    result.push(stmt.getAsObject());
  }
  stmt.free();
  return result;
}

// Helper: run insert/update/delete
function run(sql, params = []) {
  db.run(sql, params);
  db.save();
  // Get last insert rowid
  const rows = query('SELECT last_insert_rowid() as id');
  return { lastID: rows[0]?.id };
}

module.exports = { getDB, query, run };
