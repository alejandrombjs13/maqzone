-- +goose Up
ALTER TABLE auctions ADD COLUMN auto_extend_minutes INTEGER NOT NULL DEFAULT 2;
ALTER TABLE auctions ADD COLUMN auto_extend_window_minutes INTEGER NOT NULL DEFAULT 2;
ALTER TABLE auctions ADD COLUMN price_visible INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS auction_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(auction_id, user_id)
);
CREATE INDEX idx_enrollments_auction ON auction_enrollments(auction_id);
CREATE INDEX idx_enrollments_user ON auction_enrollments(user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_enrollments_user;
DROP INDEX IF EXISTS idx_enrollments_auction;
DROP TABLE IF EXISTS auction_enrollments;
