# LifeBeta + Baroke

A provenance-aware inflation evidence layer and a verified student-food database.

LifeBeta tracks the prices that actually matter to a person—food, protein bars, gym membership, clothing and soccer jerseys—then compares that personal index with public inflation series and explores how a portfolio behaved during those cost changes. Baroke turns the food-affordability evidence into a place database: students can search manually verified meal prices or submit a place for review.

Baroke never publishes a submission immediately. Records begin as pending, become public only after manual evidence review, and return to review when their price check is older than 24 hours.

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
- No-look-ahead basket quality reports for history depth, freshness, and source concentration.
- A responsive React/TypeScript interface for saved baskets, weighting choices, CPI comparison, product drivers, stale warnings, and missing-data blocks.
- A tested meal-affordability model that translates price growth into meals lost, budget share, and weekly shortfall.
- A public Baroke landing page with fixed food-affordability metrics and a BLS source link.
- A typed D1-backed Baroke place API with pending submissions, verified-only search results, and a daily freshness policy.
- A student submission form that persists meal, price range, address, location details, discount status, and evidence URL for manual review.

Seeded values are examples, never claims of live prices.

## Stack

- Python, Polars/pandas, NumPy and statsmodels for transparent analytics.
- FastAPI for catalog, index and experiment APIs.
- React 19, TypeScript, and vinext for contribution and comparison views and a free public build.
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

Start the public interface in a second terminal:

```bash
cd frontend
pnpm install
pnpm dev
```

Open `http://localhost:3000` for Baroke. Open `http://localhost:3000/tracker` for the LifeBeta evidence layer; switch to **Matchday Kit** to see why a missing Liverpool jersey observation blocks the index, while **Training Day** demonstrates a non-blocking stale-price warning.

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
| `src/lifebeta/food_affordability.py` | Meals affordable, meals lost, and weekly budget shortfall |
| `src/lifebeta/student_food.py` | Typed Baroke place records and deterministic search filters |
| `src/lifebeta/store.py` | Privacy-bounded SQLite persistence for normalized data |
| `frontend/app/student-eats-landing.tsx` | Baroke launch story and fixed affordability context |
| `frontend/app/baroque-explorer.tsx` | Verified place search and persistent submission form |
| `frontend/app/baroke-api.ts` | Typed browser adapter for the place API |
| `frontend/worker/index.ts` | D1 place routes, validation, and stale-price sweep |
| `frontend/db/schema.ts` | Baroke place table and lookup indexes |
| `frontend/app/inflation-tracker.tsx` | Saved basket controls, data-quality states, and drivers |
| `frontend/app/globals.css` | Product styling and responsive layout |
| `tests/` | Small examples that document the intended behavior |
| `docs/` | Milestone decisions and data flows |

Start with `tests/test_api.py` to understand the HTTP request flow. Read [Baroke transition design](docs/baroque-transition.md) for the product boundary, proposed production data flow, deal moderation, search architecture, privacy model, and failure modes. [Milestone 9](docs/milestone-9.md) explains the first implemented Baroke search boundary; the earlier numbered documents explain the LifeBeta analytics in order.

## Next milestones

1. Add an authenticated moderator screen for approving or rejecting pending records.
2. Add latitude/longitude and map-based search after addresses are geocoded.
3. Add immutable moderation audit events and notifications when a price needs rechecking.

This project is educational and does not provide personalized investment advice.
