# Milestone 14: protected place decisions

This milestone closes the loop between a public Baroke submission and the verified-only restaurant directory. A reviewer can now verify, re-verify, or reject a queued place through a protected server endpoint. There is still no public moderation screen and no route that exposes pending records.

## Decision flow

1. A reviewer reads `GET /api/internal/review-queue` with the server-side review credential.
2. The reviewer checks the submitted address, price, and evidence outside Baroke.
3. The client sends `POST /api/internal/review-queue/places/{place_id}` with a decision, a specific reason, and a reusable command ID.
4. Verification also requires an HTTP evidence URL and a future recheck date.
5. D1 appends the audit event and changes the place status in one batch.
6. The existing public place endpoint can now return a verified record; rejected records remain private.

The request credential answers “may this caller review?” The optional authenticated-user header answers “which signed-in reviewer made the decision?” A credential alone is recorded as `review-key`; it is never copied into the audit log.

## Correctness boundaries

- Only `pending` and `needs_review` places can be decided.
- A verification without reviewable evidence or a future `check_after` date is rejected.
- Every client command ID maps to at most one decision. Retrying the same command returns the original outcome without another event.
- The status predicate is optimistic concurrency control: if another reviewer changes the record first, the second reviewer must reload instead of overwriting the newer decision.
- Audit rows remain append-only. A correction is a new event, never an edit to history.
- Scheduled and read-time sweeps can demote stale records but cannot verify them.

## Why this matters in system design

The important boundary is not the form; it is trustworthy state transition. Authentication protects the endpoint, validation defines the evidence needed for publication, idempotency makes retries safe, optimistic concurrency prevents lost updates, and the append-only event gives the decision an inspectable history.

Deal moderation and a reviewer-facing interface remain separate milestones. Keeping those out of this change makes the place transition small enough to test and explain.
