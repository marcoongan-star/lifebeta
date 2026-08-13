# Milestone 1 — normalized personal basket

This milestone establishes the data contract before any charts are built:

```text
source observation
    ↓
canonical product identity
    ↓
package/subscription unit normalization
    ↓
versioned basket quantities
    ↓
index level + item contributions
```

The Built Bar and Barebells packages prove why package price alone is misleading: a 14-pack can cost more while costing less per bar. The fixed-basket engine uses decimal arithmetic and forces rounded contributions to reconcile exactly to the displayed aggregate index change.

Fidelity CSV parsing returns only normalized symbol, quantity and market value objects. The raw text is not stored on any object and will remain browser-session-only when the frontend is added.

The next milestone will add provenance-aware observation storage and category aggregation without using fabricated live prices.

