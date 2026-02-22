-- +goose Up
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  business_name TEXT NOT NULL DEFAULT '',
  legal_representative TEXT NOT NULL DEFAULT '',
  rfc TEXT NOT NULL DEFAULT '',
  street_address TEXT NOT NULL DEFAULT '',
  colony TEXT NOT NULL DEFAULT '',
  municipality TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  mobile TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  guarantee_tier TEXT NOT NULL DEFAULT '' CHECK(guarantee_tier IN ('','50k','100k')),
  remaining_opportunities INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- +goose Down
DROP TABLE IF EXISTS users;
