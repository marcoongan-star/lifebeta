# Baroke and LifeBeta contributor guide

Marco owns the product, basket and privacy decisions. Codex implements, validates and explains them.

## Approved product constraints

- LifeBeta revives the useful personal-finance idea behind Wesabe with stronger provenance, privacy and quantitative analysis.
- The seeded basket contains Marco's Chipotle order, Built Bar and Barebells pack sizes, LA Fitness, common zip-ups, and Liverpool/Barcelona/Spain home jerseys.
- The seeded portfolio is growth-heavy and explicitly educational.
- Fidelity CSV imports are session-only in the MVP. Never persist raw rows, log file contents or silently upload them.
- Seeded observations must never be presented as current or live prices.
- Unit normalization must occur before comparing packages, subscriptions or currencies.
- Baroke is the student food discovery layer; LifeBeta remains its inflation-evidence layer.
- Baroke contains no seeded public place claims. Student submissions start as pending and require manual verification before publication.
- A verified Baroke place becomes `needs_review` after its explicit `check_after` boundary; a sweep must never auto-verify a record.
- Codex verifies place and deal claims during explicit Baroke work sessions using first-party evidence. Background and read-time sweeps may only expire or flag records.
- A public deal needs a reviewable source, verification date, and either an expiration date or a future recheck date. Prefer first-party evidence; use a shorter recheck for community evidence.
- A restaurant can have zero, one, or many active deals through `baroke_place_deals`; never duplicate a deal merely to attach it to another location.
- Known expiration dates remove deals automatically. Offers without a stated end require a short recheck boundary, especially when evidence is community-reported.
- Display flexible labels such as `MENU VARIES` for offers without a verified dollar price; never invent a numeric price to satisfy filtering.

## Working style

- Keep teaching, system-design and interview explanations out of the product UI; put them in `docs/` and explain them directly to Marco.
- Every displayed observation eventually needs source, observation date, currency, unit and provenance status.
- Use decimal arithmetic for prices, quantities and index reconciliation.
- Treat minimum sample sizes, uncertainty and no-look-ahead alignment as correctness requirements.
- Prefer small milestones Marco can later modify and explain.
