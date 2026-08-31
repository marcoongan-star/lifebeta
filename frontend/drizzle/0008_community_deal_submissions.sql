DROP INDEX IF EXISTS idx_baroke_place_deals_deal;
--> statement-breakpoint
DROP INDEX IF EXISTS idx_baroke_deals_public;
--> statement-breakpoint
ALTER TABLE baroke_place_deals RENAME TO baroke_place_deals_legacy;
--> statement-breakpoint
ALTER TABLE baroke_deals RENAME TO baroke_deals_legacy;
--> statement-breakpoint
CREATE TABLE baroke_deals (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  requirement TEXT NOT NULL,
  source_url TEXT NOT NULL,
  verified_at TEXT,
  expires_at TEXT,
  check_after TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'needs_review', 'expired', 'rejected'))
);
--> statement-breakpoint
INSERT INTO baroke_deals (
  id, brand, title, details, requirement, source_url,
  verified_at, expires_at, check_after, status
)
SELECT
  id, brand, title, details, requirement, source_url,
  verified_at, expires_at, check_after, status
FROM baroke_deals_legacy;
--> statement-breakpoint
CREATE TABLE baroke_place_deals (
  place_id TEXT NOT NULL,
  deal_id TEXT NOT NULL,
  PRIMARY KEY (place_id, deal_id),
  FOREIGN KEY (place_id) REFERENCES baroke_places(id) ON DELETE CASCADE,
  FOREIGN KEY (deal_id) REFERENCES baroke_deals(id) ON DELETE CASCADE
);
--> statement-breakpoint
INSERT INTO baroke_place_deals (place_id, deal_id)
SELECT place_id, deal_id FROM baroke_place_deals_legacy;
--> statement-breakpoint
DROP TABLE baroke_place_deals_legacy;
--> statement-breakpoint
DROP TABLE baroke_deals_legacy;
--> statement-breakpoint
CREATE INDEX idx_baroke_deals_public
ON baroke_deals (status, expires_at, check_after);
--> statement-breakpoint
CREATE INDEX idx_baroke_place_deals_deal
ON baroke_place_deals (deal_id, place_id);
--> statement-breakpoint
PRAGMA optimize;
