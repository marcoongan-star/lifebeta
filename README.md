# LifeBeta

A provenance-aware personal inflation index and portfolio-exposure laboratory.

LifeBeta tracks the prices that actually matter to a person—food, protein bars, gym membership, clothing and soccer jerseys—then compares that personal index with public inflation series and explores how a portfolio behaved during those cost changes. It is inspired by the useful personal-finance premise of the discontinued startup Wesabe, improved with explicit provenance, package-size normalization, privacy-conscious imports and quantitative diagnostics.

## Marco's seeded basket

- Chipotle bowl: chicken, rice, black beans, fajita vegetables, lettuce, pico de gallo and sour cream.
- Built Bar 4-pack, Barebells 4-pack and Built Bar 14-pack.
- LA Fitness monthly membership.
- Common zip-up sweatshirts.
- Liverpool, Barcelona and Spain home jerseys.

Seeded values are examples, not claims of current prices. Real observations will require a cited permitted source or explicit user entry.

## Current working features

- Canonical products with comparable units.
- Price-per-unit normalization for packages and memberships.
- Fixed-basket index with reconciled contributions.
- Growth-heavy demo portfolio schema.
- Session-only Fidelity CSV validation that retains no raw file.
- Historical snapshots that select the newest eligible observation without looking ahead.
- Explicit missing-data and stale-data reporting.
- Category attribution that reconciles exactly with the personal index change.
- FastAPI catalog and personal-index endpoints with typed requests and structured missing-data errors.
- Ranked category drivers with inflationary and deflationary offsets that reconcile to the index.
- Release-date-aware comparison with caller-supplied, provenance-labeled CPI observations.
- Compounded real-return and purchasing-power analysis using the personal index as a deflator.
- Durable normalized products, baskets, and provenance-aware price history.
- Explicit opt-in storage for aggregate portfolio totals; raw Fidelity rows remain session-only.
- Saved-basket analysis that retrieves normalized price history without repeated uploads.
- Release-date-aware comparisons using persisted, source-labeled CPI observations.

Seeded values are examples, never claims of live prices.

## Planned stack

- Python, Polars/pandas, NumPy and statsmodels for transparent analytics.
- FastAPI for catalog, index and experiment APIs.
- React/TypeScript for contribution and comparison views.
- PostgreSQL for effective-dated baskets and provenance-aware observations.
- pytest, Docker and GitHub Actions for repeatable validation.

## Run the first checks

```bash
python3 -m venv .venv
.venv/bin/pip install -e '.[test]'
.venv/bin/pytest
```

Start the local API with:

```bash
.venv/bin/uvicorn lifebeta.api:app --reload
```

Then open `http://127.0.0.1:8000/docs` for the interactive API documentation.

## Repository map

| Area | Purpose |
| --- | --- |
| `src/lifebeta/catalog.py` | Personal products and comparable units |
| `src/lifebeta/prices.py` | Price observations, provenance, and package normalization |
| `src/lifebeta/analytics.py` | Trustworthy snapshots and category attribution |
| `src/lifebeta/benchmark.py` | No-look-ahead public benchmark alignment and comparison |
| `src/lifebeta/api.py` | Typed catalog and personal-index HTTP endpoints |
| `src/lifebeta/index.py` | Fixed-basket index and product contributions |
| `src/lifebeta/holdings.py` | Session-only Fidelity CSV parsing |
| `src/lifebeta/purchasing_power.py` | Nominal return, real return, and purchasing-power gap |
| `src/lifebeta/store.py` | Privacy-bounded SQLite persistence for normalized data |
| `tests/` | Small examples that document the intended behavior |
| `docs/` | Milestone decisions and data flows |

Start with `tests/test_api.py` to understand the HTTP request flow. See [Milestone 2](docs/milestone-2.md) for snapshot logic, [Milestone 3](docs/milestone-3.md) for the API boundary, [Milestone 4](docs/milestone-4.md) for driver attribution and CPI comparison, [Milestone 5](docs/milestone-5.md) for portfolio purchasing power, [Milestone 6](docs/milestone-6.md) for the privacy boundary, and [Milestone 7](docs/milestone-7.md) for saved analysis and released benchmarks.

## Next milestones

1. Add authentication and per-user ownership before accepting public personal data.
2. Add public CPI comparison series with source citations.
3. Build the personal contribution and portfolio-exposure interface.

This project is educational and does not provide personalized investment advice.
