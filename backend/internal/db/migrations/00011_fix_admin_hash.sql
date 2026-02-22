-- +goose Up
-- Fix incorrect bcrypt hash for admin@maqzone.mx (hash in 00010 did not match Admin123!)
UPDATE users
SET password_hash = '$2a$12$J87F4.gqmJNlTJrlyo1ig.G4n5XYezVqfAwzXVc6uLgpbOgZ9d45m'
WHERE email = 'admin@maqzone.mx'
  AND password_hash = '$2a$12$LJ3m4ys4L1RBSnB0hbk9/.2qJ0xIPRj0Z5Lv5y6IjwCnFAb/k.eYO';

-- +goose Down
-- No rollback needed (old hash was broken anyway)
