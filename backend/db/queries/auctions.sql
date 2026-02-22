-- name: ListActiveAuctions :many
SELECT id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
       start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible
FROM auctions
WHERE status = 'active'
ORDER BY datetime(end_time) ASC
LIMIT ?;

-- name: GetAuction :one
SELECT id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
       start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible
FROM auctions
WHERE id = ?;

-- name: CreateAuction :one
INSERT INTO auctions (title, description, location, current_bid, reserve_price, status, end_time, image_url,
                      start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct,
                      auto_extend_minutes, auto_extend_window_minutes, price_visible)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
          start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
          auto_extend_minutes, auto_extend_window_minutes, price_visible;

-- name: UpdateAuction :one
UPDATE auctions
SET title = ?,
    description = ?,
    location = ?,
    current_bid = ?,
    reserve_price = ?,
    status = ?,
    end_time = ?,
    image_url = ?,
    start_time = ?,
    sale_mode = ?,
    fixed_price = ?,
    min_bid_increment = ?,
    buyer_premium_pct = ?,
    auto_extend_minutes = ?,
    auto_extend_window_minutes = ?,
    price_visible = ?
WHERE id = ?
RETURNING id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
          start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
          auto_extend_minutes, auto_extend_window_minutes, price_visible;

-- name: DeleteAuction :exec
DELETE FROM auctions WHERE id = ?;

-- name: ListAllAuctions :many
SELECT id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
       start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible
FROM auctions
ORDER BY created_at DESC
LIMIT ?;
