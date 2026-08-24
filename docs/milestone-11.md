# Milestone 11: source-checked deals and simpler submissions

## Product decision

Baroke now separates two kinds of community food data:

1. A place submission is a private claim until Codex reviews its price and location during an explicit Baroke work session.
2. A deal is public only when its terms are recorded from a first-party source with a verification date and a freshness boundary.

The software does not decide whether a claim is true. It stores review decisions and prevents old decisions from being presented as current.

## Data flow

### Place submission

`browser form → POST /api/places → validate four required fields → D1 pending row → later evidence review → verified public result`

The required fields are place, cuisine, one meal price, and address. Meal name, location details, student-discount status, and evidence link are optional. D1 still stores minimum and maximum cents for compatibility, but a new single-price submission writes the same value to both columns.

### Confirmed deals

`first-party page → Codex review → D1 confirmed row → GET /api/deals → freshness sweep → public deal card`

Each deal records the original source, review date, optional expiration date, and mandatory recheck date. An expired deal becomes `expired`; a deal without a known ending becomes `needs_review` after its recheck date. Neither transition can promote a record to `confirmed`.

## Why this architecture

- D1 keeps public content durable on the same free hosting platform as the interface.
- Integer cents avoid floating-point errors in stored prices.
- Source URLs let a user inspect current terms before ordering.
- Read-time sweeps keep the rule effective even if no scheduled job runs.
- Explicit states make the difference between discovery, verification, staleness, and expiration queryable.

## Failure modes

- A brand can change an offer before the recorded expiration date. The UI therefore links to the source and warns that location participation varies.
- A first-party page can disappear. The deal should return to review rather than inherit trust forever.
- A student can omit optional evidence. The submission remains private until it can be checked independently.
- Duplicate submissions are not yet merged. A moderator interface should add similarity checks and an audit trail.

## Interview explanation

“I separated truth decisions from freshness enforcement. A human review session is the only path to confirmed data; code can only validate shape, store evidence, and demote stale records. That prevents a scraper or timer from turning an unverified claim into a public fact.”
