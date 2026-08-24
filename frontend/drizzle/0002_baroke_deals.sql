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
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_baroke_deals_public
ON baroke_deals (status, expires_at, check_after);
--> statement-breakpoint
INSERT OR IGNORE INTO baroke_deals VALUES
('chipotle-summer-extras-2026', 'Chipotle', 'Summer of Extras', 'Complete seven qualifying entrée purchases in one calendar month and choose a free entrée or 1,625 Rewards points.', 'Chipotle Rewards membership and activation required. August progress ends August 31.', 'https://www.chipotle.com/summer-of-extras-terms', '2026-08-24', '2026-08-31', '2026-08-31', 'confirmed'),
('mcdonalds-fries-oct-2026', 'McDonald’s', 'Free medium fries with $1 purchase', 'Use the McDonald’s app once per week through October 4, 2026.', 'Participating locations; Rewards opt-in required; excludes delivery and tax.', 'https://www.mcdonalds.com/us/en-us/deals.html', '2026-08-24', '2026-10-04', '2026-10-04', 'confirmed'),
('mcdonalds-breakfast-oct-2026', 'McDonald’s', '$2 breakfast sandwich', 'Choose an eligible breakfast sandwich in the app once per week through October 4, 2026.', 'Participating locations; Rewards opt-in required; excludes delivery and tax.', 'https://www.mcdonalds.com/us/en-us/deals.html', '2026-08-24', '2026-10-04', '2026-10-04', 'confirmed'),
('taco-bell-luxe-value-2026', 'Taco Bell', 'Luxe Value Menu', 'Ten rotating menu items launched at $3 or less, including tacos, burritos, and loaded snacks.', 'Participation and local prices vary; delivery prices may be higher.', 'https://www.tacobell.com/newsroom/taco-bell-launches-the-new-luxe-value-menu', '2026-08-24', NULL, '2026-09-24', 'confirmed'),
('subway-meal-of-day-2026', 'Subway', '$6.99 Meal of the Day', 'A rotating 6-inch Sub of the Day with a small drink and chips or two cookies.', 'Limited time at participating restaurants; check the selected store before ordering.', 'https://www.subway.com/en-us', '2026-08-24', NULL, '2026-09-24', 'confirmed'),
('subway-bogo50-2026', 'Subway', 'Buy one footlong, get one 50% off', 'Sub Club members can use code BOGO50 on weekdays after 4 PM and all day on weekends.', 'Online or app orders; equal or lower-priced sub is discounted; participation may vary.', 'https://www.subway.com/en-us', '2026-08-24', NULL, '2026-09-24', 'confirmed'),
('panera-mix-match-2026', 'Panera', '$4.99 Mix & Match items', 'Choose two to ten eligible half sandwiches, half salads, or cups of soup for $4.99 each.', 'Participating U.S. cafes; must order as Mix & Match; delivery costs more.', 'https://www.panerabread.com/en-us/press/press-room/panera-breads-first-value-menu-lets-guests-mix-match-a-meal-of-up-to-ten-panera-favorites-for-just-499-each.html', '2026-08-24', NULL, '2026-09-24', 'confirmed');
