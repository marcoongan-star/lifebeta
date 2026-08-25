# Milestone 13 — Private review queue and immutable evidence history

## Product decision

Public submissions and automatic freshness sweeps now create review events instead of only changing a status. The internal queue groups pending places, overdue place checks, expired deals, overdue deal checks, and the latest 100 audit events.

The endpoint is unavailable unless a server-side `BAROKE_REVIEW_KEY` is configured, and every request must present that key. Pending student submissions are never returned by the public place or deal endpoints.

## Data model

`baroke_review_events` is append-only. Each row records:

- which place or deal changed;
- the event and previous/new status;
- a reason and actor;
- the exact occurrence time.

Database triggers reject updates and deletes. Indexes support per-entity timelines and status-oriented review scans.

## Data flow

```text
student submission ───────────────┐
                                  ├─> append review event ─> private queue
scheduled place/deal freshness ───┘
            |
            └─> demote stale public record
```

The sweep inserts its audit row before changing status in one database batch. Deterministic sweep-event IDs make reruns safe: a repeated sweep cannot create duplicate history for the same entity and date.

## Trust boundary

The queue is read-only in this milestone. That is intentional: implementing a reviewer screen before real authentication would turn a shared secret into a public moderation system. A later approval action must append its own event and update the entity together.

## Tests

The frontend suite applies every migration to an in-memory SQLite database, verifies all seeded restaurant/deal relationships, checks database integrity, asserts the review indexes exist, and proves that update/delete attempts on audit history fail.

## Interview explanation

“I separated current truth from historical evidence. A place can move from verified to needs-review, but its prior verification is not erased. Status and an append-only audit event change in one batch, while the public API only returns currently verified records. That gives the product an explainable moderation trail without leaking its private queue.”
