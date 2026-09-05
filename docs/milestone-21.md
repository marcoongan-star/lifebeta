# Milestone 21: explainable meal ranking

Baroke now separates filtering from ranking. Filters decide which verified places are eligible; ranking orders only those eligible results. A user can choose balanced best match, nearest, or lowest price.

## Balanced score

The 100-point score uses four visible components:

- affordability: 50 points, scaled between the selected budget and zero;
- proximity: 25 points, declining linearly over the first mile from Baruch;
- a current verified deal: 15 points;
- a student discount: 10 points.

Unknown price or coordinate evidence earns zero for that component. The system never substitutes a guessed price or distance. Every expanded card exposes the exact component scores.

## Data flow

`D1 verified places → freshness sweep → API response → browser distance calculation → hard filters → score components → selected sort → explained card`

This stays client-side because the current directory is small and the user's location/query state already lives in the browser. At larger scale, the same score contract could move behind a paginated geospatial query.

## Interview explanation

“I avoided an opaque recommendation model because the dataset is small and trust matters more than personalization. Hard filters enforce the user's constraints, then a documented weighted score ranks eligible places. Missing evidence never earns an advantage, and users can override the balanced score with nearest or lowest price.”
