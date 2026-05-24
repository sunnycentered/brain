const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function initDb() {
  const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'public_insta.db');
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(dbPath);

  // Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS instagram_users (
      id TEXT PRIMARY KEY,
      username TEXT,
      full_name TEXT,
      access_token TEXT,
      token_expires_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      caption TEXT,
      media_url TEXT,
      permalink TEXT,
      timestamp TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      text TEXT,
      username TEXT,
      user_id TEXT,
      timestamp TEXT,
      raw_json TEXT
    );

    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      post_id TEXT,
      user_id TEXT,
      username TEXT,
      timestamp TEXT
    );

    CREATE TABLE IF NOT EXISTS keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT UNIQUE,
      score REAL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      created_at INTEGER,
      plan_json TEXT
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      prompt_text TEXT,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      created_at INTEGER,
      report_json TEXT
    );
  `);

  return db;
}

module.exports = initDb;

