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
  verified_at TEXT NOT NULL,
  expires_at TEXT,
  check_after TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'needs_review', 'expired', 'rejected'))
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
DROP TRIGGER IF EXISTS trg_baroke_review_events_no_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_baroke_review_events_no_delete;
--> statement-breakpoint
DROP INDEX IF EXISTS idx_baroke_review_events_entity_time;
--> statement-breakpoint
DROP INDEX IF EXISTS idx_baroke_review_events_queue;
--> statement-breakpoint
ALTER TABLE baroke_review_events RENAME TO baroke_review_events_legacy;
--> statement-breakpoint
CREATE TABLE baroke_review_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('place', 'deal')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'submitted', 'verification_overdue', 'deal_expired', 'deal_review_overdue',
      'place_verified', 'place_reverified', 'place_rejected',
      'deal_confirmed', 'deal_reconfirmed', 'deal_rejected'
    )
  ),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
--> statement-breakpoint
INSERT INTO baroke_review_events (
  id, entity_type, entity_id, event_type, from_status, to_status,
  reason, actor, occurred_at
)
SELECT
  id, entity_type, entity_id, event_type, from_status, to_status,
  reason, actor, occurred_at
FROM baroke_review_events_legacy;
--> statement-breakpoint
DROP TABLE baroke_review_events_legacy;
--> statement-breakpoint
CREATE INDEX idx_baroke_review_events_entity_time
ON baroke_review_events (entity_type, entity_id, occurred_at DESC);
--> statement-breakpoint
CREATE INDEX idx_baroke_review_events_queue
ON baroke_review_events (to_status, occurred_at DESC);
--> statement-breakpoint
CREATE TRIGGER trg_baroke_review_events_no_update
BEFORE UPDATE ON baroke_review_events
BEGIN
  SELECT RAISE(ABORT, 'review events are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER trg_baroke_review_events_no_delete
BEFORE DELETE ON baroke_review_events
BEGIN
  SELECT RAISE(ABORT, 'review events are immutable');
END;
--> statement-breakpoint
PRAGMA optimize;
