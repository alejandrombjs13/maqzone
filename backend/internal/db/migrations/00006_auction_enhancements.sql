-- +goose Up
ALTER TABLE auctions ADD COLUMN start_time TEXT NOT NULL DEFAULT '';
ALTER TABLE auctions ADD COLUMN sale_mode TEXT NOT NULL DEFAULT 'auction' CHECK(sale_mode IN ('auction','fixed'));
ALTER TABLE auctions ADD COLUMN fixed_price INTEGER NOT NULL DEFAULT 0;
ALTER TABLE auctions ADD COLUMN min_bid_increment INTEGER NOT NULL DEFAULT 1000;
ALTER TABLE auctions ADD COLUMN buyer_premium_pct INTEGER NOT NULL DEFAULT 14;
ALTER TABLE auctions ADD COLUMN highest_bidder_id INTEGER NOT NULL DEFAULT 0;

CREATE TABLE bids (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auction_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (auction_id) REFERENCES auctions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_bids_auction ON bids(auction_id);

-- +goose Down
DROP INDEX IF EXISTS idx_bids_auction;
DROP TABLE IF EXISTS bids;
