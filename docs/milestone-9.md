# Milestone 9 — Baroke typed discovery boundary

## Product slice

Baroke's first restaurant search no longer exists only as a component-local array. A Python domain function filters typed place records by typical meal price, distance, and student-discount availability. FastAPI exposes the result, and the React interface can load that contract while retaining an explicit seeded fallback.

## Data flow

```text
price / distance / discount filters
                |
        FastAPI search endpoint
                |
typed place records + provenance status
                |
        React map and result cards
```

The current records remain demonstrations. `seeded_demo` travels with every result, and the API response says that no current price, exact location, or active discount is implied.

## Why this boundary comes first

Later, a verified database or permitted public source can replace the seeded repository without changing the UI contract. Search logic is independently testable, decimal comparisons happen on the server, and provenance is part of the record rather than disclaimer text added afterward.

## Failure modes

- Nonpositive price or distance limits are rejected.
- If the API is unavailable, the public preview falls back to labeled seeded records.
- Filtered results are deterministic, making tests and later ranking changes explainable.

## Interview explanation

"I separated the discovery interface from its data source. The UI consumes a typed place contract; the API owns filter semantics and provenance. That lets us move from seeded demos to verified observations without coupling source collection to map rendering."
