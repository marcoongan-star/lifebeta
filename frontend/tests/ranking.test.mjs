import assert from "node:assert/strict";
import test from "node:test";

import { RANKING_WEIGHTS, scorePlace, sortRankedPlaces } from "../app/baroke-ranking.mjs";

function place(overrides = {}) {
  return {
    id: "place",
    priceMin: 8,
    deals: [],
    studentDiscount: false,
    ...overrides,
  };
}

test("balanced score is transparent and capped at 100", () => {
  const result = scorePlace(
    place({ priceMin: 0, deals: [{ id: "deal" }], studentDiscount: true }),
    0,
    12,
  );
  assert.equal(result.score, 100);
  assert.deepEqual(result.components, {
    affordability: RANKING_WEIGHTS.affordability,
    proximity: RANKING_WEIGHTS.proximity,
    currentDeal: RANKING_WEIGHTS.currentDeal,
    studentDiscount: RANKING_WEIGHTS.studentDiscount,
  });
});

test("unknown evidence earns zero rather than an invented advantage", () => {
  const result = scorePlace(place({ priceMin: null }), null, 12);
  assert.equal(result.components.affordability, 0);
  assert.equal(result.components.proximity, 0);
});

test("sort modes express distinct user priorities", () => {
  const cheapFar = { place: place({ id: "cheap", priceMin: 5 }), distanceMiles: 0.9 };
  const closeDeal = {
    place: place({ id: "close", priceMin: 10, deals: [{ id: "deal" }] }),
    distanceMiles: 0.1,
  };
  const ranked = [cheapFar, closeDeal].map((result) => ({
    ...result,
    rank: scorePlace(result.place, result.distanceMiles, 12),
  }));

  assert.equal(sortRankedPlaces(ranked, "nearest")[0].place.id, "close");
  assert.equal(sortRankedPlaces(ranked, "lowest-price")[0].place.id, "cheap");
  assert.equal(sortRankedPlaces(ranked, "best-match")[0].place.id, "close");
});
