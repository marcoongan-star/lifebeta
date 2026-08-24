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
- Baroke place and deal previews remain explicitly seeded until every current claim has source and observation-date provenance.

## Working style

- Keep teaching, system-design and interview explanations out of the product UI; put them in `docs/` and explain them directly to Marco.
- Every displayed observation eventually needs source, observation date, currency, unit and provenance status.
- Use decimal arithmetic for prices, quantities and index reconciliation.
- Treat minimum sample sizes, uncertainty and no-look-ahead alignment as correctness requirements.
- Prefer small milestones Marco can later modify and explain.
