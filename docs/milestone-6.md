# Milestone 6 — Privacy-bounded persistence

LifeBeta now persists the history needed for a useful personal inflation product without treating every imported field as permanent data.

## Storage boundary

Persisted by default:

- Canonical normalized products
- Named baskets and product quantities
- Effective-dated package prices, currency, source label, and provenance status

Persisted only after explicit `save_totals: true` consent:

- Aggregate base and current portfolio values
- The personal index level used for that analysis

Never persisted:

- Raw Fidelity CSV text or rows
- Account names or account numbers
- Raw receipt images or unnormalized receipt text

The raw input exists only long enough to validate and normalize it. This is data minimization: the database contains what the product needs to calculate trends, not everything it happened to receive.

## Data flow

`manual entry → validate provenance → normalize product/package → persist observation`

`Fidelity CSV → parse in memory → calculate aggregates → discard raw rows → save nothing unless the user explicitly opts in to aggregate totals`

SQLite makes this boundary easy to run and inspect locally for free. The repository can later swap the adapter for PostgreSQL. Before storing data for multiple public users, the service needs authentication, per-user ownership, encryption, and deletion/export controls.
