ALTER TABLE baroke_places ADD COLUMN latitude REAL
  CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90);
--> statement-breakpoint
ALTER TABLE baroke_places ADD COLUMN longitude REAL
  CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180);
--> statement-breakpoint
ALTER TABLE baroke_places ADD COLUMN coordinate_source_url TEXT;
--> statement-breakpoint
ALTER TABLE baroke_places ADD COLUMN coordinate_checked_at TEXT;
--> statement-breakpoint
UPDATE baroke_places SET latitude = 40.73984, longitude = -73.98513,
  coordinate_source_url = 'https://www.openstreetmap.org/?mlat=40.73984&mlon=-73.98513#map=19/40.73984/-73.98513',
  coordinate_checked_at = '2026-08-30' WHERE id = 'chipotle-125-e-23rd';
--> statement-breakpoint
UPDATE baroke_places SET latitude = 40.74063, longitude = -73.98785,
  coordinate_source_url = 'https://www.openstreetmap.org/?mlat=40.74063&mlon=-73.98785#map=19/40.74063/-73.98785',
  coordinate_checked_at = '2026-08-30' WHERE id = 'mcdonalds-26-e-23rd';
--> statement-breakpoint
UPDATE baroke_places SET latitude = 40.743733, longitude = -73.995326,
  coordinate_source_url = 'https://www.openstreetmap.org/?mlat=40.743733&mlon=-73.995326#map=19/40.743733/-73.995326',
  coordinate_checked_at = '2026-08-30' WHERE id = 'subway-170-w-23rd';
--> statement-breakpoint
UPDATE baroke_places SET latitude = 40.74122, longitude = -73.99009,
  coordinate_source_url = 'https://www.openstreetmap.org/?mlat=40.74122&mlon=-73.99009#map=19/40.74122/-73.99009',
  coordinate_checked_at = '2026-08-30' WHERE id = 'ten-ichi-178-fifth';
--> statement-breakpoint
UPDATE baroke_places SET latitude = 40.7386, longitude = -73.98186,
  coordinate_source_url = 'https://www.openstreetmap.org/?mlat=40.7386&mlon=-73.98186#map=19/40.7386/-73.98186',
  coordinate_checked_at = '2026-08-30' WHERE id = 'que-rico-221-e-23rd';
--> statement-breakpoint
PRAGMA optimize;
