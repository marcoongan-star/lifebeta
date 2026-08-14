# Milestone 3 — typed personal-index API

LifeBeta now exposes its existing analytics through FastAPI.

## Endpoints

- `GET /health` checks service availability.
- `GET /v1/catalog` returns the nine approved normalized products.
- `POST /v1/index` accepts a basket, dated observations, two analysis dates, currency, provenance rules, and a staleness threshold.

The API validates the request, runs the same no-look-ahead snapshot selector used by the Python tests, calculates the fixed-basket index, and returns product dates plus category contributions. Missing prices return a structured `422 missing_price` response instead of invented values.

```text
typed JSON request
       ↓
Pydantic validation
       ↓
provenance-aware historical snapshots
       ↓
fixed-basket index and category attribution
       ↓
typed JSON response
```
