-- +goose Up
-- Creates a default admin user (email: admin@maqzone.mx, password: Admin123!)
-- Password hash for "Admin123!" with bcrypt cost 12
INSERT OR IGNORE INTO users (email, password_hash, business_name, status, is_admin, must_change_password, guarantee_tier, remaining_opportunities)
VALUES ('admin@maqzone.mx', '$2a$12$J87F4.gqmJNlTJrlyo1ig.G4n5XYezVqfAwzXVc6uLgpbOgZ9d45m', 'MAQZONE Admin', 'approved', 1, 1, '100k', 999);

-- +goose Down
DELETE FROM users WHERE email = 'admin@maqzone.mx';
