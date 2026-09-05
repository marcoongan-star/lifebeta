# Milestone 10: verified Baroke places

## Product decision

Baroke is now a real place-submission workflow rather than a seeded product preview. Public search returns only manually verified records. A student can submit a place, meal, price range, address, location details, discount status, and menu or receipt link. The record is stored as `pending` and is not public.

## Data flow

1. The browser sends a validated place form to `POST /api/places`.
2. The Worker validates required fields, price ordering, and the evidence URL.
3. D1 stores the record with integer price cents and `pending` status.
4. A reviewer will later check the evidence and mark the record `verified` in a moderator workflow.
5. `GET /api/places` returns only verified records.
6. The freshness sweep changes verified records older than 24 hours to `needs_review`; it never approves data automatically.

The Worker runs the sweep from its scheduled handler and also before public reads, so stale records remain hidden even if a scheduled invocation is delayed.

## Why manual-first

Restaurant pages and delivery platforms are unreliable scraping targets: markup changes, prices can differ by location, and terms may forbid automated collection. Manual submissions with evidence make provenance explicit and keep questionable data out of public results. Automation can later help flag evidence, but publication remains a review decision.

## Failure behavior

- Invalid or reversed prices return a structured `422` response.
- Non-HTTP evidence links are rejected.
- Database failure displays an unavailable state instead of falling back to fabricated listings.
- Empty verified results explain that new submissions remain private until reviewed.
- Old verified prices disappear from search by returning to `needs_review`.

## Next implementation

The next backend slice is an authenticated moderator queue with immutable approval and rejection events. That is intentionally separate from public submission so a user cannot approve their own record.
