# Milestone 19 — moderated community deal submissions

Baroke users can now attach a reported offer to an existing verified restaurant. A submission requires a title, specific details, and a proof URL. It is saved as `pending`, linked relationally to the selected place, and added to the protected reviewer queue.

Pending offers never appear in the public deal endpoint or restaurant cards. A reviewer must confirm current evidence, choose a future recheck boundary, and create an immutable decision event before the status becomes `confirmed`.

## Data flow

```text
student chooses verified place + submits offer proof
                     ↓
POST /api/places/{place_id}/deals
                     ↓
D1 batch: pending deal + place link + submitted event
                     ↓
protected review queue
                     ↓
confirm with evidence and dates OR reject
                     ↓
public queries include confirmed deals only
```

## Why the model is relational

The deal is a separate record from the place. `baroke_place_deals` links the two, so the same evidence-backed offer can later be associated with multiple participating locations without duplicating its terms or lifecycle. The public card joins only verified places to confirmed deals.

## Failure boundaries

- An unknown or no-longer-verified place cannot receive a public submission.
- A malformed proof link is rejected before storage.
- A pending deal has no fake verification date or recheck date.
- A concurrent reviewer must still satisfy the optimistic status predicate.
- Rejected submissions remain explainable through append-only history but never become public.

## Interview explanation

“I separated untrusted ingestion from trusted publication. Community input enters a pending state, and the database records the place relationship and audit event in one batch. The read model filters to confirmed records, so a frontend mistake cannot accidentally publish unreviewed claims.”
