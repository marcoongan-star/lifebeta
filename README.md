# LifeBeta + Baroke

A provenance-aware inflation evidence layer and a verified student-food database.

LifeBeta tracks the prices that actually matter to a person—food, protein bars, gym membership, clothing and soccer jerseys—then compares that personal index with public inflation series and explores how a portfolio behaved during those cost changes. Baroke turns the food-affordability evidence into a place database: students can search reviewed meal prices, open a restaurant to inspect its current deals, or submit a place.

Baroke never publishes a submission immediately. Records begin as pending, become public only after evidence review during a Baroke work session, and return to review after their recorded recheck date. Automation can hide stale data; it cannot declare a place or deal true.

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
- A typed D1-backed Baroke place API with pending submissions, verified-only search results, and read-time freshness enforcement.
- A student submission form that requires only place, cuisine, one meal price, and address; meal details, location notes, discount status, and evidence URL remain optional.
- A D1-backed deals API with ten source-checked offers; chain promotions use first-party pages and community-reported specials receive shorter recheck dates.
- Explicit expiration and recheck dates that remove stale deals from the public response without auto-verifying replacements.
- A relational place-to-deal directory with six starter restaurants, including nearby chain locations and independently sourced NYC bargains.
- Expandable restaurant cards with a checked-current-deal badge, exact terms, validity boundary, and evidence link.
- A private review queue with append-only place and deal history.
- Protected, retry-safe place verification and rejection with reviewer attribution, evidence links, future recheck dates, and stale-write protection.
- Protected deal re-confirmation and rejection with validated evidence dates, stable command IDs, optimistic concurrency, and immutable audit events.
- A locked `/review` operations workspace that keeps its credential in page memory and exposes no queue data before server authorization.

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
| `frontend/app/baroke-api.ts` | Typed browser adapter for public data and protected review operations |
| `frontend/worker/index.ts` | D1 routes, validation, freshness sweeps, and entity-scoped audit history |
| `frontend/db/schema.ts` | Baroke place/deal tables, many-to-many links, indexes, and reviewed seed records |
| `frontend/app/inflation-tracker.tsx` | Saved basket controls, data-quality states, and drivers |
| `frontend/app/globals.css` | Product styling and responsive layout |
| `tests/` | Small examples that document the intended behavior |
| `docs/` | Milestone decisions and data flows |

Start with `tests/test_api.py` to understand the HTTP request flow. Read [Baroke transition design](docs/baroque-transition.md) for the product boundary, proposed production data flow, deal moderation, search architecture, privacy model, and failure modes. [Milestone 12](docs/milestone-12.md) explains the restaurant-to-deal directory, [Milestone 13](docs/milestone-13.md) explains its private review queue and immutable evidence history, [Milestone 14](docs/milestone-14.md) follows a protected place decision from request to publication, [Milestone 15](docs/milestone-15.md) explains the locked reviewer interface, [Milestone 16](docs/milestone-16.md) completes protected deal moderation, [Milestone 17](docs/milestone-17.md) adds protected per-deal evidence timelines, and [Milestone 18](docs/milestone-18.md) introduces provenance-backed coordinates and campus-distance search; the earlier numbered documents explain how the project reached them.

## Next milestones

1. Replace the shared review credential with individual production reviewer sessions.
2. Replace straight-line distance with walking-route distance after selecting a permitted free routing provider.

This project is educational and does not provide personalized investment advice.
