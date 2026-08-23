# Baroke transition design

## Product boundary

LifeBeta is the evidence layer. It explains how price changes affect a student's weekly food budget and preserves the provenance, units, effective dates, and quality state behind every calculation.

Baroke is the action layer. It will help Baruch students find an affordable meal nearby, identify student discounts, and judge whether a deal is still trustworthy. The public landing page connects the two products without claiming that the current seeded restaurant cards are live data.

## Current request flow

1. A visitor changes meal price, budget, or meal-count assumptions in the browser.
2. The preview computes meals affordable and weekly shortfall locally so it remains usable without an account.
3. The equivalent stateless backend calculation is available at `POST /v1/food-affordability` for future clients and automated testing.
4. Search filters run against a small seeded list in the browser. Seeded coordinates, meal prices, and deal cards are demonstrations—not current claims.
5. The submission form changes only local interface state. It explicitly says that no data is uploaded or saved.

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
        PostgreSQL + geospatial search + cache
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

Deal states should be `pending`, `verified`, `expired`, or `rejected`. A background job can expire deals automatically, but only a moderator or trusted source should move a community submission to `verified`.

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
| API unavailable | Keep the marketing evidence and seeded preview readable; never relabel cached data as live |

## Free deployment path

- React/TypeScript frontend on Sites (or Vercel if moved later).
- FastAPI backend on a free Python host while traffic is small.
- Managed PostgreSQL free tier for normalized places, prices, deals, and moderation records.
- Scheduled verification tasks within free quotas.

The next implementation milestone is not broad scraping. It is a small verified Baruch-area dataset, a real search endpoint, authenticated submissions, and a moderation queue.
