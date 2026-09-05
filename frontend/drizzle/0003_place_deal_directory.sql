DROP INDEX IF EXISTS idx_baroke_places_status_created;
--> statement-breakpoint
DROP INDEX IF EXISTS idx_baroke_places_verified_checked;
--> statement-breakpoint
ALTER TABLE baroke_places RENAME TO baroke_places_legacy;
--> statement-breakpoint
CREATE TABLE baroke_places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  price_min_cents INTEGER CHECK (price_min_cents IS NULL OR price_min_cents > 0),
  price_max_cents INTEGER CHECK (
    price_max_cents IS NULL OR
    (price_min_cents IS NOT NULL AND price_max_cents >= price_min_cents)
  ),
  price_label TEXT NOT NULL,
  address TEXT NOT NULL,
  location_note TEXT NOT NULL,
  student_discount INTEGER NOT NULL DEFAULT 0 CHECK (student_discount IN (0, 1)),
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'needs_review', 'rejected')),
  last_checked_at TEXT,
  check_after TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO baroke_places (
  id, name, meal_name, cuisine, price_min_cents, price_max_cents,
  price_label, address, location_note, student_discount, source_url,
  verification_status, last_checked_at, check_after, created_at
)
SELECT
  id, name, meal_name, cuisine, price_min_cents, price_max_cents,
  CASE
    WHEN price_min_cents = price_max_cents THEN printf('$%.2f', price_min_cents / 100.0)
    ELSE printf('$%.2f–$%.2f', price_min_cents / 100.0, price_max_cents / 100.0)
  END,
  address, location_note, student_discount, source_url,
  verification_status, last_checked_at,
  CASE WHEN last_checked_at IS NULL THEN NULL ELSE date(last_checked_at, '+30 days') END,
  created_at
FROM baroke_places_legacy;
--> statement-breakpoint
DROP TABLE baroke_places_legacy;
--> statement-breakpoint
CREATE INDEX idx_baroke_places_status_created
ON baroke_places (verification_status, created_at DESC);
--> statement-breakpoint
CREATE INDEX idx_baroke_places_verified_checked
ON baroke_places (check_after)
WHERE verification_status = 'verified';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS baroke_place_deals (
  place_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  PRIMARY KEY (place_id, deal_id),
  FOREIGN KEY (place_id) REFERENCES baroke_places(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES baroke_deals(id) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_baroke_place_deals_deal
ON baroke_place_deals (deal_id, place_id);
--> statement-breakpoint
INSERT OR IGNORE INTO baroke_deals VALUES
('ten-ichi-half-price-2026', 'Ten Ichi Mart', '50% off prepared food after 8 PM', 'Remaining sushi, onigiri, bentos, and selected hot food are marked down after 8 PM.', 'Selection is limited and can sell out; confirm the markdown in store before checkout.', 'https://maps.apple.com/place?place-id=IE1CEC9200B3BCB7D', '2026-08-24', NULL, '2026-09-07', 'confirmed'),
('jin-mei-dumplings-2026', 'Jin Mei Dumpling', '15 dumplings for $5', 'Get 15 pan-fried pork and chive dumplings for $5 at the Chinatown counter.', 'Available at 25B Henry Street; item availability can change.', 'https://jinmeidumpling.com/about/', '2026-08-24', NULL, '2026-09-24', 'confirmed'),
('que-rico-lunch-2026', 'Que Rico', '$10 lunch special', 'A filling Dominican lunch plate offered from noon to 3 PM near Baruch.', 'The special was reported by The Ticker; confirm the day’s choices in store.', 'https://theticker.org/17547/arts/arts-amp-style/food-for-thought-with-andres-que-rico-restaurant/', '2026-08-24', NULL, '2026-09-07', 'confirmed');
--> statement-breakpoint
INSERT OR IGNORE INTO baroke_places (
  id, name, meal_name, cuisine, price_min_cents, price_max_cents,
  price_label, address, location_note, student_discount, source_url,
  verification_status, last_checked_at, check_after, created_at
) VALUES
('chipotle-125-e-23rd', 'Chipotle', 'Custom bowls, burritos, and tacos', 'Mexican', NULL, NULL, 'MENU VARIES', '125 E 23rd St, New York, NY 10010', 'Next to Gramercy Theatre', 0, 'https://locations.chipotle.com/ny/new-york/125-e-23rd-st', 'verified', '2026-08-24T00:00:00Z', '2026-09-24', '2026-08-24T00:00:00Z'),
('mcdonalds-26-e-23rd', 'McDonald’s', '$2 breakfast sandwich', 'Fast food', 200, 200, '$2 DEAL', '26 E 23rd St, New York, NY 10010', 'Flatiron · mobile ordering available', 0, 'https://www.mcdonalds.com/us/en-us/location/~/~/33536.html', 'verified', '2026-08-24T00:00:00Z', '2026-09-24', '2026-08-24T00:00:00Z'),
('subway-170-w-23rd', 'Subway', '6-inch Meal of the Day', 'Sandwiches', 699, 699, '$6.99 MEAL', '170 W 23rd St, New York, NY 10011', 'Chelsea · open 24 hours', 0, 'https://restaurants.subway.com/united-states/ny/new-york/170-west-23rd-st', 'verified', '2026-08-24T00:00:00Z', '2026-09-24', '2026-08-24T00:00:00Z'),
('ten-ichi-178-fifth', 'Ten Ichi Mart', 'Prepared sushi and hot food', 'Japanese market', NULL, NULL, '50% AFTER 8', '178 Fifth Ave, New York, NY 10010', 'Flatiron · daily until 9:30 PM', 0, 'https://www.tenichimart.com/contact-us', 'verified', '2026-08-24T00:00:00Z', '2026-09-07', '2026-08-24T00:00:00Z'),
('jin-mei-25b-henry', 'Jin Mei Dumpling', '15 pan-fried pork and chive dumplings', 'Chinese', 500, 500, '$5', '25B Henry St B, New York, NY 10002', 'Chinatown · daily 11 AM–8:30 PM', 0, 'https://jinmeidumpling.com/about/', 'verified', '2026-08-24T00:00:00Z', '2026-09-24', '2026-08-24T00:00:00Z'),
('que-rico-221-e-23rd', 'Que Rico', 'Dominican lunch special', 'Dominican', 1000, 1000, '$10 LUNCH', '221 E 23rd St, New York, NY 10010', 'Two blocks from Baruch · noon–3 PM', 0, 'https://theticker.org/17547/arts/arts-amp-style/food-for-thought-with-andres-que-rico-restaurant/', 'verified', '2026-08-24T00:00:00Z', '2026-09-07', '2026-08-24T00:00:00Z');
--> statement-breakpoint
INSERT OR IGNORE INTO baroke_place_deals (place_id, deal_id) VALUES
('chipotle-125-e-23rd', 'chipotle-summer-extras-2026'),
('mcdonalds-26-e-23rd', 'mcdonalds-fries-oct-2026'),
('mcdonalds-26-e-23rd', 'mcdonalds-breakfast-oct-2026'),
('subway-170-w-23rd', 'subway-meal-of-day-2026'),
('subway-170-w-23rd', 'subway-bogo50-2026'),
('ten-ichi-178-fifth', 'ten-ichi-half-price-2026'),
('jin-mei-25b-henry', 'jin-mei-dumplings-2026'),
('que-rico-221-e-23rd', 'que-rico-lunch-2026');
--> statement-breakpoint
PRAGMA optimize;
