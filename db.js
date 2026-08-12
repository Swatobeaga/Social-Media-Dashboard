const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS connected_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected',
    access_token TEXT,
    refresh_token TEXT,
    external_name TEXT,
    total_subscribers INTEGER,
    new_subscribers INTEGER,
    subscribers_lost INTEGER,
    net_subscribers INTEGER,
    revenue REAL,
    last_synced_at TEXT,
    UNIQUE(user_id, platform),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

module.exports = db;
