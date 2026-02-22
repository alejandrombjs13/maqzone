package db

import "context"

const listListings = `
SELECT id, title, description, location, price, sale_type, year, status, image_url, created_at
FROM listings
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT ?;
`

func (q *Queries) ListListings(ctx context.Context, limit int64) ([]Listing, error) {
  rows, err := q.db.QueryContext(ctx, listListings, limit)
  if err != nil {
    return nil, err
  }
  defer rows.Close()
  var items []Listing
  for rows.Next() {
    var i Listing
    if err := rows.Scan(
      &i.ID,
      &i.Title,
      &i.Description,
      &i.Location,
      &i.Price,
      &i.SaleType,
      &i.Year,
      &i.Status,
      &i.ImageURL,
      &i.CreatedAt,
    ); err != nil {
      return nil, err
    }
    items = append(items, i)
  }
  if err := rows.Err(); err != nil {
    return nil, err
  }
  return items, nil
}

const getListing = `
SELECT id, title, description, location, price, sale_type, year, status, image_url, created_at
FROM listings
WHERE id = ?;
`

func (q *Queries) GetListing(ctx context.Context, id int64) (Listing, error) {
  row := q.db.QueryRowContext(ctx, getListing, id)
  var i Listing
  err := row.Scan(
    &i.ID,
    &i.Title,
    &i.Description,
    &i.Location,
    &i.Price,
    &i.SaleType,
    &i.Year,
    &i.Status,
    &i.ImageURL,
    &i.CreatedAt,
  )
  return i, err
}

const createListing = `
INSERT INTO listings (title, description, location, price, sale_type, year, status, image_url)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
RETURNING id, title, description, location, price, sale_type, year, status, image_url, created_at;
`

func (q *Queries) CreateListing(ctx context.Context, arg CreateListingParams) (Listing, error) {
  row := q.db.QueryRowContext(ctx, createListing,
    arg.Title,
    arg.Description,
    arg.Location,
    arg.Price,
    arg.SaleType,
    arg.Year,
    arg.Status,
    arg.ImageURL,
  )
  var i Listing
  err := row.Scan(
    &i.ID,
    &i.Title,
    &i.Description,
    &i.Location,
    &i.Price,
    &i.SaleType,
    &i.Year,
    &i.Status,
    &i.ImageURL,
    &i.CreatedAt,
  )
  return i, err
}

const updateListing = `
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
`

func (q *Queries) UpdateListing(ctx context.Context, arg UpdateListingParams) (Listing, error) {
  row := q.db.QueryRowContext(ctx, updateListing,
    arg.Title,
    arg.Description,
    arg.Location,
    arg.Price,
    arg.SaleType,
    arg.Year,
    arg.Status,
    arg.ImageURL,
    arg.ID,
  )
  var i Listing
  err := row.Scan(
    &i.ID,
    &i.Title,
    &i.Description,
    &i.Location,
    &i.Price,
    &i.SaleType,
    &i.Year,
    &i.Status,
    &i.ImageURL,
    &i.CreatedAt,
  )
  return i, err
}

const deleteListing = `
DELETE FROM listings WHERE id = ?;
`

func (q *Queries) DeleteListing(ctx context.Context, id int64) error {
  _, err := q.db.ExecContext(ctx, deleteListing, id)
  return err
}
