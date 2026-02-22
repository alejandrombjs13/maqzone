-- name: ListListings :many
SELECT id, title, description, location, price, sale_type, year, status, image_url, created_at
FROM listings
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT ?;

-- name: GetListing :one
SELECT id, title, description, location, price, sale_type, year, status, image_url, created_at
FROM listings
WHERE id = ?;

-- name: CreateListing :one
INSERT INTO listings (title, description, location, price, sale_type, year, status, image_url)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, title, description, location, price, sale_type, year, status, image_url, created_at;

-- name: UpdateListing :one
UPDATE listings
SET title = ?,
    description = ?,
    location = ?,
    price = ?,
    sale_type = ?,
    year = ?,
    status = ?,
    image_url = ?
WHERE id = ?
RETURNING id, title, description, location, price, sale_type, year, status, image_url, created_at;

-- name: DeleteListing :exec
DELETE FROM listings WHERE id = ?;
