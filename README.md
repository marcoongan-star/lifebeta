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

The current test suite has twelve checks. Seeded values are examples, never claims of live prices.

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
| `src/lifebeta/api.py` | Typed catalog and personal-index HTTP endpoints |
| `src/lifebeta/index.py` | Fixed-basket index and product contributions |
| `src/lifebeta/holdings.py` | Session-only Fidelity CSV parsing |
| `tests/` | Small examples that document the intended behavior |
| `docs/` | Milestone decisions and data flows |

Start with `tests/test_api.py` to understand the Day 3 request flow. See [Milestone 2](docs/milestone-2.md) for snapshot logic and [Milestone 3](docs/milestone-3.md) for the API boundary.

## Next milestones

1. Persist products and provenance-aware price history.
2. Persist and retrieve snapshots through the FastAPI service.
3. Add public CPI comparison series with source citations.
4. Build the personal contribution and portfolio-exposure interface.

This project is educational and does not provide personalized investment advice.
