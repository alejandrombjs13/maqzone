-- +goose Up
-- Fix broken image URLs (404s) with working alternatives
UPDATE auctions SET image_url = 'https://images.unsplash.com/photo-1580901368919-7738efb0f87e?auto=format&fit=crop&w=1200&q=80'
  WHERE image_url LIKE '%photo-1501706362039%';

UPDATE listings SET image_url = 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?auto=format&fit=crop&w=1200&q=80'
  WHERE image_url LIKE '%photo-1489515217757%' AND id > 1;

UPDATE listings SET image_url = 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=80'
  WHERE image_url LIKE '%photo-1500530855697%';

UPDATE listings SET image_url = 'https://images.unsplash.com/photo-1590496794008-383c8070b257?auto=format&fit=crop&w=1200&q=80'
  WHERE image_url LIKE '%photo-1558618666%';

-- +goose Down
-- no-op
