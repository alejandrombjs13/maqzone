-- +goose Up
CREATE TABLE IF NOT EXISTS user_likes (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    seen_status TEXT NOT NULL DEFAULT 'active',
    seen_price  INTEGER NOT NULL DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, listing_id)
);

-- +goose Down
DROP TABLE IF EXISTS user_likes;
