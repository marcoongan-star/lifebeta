# Milestone 17: entity-scoped deal evidence history

The review queue previously returned the latest 100 audit events across every place and deal. That was enough for an operations summary, but it could not reliably answer a narrower question: **what happened to this specific deal?** An older deal's evidence could fall outside the global limit.

## Product decision

Each queued deal now has a **View evidence history** control. The browser requests that history only when a reviewer asks for it. The response includes every immutable event for that deal, ordered newest-first.

The history is not part of the public deal directory. Both the queue and the entity-history route require the server-side review credential. This keeps reviewer identities and internal rejection reasons out of the public interface.

## Data flow

1. An authenticated reviewer opens a queued deal.
2. The browser calls `GET /api/internal/review-queue/deals/{deal_id}` with the review credential.
3. The Worker rejects unauthorized requests before reading review records.
4. D1 verifies that the deal exists, then reads only events whose `entity_type` is `deal` and whose `entity_id` matches the requested deal.
5. The `idx_baroke_review_events_entity_time` index supports the entity filter and newest-first ordering.
6. The reviewer sees the event type, transition, reason, actor, and timestamp in an on-demand timeline.

## Why the audit log stays append-only

Review events are evidence, not mutable application state. The deal row may move from `confirmed` to `needs_review`, then back to `confirmed` or into `rejected`. The event rows preserve how that current state was reached. Database triggers reject updates and deletes so a later request cannot rewrite the history.

## Failure modes

- A missing or incorrect credential returns an authorization error without returning history.
- An unknown deal ID returns `404` instead of an empty, misleading timeline.
- A deal with no events returns a valid empty history.
- A failed browser request leaves the decision form usable and offers a retry.
- The entity-specific query does not depend on the queue's global 100-event limit.

## Interview explanation

The queue summary and entity history serve different access patterns. A bounded global query keeps the operations dashboard fast; an indexed entity query provides complete traceability for one decision. Separating them avoids over-fetching while preserving auditability at the point where a reviewer needs it.
