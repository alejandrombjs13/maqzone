-- name: RequestEnrollment :one
INSERT INTO auction_enrollments (auction_id, user_id)
VALUES (?, ?)
RETURNING id, auction_id, user_id, status, created_at;

-- name: GetEnrollment :one
SELECT id, auction_id, user_id, status, created_at
FROM auction_enrollments
WHERE auction_id = ? AND user_id = ?;

-- name: ListEnrollmentsForAuction :many
SELECT ae.id, ae.auction_id, ae.user_id, ae.status, ae.created_at,
       u.email, u.business_name, u.guarantee_tier
FROM auction_enrollments ae
JOIN users u ON u.id = ae.user_id
WHERE ae.auction_id = ?
ORDER BY ae.created_at DESC;

-- name: ApproveEnrollment :one
UPDATE auction_enrollments SET status = 'approved'
WHERE auction_id = ? AND user_id = ?
RETURNING id, auction_id, user_id, status, created_at;

-- name: RejectEnrollment :one
UPDATE auction_enrollments SET status = 'rejected'
WHERE auction_id = ? AND user_id = ?
RETURNING id, auction_id, user_id, status, created_at;
