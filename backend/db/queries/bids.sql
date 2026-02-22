-- name: PlaceBid :one
INSERT INTO bids (auction_id, user_id, amount)
VALUES (?, ?, ?)
RETURNING id, auction_id, user_id, amount, created_at;

-- name: ListBidsForAuction :many
SELECT id, auction_id, user_id, amount, created_at
FROM bids
WHERE auction_id = ?
ORDER BY amount DESC
LIMIT ?;

-- name: GetHighestBid :one
SELECT id, auction_id, user_id, amount, created_at
FROM bids
WHERE auction_id = ?
ORDER BY amount DESC
LIMIT 1;

-- name: UpdateAuctionBid :exec
UPDATE auctions
SET current_bid = ?, highest_bidder_id = ?
WHERE id = ?;

-- name: ActivateScheduledAuctions :exec
UPDATE auctions
SET status = 'active'
WHERE status = 'scheduled'
  AND start_time != ''
  AND datetime(start_time) <= datetime('now');

-- name: CloseExpiredAuctions :exec
UPDATE auctions
SET status = 'closed'
WHERE status = 'active'
  AND end_time != ''
  AND datetime(end_time) <= datetime('now');

-- name: ListAllAuctions :many
SELECT id, title, description, location, current_bid, reserve_price, status,
       end_time, image_url, created_at, start_time, sale_mode, fixed_price,
       min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible
FROM auctions
ORDER BY created_at DESC
LIMIT ?;

-- name: ExtendAuctionEndTime :exec
UPDATE auctions SET end_time = ? WHERE id = ?;
