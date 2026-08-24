export type BarokePlace = {
  id: string;
  name: string;
  mealName: string;
  cuisine: string;
  priceMin: number;
  priceMax: number;
  address: string;
  locationNote: string;
  studentDiscount: boolean;
  sourceUrl: string | null;
  verificationStatus: "verified" | "needs_review" | "pending" | "rejected";
  lastCheckedAt: string | null;
};

type PlaceRow = {
  id: string;
  name: string;
  meal_name: string;
  cuisine: string;
  price_min_cents: number;
  price_max_cents: number;
  address: string;
  location_note: string;
  student_discount: number;
  source_url: string | null;
  verification_status: BarokePlace["verificationStatus"];
  last_checked_at: string | null;
};

export type PlaceSubmission = {
  name: string;
  meal_name: string;
  cuisine: string;
  meal_price: number;
  address: string;
  location_note: string;
  student_discount: boolean;
  source_url: string;
};

export type BarokeDeal = {
  id: string;
  brand: string;
  title: string;
  details: string;
  requirement: string;
  sourceUrl: string;
  verifiedAt: string;
  expiresAt: string | null;
  checkAfter: string;
};

type DealRow = {
  id: string;
  brand: string;
  title: string;
  details: string;
  requirement: string;
  source_url: string;
  verified_at: string;
  expires_at: string | null;
  check_after: string;
};

export async function loadBarokePlaces(signal: AbortSignal): Promise<BarokePlace[]> {
  const response = await fetch("/api/places", {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("Baroke place database unavailable");
  const payload = await response.json() as { places: PlaceRow[] };
  return payload.places.map((place) => ({
    id: place.id,
    name: place.name,
    mealName: place.meal_name,
    cuisine: place.cuisine,
    priceMin: place.price_min_cents / 100,
    priceMax: place.price_max_cents / 100,
    address: place.address,
    locationNote: place.location_note,
    studentDiscount: place.student_discount === 1,
    sourceUrl: place.source_url,
    verificationStatus: place.verification_status,
    lastCheckedAt: place.last_checked_at,
  }));
}

export async function submitBarokePlace(submission: PlaceSubmission): Promise<void> {
  const response = await fetch("/api/places", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(submission),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "Place could not be saved." })) as { error?: string };
    throw new Error(payload.error ?? "Place could not be saved.");
  }
}

export async function loadBarokeDeals(signal: AbortSignal): Promise<BarokeDeal[]> {
  const response = await fetch("/api/deals", {
    signal,
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("Baroke deal database unavailable");
  const payload = await response.json() as { deals: DealRow[] };
  return payload.deals.map((deal) => ({
    id: deal.id,
    brand: deal.brand,
    title: deal.title,
    details: deal.details,
    requirement: deal.requirement,
    sourceUrl: deal.source_url,
    verifiedAt: deal.verified_at,
    expiresAt: deal.expires_at,
    checkAfter: deal.check_after,
  }));
}
