package db

import "context"

type Bid struct {
	ID        int64  `json:"id" db:"id"`
	AuctionID int64  `json:"auction_id" db:"auction_id"`
	UserID    int64  `json:"-" db:"user_id"`
	Amount    int64  `json:"amount" db:"amount"`
	CreatedAt string `json:"created_at" db:"created_at"`
}

type PlaceBidParams struct {
	AuctionID int64
	UserID    int64
	Amount    int64
}

const placeBid = `
INSERT INTO bids (auction_id, user_id, amount)
VALUES (?, ?, ?)
RETURNING id, auction_id, user_id, amount, created_at;
`

func (q *Queries) PlaceBid(ctx context.Context, arg PlaceBidParams) (Bid, error) {
	row := q.db.QueryRowContext(ctx, placeBid, arg.AuctionID, arg.UserID, arg.Amount)
	var i Bid
	err := row.Scan(&i.ID, &i.AuctionID, &i.UserID, &i.Amount, &i.CreatedAt)
	return i, err
}

const listBidsForAuction = `
SELECT id, auction_id, user_id, amount, created_at
FROM bids
WHERE auction_id = ?
ORDER BY amount DESC
LIMIT ?;
`

func (q *Queries) ListBidsForAuction(ctx context.Context, auctionID int64, limit int64) ([]Bid, error) {
	rows, err := q.db.QueryContext(ctx, listBidsForAuction, auctionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Bid
	for rows.Next() {
		var i Bid
		if err := rows.Scan(&i.ID, &i.AuctionID, &i.UserID, &i.Amount, &i.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const getHighestBid = `
SELECT id, auction_id, user_id, amount, created_at
FROM bids
WHERE auction_id = ?
ORDER BY amount DESC
LIMIT 1;
`

func (q *Queries) GetHighestBid(ctx context.Context, auctionID int64) (Bid, error) {
	row := q.db.QueryRowContext(ctx, getHighestBid, auctionID)
	var i Bid
	err := row.Scan(&i.ID, &i.AuctionID, &i.UserID, &i.Amount, &i.CreatedAt)
	return i, err
}

const updateAuctionBid = `
UPDATE auctions SET current_bid = ?, highest_bidder_id = ? WHERE id = ?;
`

func (q *Queries) UpdateAuctionBid(ctx context.Context, currentBid int64, highestBidderID int64, id int64) error {
	_, err := q.db.ExecContext(ctx, updateAuctionBid, currentBid, highestBidderID, id)
	return err
}

const activateScheduledAuctions = `
UPDATE auctions SET status = 'active'
WHERE status = 'scheduled' AND start_time != '' AND datetime(start_time) <= datetime('now');
`

func (q *Queries) ActivateScheduledAuctions(ctx context.Context) error {
	_, err := q.db.ExecContext(ctx, activateScheduledAuctions)
	return err
}

const closeExpiredAuctions = `
UPDATE auctions SET status = 'closed'
WHERE status = 'active' AND end_time != '' AND datetime(end_time) <= datetime('now');
`

func (q *Queries) CloseExpiredAuctions(ctx context.Context) error {
	_, err := q.db.ExecContext(ctx, closeExpiredAuctions)
	return err
}

const listAllAuctions = `
SELECT id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
       start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible
FROM auctions
ORDER BY created_at DESC
LIMIT ?;
`

func (q *Queries) ListAllAuctions(ctx context.Context, limit int64) ([]Auction, error) {
	rows, err := q.db.QueryContext(ctx, listAllAuctions, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []Auction
	for rows.Next() {
		var i Auction
		if err := scanAuction(rows, &i); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const extendAuctionEndTime = `
UPDATE auctions SET end_time = ? WHERE id = ?;
`

func (q *Queries) ExtendAuctionEndTime(ctx context.Context, endTime string, id int64) error {
	_, err := q.db.ExecContext(ctx, extendAuctionEndTime, endTime, id)
	return err
}
