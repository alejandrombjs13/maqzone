-- +goose Up
ALTER TABLE auctions ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE listings ADD COLUMN image_url TEXT NOT NULL DEFAULT '';

UPDATE auctions SET image_url =
  CASE id
    WHEN 1 THEN 'https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1200&q=80'
    WHEN 2 THEN 'https://images.unsplash.com/photo-1503435824048-a799a3a84bf7?auto=format&fit=crop&w=1200&q=80'
    WHEN 3 THEN 'https://images.unsplash.com/photo-1501706362039-c6e80948d8d2?auto=format&fit=crop&w=1200&q=80'
    ELSE 'https://images.unsplash.com/photo-1501706362039-c6e80948d8d2?auto=format&fit=crop&w=1200&q=80'
  END;

UPDATE listings SET image_url =
  CASE id
    WHEN 1 THEN 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80'
    WHEN 2 THEN 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
    WHEN 3 THEN 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80'
    WHEN 4 THEN 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
    ELSE 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
  END;

-- +goose Down
-- SQLite doesn't support DROP COLUMN easily; no-op
