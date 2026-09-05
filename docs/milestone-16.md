# Milestone 16: protected deal decisions

Baroke's private reviewer workspace can now finish the deal lifecycle. An expired or overdue offer can be re-confirmed against current evidence or rejected. Both outcomes are privileged, retry-safe state transitions with immutable audit history.

## Data flow

```text
expired / overdue deal
        |
protected review queue
        |
reviewer checks source, dates, and terms
        |
POST decision + stable command ID
        |
authorization + validation + status predicate
        |
D1 batch: append event + update deal
        |
confirmed returns to public reads; rejected stays hidden
```

## Correctness boundaries

- Only `needs_review` or `expired` deals can receive a decision.
- Re-confirmation requires an HTTP(S) evidence URL and a future recheck date.
- A supplied expiration must be today or later; a blank expiration represents an offer with no stated end.
- Rejection requires a specific reason and creates a terminal hidden status rather than deleting evidence.
- One client command ID identifies one entity and outcome. A network retry returns the first result without appending a second event.
- The audit event and optimistic status update execute in one D1 batch. A competing reviewer changing the row first produces a conflict.
- Public place cards and the deals endpoint still query only `confirmed` rows.

## Schema evolution

Migration 0006 rebuilds the deal table to add `rejected`, preserves all ten deals and eight place links, then expands the append-only event check constraint for deal decisions. Integrity and foreign-key checks verify that the relational directory survives the migration.

## What Marco should understand

The reviewer page is not the security boundary. The server authenticates every read and write, validates dates and sources, and controls the allowed state transition. The command ID handles uncertain network delivery; the status predicate handles concurrent reviewers; the audit table explains who changed what and why.

## Verification

- All 36 Python tests pass.
- All six migration/audit checks pass.
- Frontend lint, production build, and all four server-render checks pass.
