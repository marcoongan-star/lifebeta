CREATE TABLE IF NOT EXISTS baroke_review_events (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('place', 'deal')),
  entity_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('submitted', 'verification_overdue', 'deal_expired', 'deal_review_overdue')
  ),
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_baroke_review_events_entity_time
ON baroke_review_events (entity_type, entity_id, occurred_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_baroke_review_events_queue
ON baroke_review_events (to_status, occurred_at DESC);
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_baroke_review_events_no_update
BEFORE UPDATE ON baroke_review_events
BEGIN
  SELECT RAISE(ABORT, 'review events are immutable');
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS trg_baroke_review_events_no_delete
BEFORE DELETE ON baroke_review_events
BEGIN
  SELECT RAISE(ABORT, 'review events are immutable');
END;
--> statement-breakpoint
PRAGMA optimize;
