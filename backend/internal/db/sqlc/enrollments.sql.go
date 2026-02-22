package db

import "context"

const requestEnrollment = `
INSERT INTO auction_enrollments (auction_id, user_id)
VALUES (?, ?)
RETURNING id, auction_id, user_id, status, created_at;
`

func (q *Queries) RequestEnrollment(ctx context.Context, auctionID int64, userID int64) (AuctionEnrollment, error) {
	row := q.db.QueryRowContext(ctx, requestEnrollment, auctionID, userID)
	var i AuctionEnrollment
	err := row.Scan(&i.ID, &i.AuctionID, &i.UserID, &i.Status, &i.CreatedAt)
	return i, err
}

const getEnrollment = `
SELECT id, auction_id, user_id, status, created_at
FROM auction_enrollments
WHERE auction_id = ? AND user_id = ?;
`

func (q *Queries) GetEnrollment(ctx context.Context, auctionID int64, userID int64) (AuctionEnrollment, error) {
	row := q.db.QueryRowContext(ctx, getEnrollment, auctionID, userID)
	var i AuctionEnrollment
	err := row.Scan(&i.ID, &i.AuctionID, &i.UserID, &i.Status, &i.CreatedAt)
	return i, err
}

const listEnrollmentsForAuction = `
SELECT ae.id, ae.auction_id, ae.user_id, ae.status, ae.created_at,
       u.email, u.business_name, u.guarantee_tier
FROM auction_enrollments ae
JOIN users u ON u.id = ae.user_id
WHERE ae.auction_id = ?
ORDER BY ae.created_at DESC;
`

func (q *Queries) ListEnrollmentsForAuction(ctx context.Context, auctionID int64) ([]EnrollmentWithUser, error) {
	rows, err := q.db.QueryContext(ctx, listEnrollmentsForAuction, auctionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var items []EnrollmentWithUser
	for rows.Next() {
		var i EnrollmentWithUser
		if err := rows.Scan(
			&i.ID, &i.AuctionID, &i.UserID, &i.Status, &i.CreatedAt,
			&i.Email, &i.BusinessName, &i.GuaranteeTier,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	return items, rows.Err()
}

const approveEnrollment = `
UPDATE auction_enrollments SET status = 'approved'
WHERE auction_id = ? AND user_id = ?
RETURNING id, auction_id, user_id, status, created_at;
`

func (q *Queries) ApproveEnrollment(ctx context.Context, auctionID int64, userID int64) (AuctionEnrollment, error) {
	row := q.db.QueryRowContext(ctx, approveEnrollment, auctionID, userID)
	var i AuctionEnrollment
	err := row.Scan(&i.ID, &i.AuctionID, &i.UserID, &i.Status, &i.CreatedAt)
	return i, err
}

const rejectEnrollment = `
UPDATE auction_enrollments SET status = 'rejected'
WHERE auction_id = ? AND user_id = ?
RETURNING id, auction_id, user_id, status, created_at;
`

func (q *Queries) RejectEnrollment(ctx context.Context, auctionID int64, userID int64) (AuctionEnrollment, error) {
	row := q.db.QueryRowContext(ctx, rejectEnrollment, auctionID, userID)
	var i AuctionEnrollment
	err := row.Scan(&i.ID, &i.AuctionID, &i.UserID, &i.Status, &i.CreatedAt)
	return i, err
}
