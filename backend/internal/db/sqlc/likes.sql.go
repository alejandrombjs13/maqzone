package db

import (
	"context"
	"database/sql"
)

var errNoRows = sql.ErrNoRows

type UserLikeWithListing struct {
	ID            int64  `json:"id"`
	UserID        int64  `json:"user_id"`
	ListingID     int64  `json:"listing_id"`
	SeenStatus    string `json:"seen_status"`
	SeenPrice     int64  `json:"seen_price"`
	CreatedAt     string `json:"created_at"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	Location      string `json:"location"`
	Price         int64  `json:"price"`
	SaleType      string `json:"sale_type"`
	Year          int64  `json:"year"`
	CurrentStatus string `json:"current_status"`
	ImageURL      string `json:"image_url"`
}

type LikeListingParams struct {
	UserID    int64
	ListingID int64
}

type UnlikeListingParams struct {
	UserID    int64
	ListingID int64
}

type IsLikedParams struct {
	UserID    int64
	ListingID int64
}

// Insert the like and capture current status/price from listings.
const likeListing = `
INSERT OR IGNORE INTO user_likes (user_id, listing_id, seen_status, seen_price)
SELECT ?, l.id, l.status, l.price FROM listings l WHERE l.id = ?;
`

// LikeListing inserts a like. Returns (alreadyLiked bool, err).
// Returns sql.ErrNoRows if the listing does not exist.
func (q *Queries) LikeListing(ctx context.Context, arg LikeListingParams) (bool, error) {
	result, err := q.db.ExecContext(ctx, likeListing, arg.UserID, arg.ListingID)
	if err != nil {
		return false, err
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		// Could be already liked (IGNORE) or listing missing — distinguish them.
		var count int64
		if err2 := q.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM listings WHERE id = ?", arg.ListingID).Scan(&count); err2 != nil {
			return false, err2
		}
		if count == 0 {
			return false, errNoRows
		}
		return true, nil // already liked
	}
	return false, nil // newly liked
}

const unlikeListing = `
DELETE FROM user_likes WHERE user_id = ? AND listing_id = ?;
`

func (q *Queries) UnlikeListing(ctx context.Context, arg UnlikeListingParams) error {
	_, err := q.db.ExecContext(ctx, unlikeListing, arg.UserID, arg.ListingID)
	return err
}

const isLiked = `
SELECT COUNT(*) FROM user_likes WHERE user_id = ? AND listing_id = ?;
`

func (q *Queries) IsLiked(ctx context.Context, arg IsLikedParams) (int64, error) {
	row := q.db.QueryRowContext(ctx, isLiked, arg.UserID, arg.ListingID)
	var count int64
	err := row.Scan(&count)
	return count, err
}

const getUserLikes = `
SELECT ul.id, ul.user_id, ul.listing_id, ul.seen_status, ul.seen_price, ul.created_at,
       l.title, l.description, l.location, l.price, l.sale_type, l.year,
       l.status AS current_status, l.image_url
FROM user_likes ul
JOIN listings l ON l.id = ul.listing_id
WHERE ul.user_id = ?
ORDER BY ul.created_at DESC;
`

func (q *Queries) GetUserLikes(ctx context.Context, userID int64) ([]UserLikeWithListing, error) {
	rows, err := q.db.QueryContext(ctx, getUserLikes, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []UserLikeWithListing
	for rows.Next() {
		var i UserLikeWithListing
		if err := rows.Scan(
			&i.ID, &i.UserID, &i.ListingID, &i.SeenStatus, &i.SeenPrice, &i.CreatedAt,
			&i.Title, &i.Description, &i.Location, &i.Price,
			&i.SaleType, &i.Year, &i.CurrentStatus, &i.ImageURL,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

// Update seen_status and seen_price to current listing values, clearing notifications.
const markLikesSeen = `
UPDATE user_likes
SET seen_status = (SELECT status FROM listings WHERE id = listing_id),
    seen_price  = (SELECT price  FROM listings WHERE id = listing_id)
WHERE user_id = ?;
`

func (q *Queries) MarkLikesSeen(ctx context.Context, userID int64) error {
	_, err := q.db.ExecContext(ctx, markLikesSeen, userID)
	return err
}
