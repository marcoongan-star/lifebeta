# Milestone 4: Inflation Drivers and CPI Comparison

LifeBeta now answers two user questions after calculating a personal index:

1. Which categories caused the change?
2. How did that change compare with a supplied public benchmark?

## Driver attribution

Product contributions are rolled into categories, checked against the total index movement, and ranked by absolute effect. Negative contributions remain visible because a cheaper category can offset increases elsewhere. A category can therefore explain more than 100% of the net increase when another category pulls the total down.

## No-look-ahead benchmark alignment

```text
benchmark period + release date + source
                  |
                  v
 keep only observations released by analysis date
                  |
                  v
 choose newest eligible period for each endpoint
                  |
                  v
 benchmark change versus personal change
```

The release date matters. An observation describing February cannot be used in a February analysis if it was not published until March. This prevents look-ahead bias.

The API accepts benchmark observations from the caller and returns their labels and URLs. It does not fetch, invent, or describe those values as live.

## Marco's interview explanation

“The index tells me how much my basket changed; contribution attribution tells me why. For the CPI comparison, I align observations by release date rather than only measurement period, so a historical analysis never uses information that was unavailable at the time.”
