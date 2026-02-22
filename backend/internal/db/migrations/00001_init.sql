-- +goose Up
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS auctions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  current_bid INTEGER NOT NULL DEFAULT 0,
  reserve_price INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  end_time TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  price INTEGER NOT NULL,
  sale_type TEXT NOT NULL,
  year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS listing_categories (
  listing_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (listing_id, category_id),
  FOREIGN KEY (listing_id) REFERENCES listings (id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

-- +goose Down
DROP TABLE IF EXISTS listing_categories;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS categories;
