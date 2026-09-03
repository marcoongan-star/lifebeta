# Milestone 20 — public freshness ledger

Baroke now returns a compact freshness summary with every confirmed-deal query. The database first moves expired deals to `expired` and overdue open-ended deals to `needs_review`. Only then does it count public offers and calculate the next trust boundary.

## Read-path data flow

```text
GET /api/deals
      ↓
stale-state sweep
      ↓
confirmed-only deal query
      ↓
aggregate expiration/recheck query
      ↓
deals + freshness snapshot
      ↓
public trust ledger
```

The summary contains the confirmed count, offers ending within seven days, open-ended offers due for recheck within seven days, and the earliest upcoming boundary. Each card also displays when its evidence was checked.

## Why the sweep precedes the aggregate

Counting before the sweep would create a race in the meaning of “current”: the UI could report a deal as public even though its boundary already passed. The endpoint instead applies the lifecycle transition first and calculates the summary from the same confirmed-only state used for publication.

The worker also exposes a scheduled sweep hook. Read-time sweeping remains necessary because a missed schedule must not leave expired claims public.

## Failure modes

- Pending and rejected submissions never contribute to freshness counts.
- A stated expiration controls the boundary when present.
- An open-ended deal uses its mandatory recheck date.
- A missed background schedule is repaired on the next public read.
- An empty directory returns zero counts and no invented next boundary.

## Interview explanation

“Freshness is enforced as data state, not just a label in the UI. The read path first transitions stale records out of the confirmed set, then returns both the records and an aggregate snapshot from that trusted set. The scheduled sweep improves timeliness; the read-time sweep preserves correctness.”
