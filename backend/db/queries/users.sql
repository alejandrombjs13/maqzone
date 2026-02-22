-- name: CreateUser :one
INSERT INTO users (email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;

-- name: GetUserByEmail :one
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
WHERE email = ?;

-- name: GetUserByID :one
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
WHERE id = ?;

-- name: ListUsers :many
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
ORDER BY created_at DESC
LIMIT ?;

-- name: ListUsersByStatus :many
SELECT id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at
FROM users
WHERE status = ?
ORDER BY created_at DESC
LIMIT ?;

-- name: ApproveUser :one
UPDATE users
SET status = 'approved', guarantee_tier = ?, remaining_opportunities = 5
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;

-- name: RejectUser :one
UPDATE users
SET status = 'rejected', rejection_reason = ?
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;

-- name: UpdateUserPassword :one
UPDATE users
SET password_hash = ?, must_change_password = ?
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;

-- name: UpdateUserAdmin :one
UPDATE users
SET is_admin = ?
WHERE id = ?
RETURNING id, email, password_hash, business_name, legal_representative, rfc, street_address, colony, municipality, postal_code, city, state, phone, mobile, status, guarantee_tier, remaining_opportunities, rejection_reason, must_change_password, is_admin, created_at;

-- name: DecrementOpportunities :exec
UPDATE users
SET remaining_opportunities = remaining_opportunities - 1
WHERE id = ? AND remaining_opportunities > 0;

-- name: SetUserOpportunities :exec
UPDATE users SET remaining_opportunities = ? WHERE id = ?;
