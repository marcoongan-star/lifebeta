export const RANKING_WEIGHTS = Object.freeze({
  affordability: 50,
  proximity: 25,
  currentDeal: 15,
  studentDiscount: 10,
});

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

/**
 * Score one already-verified result. Unknown prices and coordinates receive no
 * points for that component instead of being guessed.
 */
export function scorePlace(place, distanceMiles, maxPrice) {
  const affordability = place.priceMin === null
    ? 0
    : RANKING_WEIGHTS.affordability * clamp((maxPrice - place.priceMin) / maxPrice);
  const proximity = distanceMiles === null
    ? 0
    : RANKING_WEIGHTS.proximity * clamp(1 - distanceMiles);
  const currentDeal = place.deals.length > 0 ? RANKING_WEIGHTS.currentDeal : 0;
  const studentDiscount = place.studentDiscount ? RANKING_WEIGHTS.studentDiscount : 0;
  const components = {
    affordability: Math.round(affordability),
    proximity: Math.round(proximity),
    currentDeal,
    studentDiscount,
  };
  return {
    score: Object.values(components).reduce((total, value) => total + value, 0),
    components,
  };
}

export function sortRankedPlaces(results, mode) {
  return [...results].sort((left, right) => {
    if (mode === "nearest") {
      return (left.distanceMiles ?? Number.POSITIVE_INFINITY)
        - (right.distanceMiles ?? Number.POSITIVE_INFINITY);
    }
    if (mode === "lowest-price") {
      return (left.place.priceMin ?? Number.POSITIVE_INFINITY)
        - (right.place.priceMin ?? Number.POSITIVE_INFINITY);
    }
    return right.rank.score - left.rank.score
      || (left.distanceMiles ?? Number.POSITIVE_INFINITY)
        - (right.distanceMiles ?? Number.POSITIVE_INFINITY);
  });
}
