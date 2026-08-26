export const createPlacesTable = `
  CREATE TABLE IF NOT EXISTS baroke_places (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    meal_name TEXT NOT NULL,
    cuisine TEXT NOT NULL,
    price_min_cents INTEGER CHECK (price_min_cents IS NULL OR price_min_cents > 0),
    price_max_cents INTEGER CHECK (
      price_max_cents IS NULL OR
      (price_min_cents IS NOT NULL AND price_max_cents >= price_min_cents)
    ),
    price_label TEXT NOT NULL,
    address TEXT NOT NULL,
    location_note TEXT NOT NULL,
    student_discount INTEGER NOT NULL DEFAULT 0 CHECK (student_discount IN (0, 1)),
    source_url TEXT,
    verification_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (verification_status IN ('pending', 'verified', 'needs_review', 'rejected')),
    last_checked_at TEXT,
    check_after TEXT,
    created_at TEXT NOT NULL
  )
`;

export const createPlacesStatusIndex = `
  CREATE INDEX IF NOT EXISTS idx_baroke_places_status_created
  ON baroke_places (verification_status, created_at DESC)
`;

export const createPlacesFreshnessIndex = `
  CREATE INDEX IF NOT EXISTS idx_baroke_places_verified_checked
  ON baroke_places (check_after)
  WHERE verification_status = 'verified'
`;

export const createDealsTable = `
  CREATE TABLE IF NOT EXISTS baroke_deals (
    id TEXT PRIMARY KEY,
    brand TEXT NOT NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    requirement TEXT NOT NULL,
    source_url TEXT NOT NULL,
    verified_at TEXT NOT NULL,
    expires_at TEXT,
    check_after TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed'
      CHECK (status IN ('confirmed', 'needs_review', 'expired'))
  )
`;

export const createDealsStatusIndex = `
  CREATE INDEX IF NOT EXISTS idx_baroke_deals_public
  ON baroke_deals (status, expires_at, check_after)
`;

export const createPlaceDealsTable = `
  CREATE TABLE IF NOT EXISTS baroke_place_deals (
    place_id TEXT NOT NULL,
    deal_id TEXT NOT NULL,
    PRIMARY KEY (place_id, deal_id),
    FOREIGN KEY (place_id) REFERENCES baroke_places(id) ON DELETE CASCADE,
    FOREIGN KEY (deal_id) REFERENCES baroke_deals(id) ON DELETE CASCADE
  )
`;

export const createPlaceDealsLookupIndex = `
  CREATE INDEX IF NOT EXISTS idx_baroke_place_deals_deal
  ON baroke_place_deals (deal_id, place_id)
`;

export const createReviewEventsTable = `
  CREATE TABLE IF NOT EXISTS baroke_review_events (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('place', 'deal')),
    entity_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
      event_type IN (
        'submitted', 'verification_overdue', 'deal_expired', 'deal_review_overdue',
        'place_verified', 'place_reverified', 'place_rejected'
      )
    ),
    from_status TEXT,
    to_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    actor TEXT NOT NULL,
    occurred_at TEXT NOT NULL
  )
`;

export const createReviewEventsEntityIndex = `
  CREATE INDEX IF NOT EXISTS idx_baroke_review_events_entity_time
  ON baroke_review_events (entity_type, entity_id, occurred_at DESC)
`;

export const createReviewEventsQueueIndex = `
  CREATE INDEX IF NOT EXISTS idx_baroke_review_events_queue
  ON baroke_review_events (to_status, occurred_at DESC)
`;

export const createReviewEventsImmutableUpdateTrigger = `
  CREATE TRIGGER IF NOT EXISTS trg_baroke_review_events_no_update
  BEFORE UPDATE ON baroke_review_events
  BEGIN
    SELECT RAISE(ABORT, 'review events are immutable');
  END
`;

export const createReviewEventsImmutableDeleteTrigger = `
  CREATE TRIGGER IF NOT EXISTS trg_baroke_review_events_no_delete
  BEFORE DELETE ON baroke_review_events
  BEGIN
    SELECT RAISE(ABORT, 'review events are immutable');
  END
`;

