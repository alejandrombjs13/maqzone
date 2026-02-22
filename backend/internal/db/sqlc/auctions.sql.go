package db

import "context"

const auctionColumns = `id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
       start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible`

func scanAuction(row interface{ Scan(dest ...any) error }, i *Auction) error {
	return row.Scan(
		&i.ID,
		&i.Title,
		&i.Description,
		&i.Location,
		&i.CurrentBid,
		&i.ReservePrice,
		&i.Status,
		&i.EndTime,
		&i.ImageURL,
		&i.CreatedAt,
		&i.StartTime,
		&i.SaleMode,
		&i.FixedPrice,
		&i.MinBidIncrement,
		&i.BuyerPremiumPct,
		&i.HighestBidderID,
		&i.AutoExtendMinutes,
		&i.AutoExtendWindowMinutes,
		&i.PriceVisible,
	)
}

const listActiveAuctions = `
SELECT id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
       start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible
FROM auctions
WHERE status = 'active'
ORDER BY datetime(end_time) ASC
LIMIT ?;
`

func (q *Queries) ListActiveAuctions(ctx context.Context, limit int64) ([]Auction, error) {
	rows, err := q.db.QueryContext(ctx, listActiveAuctions, limit)
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
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}

const getAuction = `
SELECT id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
       start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
       auto_extend_minutes, auto_extend_window_minutes, price_visible
FROM auctions
WHERE id = ?;
`

func (q *Queries) GetAuction(ctx context.Context, id int64) (Auction, error) {
	row := q.db.QueryRowContext(ctx, getAuction, id)
	var i Auction
	err := scanAuction(row, &i)
	return i, err
}

const createAuction = `
INSERT INTO auctions (title, description, location, current_bid, reserve_price, status, end_time, image_url,
                      start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct,
                      auto_extend_minutes, auto_extend_window_minutes, price_visible)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, title, description, location, current_bid, reserve_price, status, end_time, image_url, created_at,
          start_time, sale_mode, fixed_price, min_bid_increment, buyer_premium_pct, highest_bidder_id,
          auto_extend_minutes, auto_extend_window_minutes, price_visible;
`

func (q *Queries) CreateAuction(ctx context.Context, arg CreateAuctionParams) (Auction, error) {
	row := q.db.QueryRowContext(ctx, createAuction,
		arg.Title,
		arg.Description,
		arg.Location,
		arg.CurrentBid,
		arg.ReservePrice,
		arg.Status,
		arg.EndTime,
		arg.ImageURL,
		arg.StartTime,
		arg.SaleMode,
		arg.FixedPrice,
		arg.MinBidIncrement,
		arg.BuyerPremiumPct,
		arg.AutoExtendMinutes,
		arg.AutoExtendWindowMinutes,
		arg.PriceVisible,
	)
	var i Auction
	err := scanAuction(row, &i)
	return i, err
}

const updateAuction = `
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
`

func (q *Queries) UpdateAuction(ctx context.Context, arg UpdateAuctionParams) (Auction, error) {
	row := q.db.QueryRowContext(ctx, updateAuction,
		arg.Title,
		arg.Description,
		arg.Location,
		arg.CurrentBid,
		arg.ReservePrice,
		arg.Status,
		arg.EndTime,
		arg.ImageURL,
		arg.StartTime,
		arg.SaleMode,
		arg.FixedPrice,
		arg.MinBidIncrement,
		arg.BuyerPremiumPct,
		arg.AutoExtendMinutes,
		arg.AutoExtendWindowMinutes,
		arg.PriceVisible,
		arg.ID,
	)
	var i Auction
	err := scanAuction(row, &i)
	return i, err
}

const deleteAuction = `
DELETE FROM auctions WHERE id = ?;
`

func (q *Queries) DeleteAuction(ctx context.Context, id int64) error {
	_, err := q.db.ExecContext(ctx, deleteAuction, id)
	return err
}
