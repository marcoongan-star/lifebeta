# Milestone 2 — trustworthy snapshots and category attribution

LifeBeta now converts price history into an analysis-ready snapshot without pretending missing or seeded prices are real observations.

## Working behavior

- Selects the newest eligible price on or before the requested date.
- Uses verified and user-entered observations by default.
- Never looks into the future when rebuilding historical snapshots.
- Refuses to silently fill products that lack eligible observations.
- Reports observations older than a configurable freshness threshold.
- Rolls product-level index changes into food, protein, gym, clothing, and jersey categories without losing index points.

## Data flow

```text
dated price observations + provenance
                ↓
filter by currency, source status, and analysis date
                ↓
select latest eligible observation per product
                ↓
normalize package price to comparable units
                ↓
calculate fixed-basket index
                ↓
attribute index-point change to product and category
```
