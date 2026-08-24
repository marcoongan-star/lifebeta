CREATE TABLE IF NOT EXISTS baroke_places (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  meal_name TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  price_min_cents INTEGER NOT NULL CHECK (price_min_cents > 0),
  price_max_cents INTEGER NOT NULL CHECK (price_max_cents >= price_min_cents),
  address TEXT NOT NULL,
  location_note TEXT NOT NULL,
  student_discount INTEGER NOT NULL DEFAULT 0 CHECK (student_discount IN (0, 1)),
  source_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (verification_status IN ('pending', 'verified', 'needs_review', 'rejected')),
  last_checked_at TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_baroke_places_status_created
ON baroke_places (verification_status, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_baroke_places_verified_checked
ON baroke_places (last_checked_at)
WHERE verification_status = 'verified';
