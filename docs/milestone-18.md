# Milestone 18: provenance-backed campus distance

Baroke already stored verified addresses, but text search could not answer a student's practical question: **how close is this lunch to Baruch?** This milestone adds nullable, source-backed coordinates and a straight-line campus-distance filter without inventing a location for records that have not been geocoded.

## Product behavior

- Five verified places have coordinates checked on August 30, 2026, with a coordinate source URL stored beside each point.
- Jin Mei remains available in the general directory but is excluded from distance-limited results because its coordinates have not yet passed this workflow.
- Students can filter to 0.25, 0.5, or 1 mile from the 55 Lexington Avenue campus point.
- Results with coordinates are ordered nearest-first.
- Each restaurant card can open walking directions and the stored coordinate evidence.
- The distance displayed is straight-line distance, not a promise about route length or walking time.

## Data model

`baroke_places` gains four nullable fields:

- `latitude` and `longitude`, each protected by geographic range constraints;
- `coordinate_source_url`, preserving where the point was checked; and
- `coordinate_checked_at`, preserving the verification boundary.

Coordinates remain nullable because an unverified point is worse than an honest missing value. A reviewer may add coordinates during a protected place decision only when latitude, longitude, and an HTTP evidence URL are supplied together.

## Distance calculation

The browser uses the Haversine formula with an Earth radius of 3,958.8 miles. It converts latitude and longitude differences to radians, calculates the great-circle central angle, and returns the straight-line distance from the Baruch campus point.

For this small directory, calculating distance over the returned verified records is simpler and cheaper than adding a geospatial database extension. If the directory grows, the API should first apply a latitude/longitude bounding box and then calculate precise distance over the smaller candidate set.

## Failure modes

- Invalid latitude or longitude is rejected by both the review API and SQLite constraints.
- Supplying only part of the coordinate evidence is rejected.
- Missing coordinates never become zero distance.
- Distance-limited filters exclude unlocated records rather than guessing.
- A straight-line estimate may understate a real walking route; the map link is the route authority.

## Interview explanation

The important decision is provenance, not the Haversine formula. Location is treated as reviewed product data with an explicit source and check date. The algorithm consumes only trusted coordinates and preserves an honest unknown state for everything else.
