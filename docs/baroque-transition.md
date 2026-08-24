# Baroke transition design

## Product boundary

LifeBeta is the evidence layer. It explains how price changes affect a student's weekly food budget and preserves the provenance, units, effective dates, and quality state behind every calculation.

Baroke is the action layer. It helps students find an affordable meal, identify student discounts, and inspect the first-party source behind a deal. The public landing page connects the two products without turning an unchecked submission into a public claim.

## Current request flow

1. The landing page displays fixed affordability assumptions and links the underlying BLS release.
2. `GET /api/places` runs a freshness check and returns only reviewed D1 records.
3. A visitor can search those places by meal-price ceiling, address text, and student-discount status.
4. `POST /api/places` requires place, cuisine, one meal price, and address, then saves a private `pending` record. Other details are optional.
5. `GET /api/deals` returns source-checked offers whose expiration or recheck boundary has not passed.
6. Codex performs truth checks during explicit work sessions; code only validates input, stores decisions, and demotes stale records.

## Production data flow

```text
restaurant menus / permitted public sources / student submissions
                         |
                         v
             normalize place + meal + price
                         |
                         v
        provenance, observed time, and expiry checks
                         |
                         v
       moderation: pending -> verified -> expired
                         |
                         v
        D1 now; PostgreSQL + geospatial search at scale
                         |
                         v
        FastAPI search/deal endpoints
                         |
                         v
         map, filters, deal details, reports
```

The important architectural choice is that discovery and verification are separate. A deal may be discovered quickly, but it cannot appear as verified until its source, terms, location, and expiration are recorded.

## Proposed production schema

| Entity | Important fields | Reason |
| --- | --- | --- |
| `places` | `id`, normalized name, address, latitude, longitude, cuisine | One canonical location for search and deduplication |
| `meal_options` | `place_id`, name, typical price, observed time, source | A place can have several affordable options |
| `student_discounts` | terms, eligibility, source, verified time | Keeps discount evidence separate from general menu prices |
| `deals` | terms, code, source URL, state, starts/ends, verified time | Prevents undated offers from silently staying live |
| `submissions` | contributor, evidence, moderation state, audit events | Supports community input without direct publication |

The implemented deal states are `confirmed`, `needs_review`, and `expired`. A sweep can demote a deal automatically, but only a new review decision can move it back to `confirmed`.

## Search design

The first useful query combines:

- maximum typical meal price;
- walking distance from Baruch or the user's chosen location;
- student-discount availability;
- optional cuisine and open-now filters.

PostgreSQL can start with indexed latitude and longitude columns. If the dataset grows, PostGIS makes radius and nearest-neighbor queries easier. MapLibre with OpenStreetMap-compatible tiles avoids locking the product into a paid proprietary map SDK, subject to the selected tile provider's usage policy.

## Trust, privacy, and abuse controls

- Public visitors can browse without an account.
- Submitting or reporting a deal requires authentication and rate limiting.
- Moderation records are append-only audit events, not silent overwrites.
- Personal financial imports remain outside Baroke. LifeBeta never needs raw Fidelity holdings to calculate food affordability.
- A source URL alone is insufficient: the system also stores what was observed and when.

## Failure modes

| Failure | Product response |
| --- | --- |
| Restaurant price is stale | Show the observation date and lower its confidence or hide it |
| Deal expired early | Let students report it, unpublish it, retain the audit record |
| Duplicate restaurant | Normalize address and coordinates before creating a place |
| Fake submission | Keep it pending; require evidence, authentication, and moderation |
| Map or geocoder unavailable | Preserve a sortable text list and distance information |
| API unavailable | Keep the sourced affordability context readable; do not invent fallback places or deals |

## Free deployment path

- React/TypeScript frontend on Sites (or Vercel if moved later).
- FastAPI backend on a free Python host while traffic is small.
- D1 on the current free deployment for places, deals, and moderation state; PostgreSQL remains the scale-up path.
- Read-time freshness checks, with scheduled demotion as an optional second layer.

The next implementation milestone is not broad scraping. It is an authenticated moderation queue, duplicate detection, and a small reviewed place dataset with immutable audit events.
