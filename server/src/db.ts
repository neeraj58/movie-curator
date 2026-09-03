import Database from 'better-sqlite3';

export const db = new Database('movies.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by INTEGER NOT NULL DEFAULT 1 REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS movies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    poster_path TEXT,
    release_date TEXT,
    runtime INTEGER DEFAULT 0,
    vote_average REAL DEFAULT 0,
    genres TEXT DEFAULT '[]',
    user_notes TEXT,
    user_rating INTEGER CHECK (user_rating IS NULL OR (user_rating >= 1 AND user_rating <= 5)),
    tags TEXT DEFAULT '[]',
    watched INTEGER DEFAULT 0,
    UNIQUE (collection_id, tmdb_id)
  );

  -- Seed generic users for multi-user isolation demo
  INSERT OR IGNORE INTO users (id, username, email) VALUES
    (1, 'admin', 'admin@example.com'),
    (2, 'user1', 'user1@example.com'),
    (3, 'user2', 'user2@example.com');
`);

export default db;