export const seedConfirmedDeals = [
  ["chipotle-summer-extras-2026", "Chipotle", "Summer of Extras", "Complete seven qualifying entrée purchases in one calendar month and choose a free entrée or 1,625 Rewards points.", "Chipotle Rewards membership and activation required. August progress ends August 31.", "https://www.chipotle.com/summer-of-extras-terms", "2026-08-24", "2026-08-31", "2026-08-31"],
  ["mcdonalds-fries-oct-2026", "McDonald’s", "Free medium fries with $1 purchase", "Use the McDonald’s app once per week through October 4, 2026.", "Participating locations; Rewards opt-in required; excludes delivery and tax.", "https://www.mcdonalds.com/us/en-us/deals.html", "2026-08-24", "2026-10-04", "2026-10-04"],
  ["mcdonalds-breakfast-oct-2026", "McDonald’s", "$2 breakfast sandwich", "Choose an eligible breakfast sandwich in the app once per week through October 4, 2026.", "Participating locations; Rewards opt-in required; excludes delivery and tax.", "https://www.mcdonalds.com/us/en-us/deals.html", "2026-08-24", "2026-10-04", "2026-10-04"],
  ["taco-bell-luxe-value-2026", "Taco Bell", "Luxe Value Menu", "Ten rotating menu items launched at $3 or less, including tacos, burritos, and loaded snacks.", "Participation and local prices vary; delivery prices may be higher.", "https://www.tacobell.com/newsroom/taco-bell-launches-the-new-luxe-value-menu", "2026-08-24", null, "2026-09-24"],
  ["subway-meal-of-day-2026", "Subway", "$6.99 Meal of the Day", "A rotating 6-inch Sub of the Day with a small drink and chips or two cookies.", "Limited time at participating restaurants; check the selected store before ordering.", "https://www.subway.com/en-us", "2026-08-24", null, "2026-09-24"],
  ["subway-bogo50-2026", "Subway", "Buy one footlong, get one 50% off", "Sub Club members can use code BOGO50 on weekdays after 4 PM and all day on weekends.", "Online or app orders; equal or lower-priced sub is discounted; participation may vary.", "https://www.subway.com/en-us", "2026-08-24", null, "2026-09-24"],
  ["panera-mix-match-2026", "Panera", "$4.99 Mix & Match items", "Choose two to ten eligible half sandwiches, half salads, or cups of soup for $4.99 each.", "Participating U.S. cafes; must order as Mix & Match; delivery costs more.", "https://www.panerabread.com/en-us/press/press-room/panera-breads-first-value-menu-lets-guests-mix-match-a-meal-of-up-to-ten-panera-favorites-for-just-499-each.html", "2026-08-24", null, "2026-09-24"],
  ["ten-ichi-half-price-2026", "Ten Ichi Mart", "50% off prepared food after 8 PM", "Remaining sushi, onigiri, bentos, and selected hot food are marked down after 8 PM.", "Selection is limited and can sell out; confirm the markdown in store before checkout.", "https://maps.apple.com/place?place-id=IE1CEC9200B3BCB7D", "2026-08-24", null, "2026-09-07"],
  ["jin-mei-dumplings-2026", "Jin Mei Dumpling", "15 dumplings for $5", "Get 15 pan-fried pork and chive dumplings for $5 at the Chinatown counter.", "Available at 25B Henry Street; item availability can change.", "https://jinmeidumpling.com/about/", "2026-08-24", null, "2026-09-24"],
  ["que-rico-lunch-2026", "Que Rico", "$10 lunch special", "A filling Dominican lunch plate offered from noon to 3 PM near Baruch.", "The special was reported by The Ticker; confirm the day’s choices in store.", "https://theticker.org/17547/arts/arts-amp-style/food-for-thought-with-andres-que-rico-restaurant/", "2026-08-24", null, "2026-09-07"],
] as const;

export const seedVerifiedPlaces = [
  ["chipotle-125-e-23rd", "Chipotle", "Custom bowls, burritos, and tacos", "Mexican", null, null, "MENU VARIES", "125 E 23rd St, New York, NY 10010", "Next to Gramercy Theatre", 0, "https://locations.chipotle.com/ny/new-york/125-e-23rd-st", "2026-08-24T00:00:00Z", "2026-09-24", "2026-08-24T00:00:00Z"],
  ["mcdonalds-26-e-23rd", "McDonald’s", "$2 breakfast sandwich", "Fast food", 200, 200, "$2 DEAL", "26 E 23rd St, New York, NY 10010", "Flatiron · mobile ordering available", 0, "https://www.mcdonalds.com/us/en-us/location/~/~/33536.html", "2026-08-24T00:00:00Z", "2026-09-24", "2026-08-24T00:00:00Z"],
  ["subway-170-w-23rd", "Subway", "6-inch Meal of the Day", "Sandwiches", 699, 699, "$6.99 MEAL", "170 W 23rd St, New York, NY 10011", "Chelsea · open 24 hours", 0, "https://restaurants.subway.com/united-states/ny/new-york/170-west-23rd-st", "2026-08-24T00:00:00Z", "2026-09-24", "2026-08-24T00:00:00Z"],
  ["ten-ichi-178-fifth", "Ten Ichi Mart", "Prepared sushi and hot food", "Japanese market", null, null, "50% AFTER 8", "178 Fifth Ave, New York, NY 10010", "Flatiron · daily until 9:30 PM", 0, "https://www.tenichimart.com/contact-us", "2026-08-24T00:00:00Z", "2026-09-07", "2026-08-24T00:00:00Z"],
  ["jin-mei-25b-henry", "Jin Mei Dumpling", "15 pan-fried pork and chive dumplings", "Chinese", 500, 500, "$5", "25B Henry St B, New York, NY 10002", "Chinatown · daily 11 AM–8:30 PM", 0, "https://jinmeidumpling.com/about/", "2026-08-24T00:00:00Z", "2026-09-24", "2026-08-24T00:00:00Z"],
  ["que-rico-221-e-23rd", "Que Rico", "Dominican lunch special", "Dominican", 1000, 1000, "$10 LUNCH", "221 E 23rd St, New York, NY 10010", "Two blocks from Baruch · noon–3 PM", 0, "https://theticker.org/17547/arts/arts-amp-style/food-for-thought-with-andres-que-rico-restaurant/", "2026-08-24T00:00:00Z", "2026-09-07", "2026-08-24T00:00:00Z"],
] as const;

export const seedPlaceDeals = [
  ["chipotle-125-e-23rd", "chipotle-summer-extras-2026"],
  ["mcdonalds-26-e-23rd", "mcdonalds-fries-oct-2026"],
  ["mcdonalds-26-e-23rd", "mcdonalds-breakfast-oct-2026"],
  ["subway-170-w-23rd", "subway-meal-of-day-2026"],
  ["subway-170-w-23rd", "subway-bogo50-2026"],
  ["ten-ichi-178-fifth", "ten-ichi-half-price-2026"],
  ["jin-mei-25b-henry", "jin-mei-dumplings-2026"],
  ["que-rico-221-e-23rd", "que-rico-lunch-2026"],
] as const;
