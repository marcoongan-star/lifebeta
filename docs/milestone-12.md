# Milestone 12: restaurant-linked current deals

## Product decision

The restaurant directory is now the primary way to discover discounts. A user sees a checkmark when a place has at least one current, reviewed offer and can expand the restaurant to inspect the offer’s terms, source, expiration, or recheck date. The separate confirmed-deals section remains available as a citywide feed.

## Data model

`baroke_places` stores the location and reviewed meal-price label. `baroke_deals` stores the offer once. `baroke_place_deals` is a many-to-many join table, allowing one restaurant to have multiple offers and one chain offer to be attached to multiple eligible locations later.

Prices can be unknown. Instead of inventing a number for a deal such as “50% after 8 PM,” the place stores null numeric bounds and a truthful display label. The price filter admits an unknown-price place only while it has a current linked deal.

## Read flow

`GET /api/places → demote overdue places and deals → fetch verified places → fetch confirmed linked deals → group deals by place → return nested JSON`

The browser then filters by price, location text, or current-deal status. Expanding a card is client-side state; the evidence and validity rules still come from the server.

## Starter records

- Chipotle, 125 E 23rd Street
- McDonald’s, 26 E 23rd Street
- Subway, 170 W 23rd Street
- Ten Ichi Mart, 178 Fifth Avenue
- Jin Mei Dumpling, 25B Henry Street
- Que Rico, 221 E 23rd Street

Chain addresses come from official location pages. Independent offers use the business’s own page when it publishes the price; otherwise the record carries a shorter recheck date and links the evidence actually reviewed.

## Expiration behavior

Deals with a stated ending become `expired` after that date. Deals without an ending become `needs_review` after `check_after`. Both states disappear from restaurant cards and the confirmed-deals feed. The software can demote evidence, but it cannot renew or reconfirm it.

## Interview explanation

“I modeled restaurants and deals separately because their lifecycles differ. A location is relatively stable, while offers expire frequently and can apply to several locations. The join table avoids duplicated terms, and the read path filters deal state before nesting current offers under each place.”

## Next improvement

Add a protected moderation screen that lets Codex-assisted review update evidence, attach an existing deal to another location, and record an immutable audit event.
