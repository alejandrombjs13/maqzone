-- +goose Up
INSERT OR IGNORE INTO categories (name) VALUES
  ('Maquinaria de construcción'),
  ('Equipo de elevación'),
  ('Transporte pesado'),
  ('Montacargas'),
  ('Generación y energía'),
  ('Equipos industriales');

INSERT INTO auctions (title, description, location, current_bid, reserve_price, status, end_time)
VALUES
  ('Excavadora Komatsu PC210', 'Lote verificado con historial completo y certificados.', 'Saltillo, MX', 58000, 75000, 'active', datetime('now', '+2 hours')),
  ('Grúa Tadano 40T', 'Equipo con mantenimiento reciente, listo para operación.', 'Monterrey, MX', 72500, 90000, 'active', datetime('now', '+1 hours')),
  ('Cargador Cat 950H', 'Activo confiable para proyectos intensivos.', 'Querétaro, MX', 39900, 52000, 'active', datetime('now', '+45 minutes'));

INSERT INTO listings (title, description, location, price, sale_type, year, status)
VALUES
  ('Bulldozer D6T', 'Venta directa con inspección incluida.', 'Tijuana, MX', 110000, 'direct', 2020, 'active'),
  ('Plataforma Genie Z-45', 'Subasta premium con soporte logístico.', 'León, MX', 28700, 'auction', 2018, 'active'),
  ('Retroexcavadora 416F', 'Unidad en excelente estado operativo.', 'Puebla, MX', 34500, 'direct', 2015, 'active'),
  ('Camión Volteo 14m³', 'Ideal para operación minera.', 'Torreón, MX', 21900, 'auction', 2014, 'active');

-- +goose Down
DELETE FROM listing_categories;
DELETE FROM listings;
DELETE FROM auctions;
DELETE FROM categories;
