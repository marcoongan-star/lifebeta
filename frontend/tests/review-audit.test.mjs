import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

function migratedDatabase() {
  const database = new DatabaseSync(":memory:");
  for (const migration of [
    "0001_baroke_places.sql",
    "0002_baroke_deals.sql",
    "0003_place_deal_directory.sql",
    "0004_review_audit_queue.sql",
    "0005_place_review_decisions.sql",
    "0006_deal_review_decisions.sql",
    "0007_verified_place_coordinates.sql",
    "0008_community_deal_submissions.sql",
  ]) {
    database.exec(readFileSync(new URL(`../drizzle/${migration}`, import.meta.url), "utf8"));
  }
  return database;
}

test("applies the complete Baroke schema with seeded directory records", () => {
  const database = migratedDatabase();
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM baroke_places").get().count, 6);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM baroke_deals").get().count, 10);
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM baroke_place_deals").get().count,
    8,
  );
  assert.equal(database.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
  assert.deepEqual(database.prepare("PRAGMA foreign_key_check").all(), []);
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM baroke_places WHERE latitude IS NOT NULL AND longitude IS NOT NULL").get().count,
    5,
  );
  assert.throws(
    () => database.prepare("UPDATE baroke_places SET latitude = 91 WHERE id = ?").run("chipotle-125-e-23rd"),
    /CHECK constraint failed/,
  );
});

test("keeps review history append-only", () => {
  const database = migratedDatabase();
  database.prepare(`
    INSERT INTO baroke_review_events (
      id, entity_type, entity_id, event_type, from_status, to_status,
      reason, actor, occurred_at
    ) VALUES (?, 'place', ?, 'submitted', NULL, 'pending', ?, ?, ?)
  `).run("event-1", "place-1", "Submitted for checking.", "public-submission", "2026-08-25T00:00:00Z");

  assert.throws(
    () => database.prepare("UPDATE baroke_review_events SET reason = ? WHERE id = ?").run("changed", "event-1"),
    /review events are immutable/,
  );
  assert.throws(
    () => database.prepare("DELETE FROM baroke_review_events WHERE id = ?").run("event-1"),
    /review events are immutable/,
  );
});

test("indexes entity history and review-state scans", () => {
  const database = migratedDatabase();
  const indexes = database.prepare(`
    SELECT name FROM sqlite_schema
    WHERE type = 'index' AND tbl_name = 'baroke_review_events'
  `).all().map((row) => row.name);

  assert.ok(indexes.includes("idx_baroke_review_events_entity_time"));
  assert.ok(indexes.includes("idx_baroke_review_events_queue"));
});

test("loads one deal history newest-first through the entity index", () => {
  const database = migratedDatabase();
  const insert = database.prepare(`
    INSERT INTO baroke_review_events (
      id, entity_type, entity_id, event_type, from_status, to_status,
      reason, actor, occurred_at
    ) VALUES (?, 'deal', ?, ?, ?, ?, ?, 'review-key', ?)
  `);
  insert.run("deal-a-old", "deal-a", "deal_review_overdue", "confirmed", "needs_review", "Recheck passed.", "2026-08-27T10:00:00Z");
  insert.run("deal-a-new", "deal-a", "deal_reconfirmed", "needs_review", "confirmed", "Evidence renewed.", "2026-08-28T10:00:00Z");
  insert.run("deal-b", "deal-b", "deal_rejected", "expired", "rejected", "Different deal.", "2026-08-29T10:00:00Z");

  const query = `
    SELECT id FROM baroke_review_events
    WHERE entity_type = 'deal' AND entity_id = ?
    ORDER BY occurred_at DESC, id DESC
  `;
  assert.deepEqual(
    database.prepare(query).all("deal-a").map((row) => row.id),
    ["deal-a-new", "deal-a-old"],
  );
  const plan = database.prepare(`EXPLAIN QUERY PLAN ${query}`).all("deal-a");
  assert.ok(plan.some((row) => String(row.detail).includes("idx_baroke_review_events_entity_time")));
});

test("records one idempotent verification decision beside the place update", () => {
  const database = migratedDatabase();
  database.prepare(`
    INSERT INTO baroke_places (
      id, name, meal_name, cuisine, price_min_cents, price_max_cents,
      price_label, address, location_note, student_discount, source_url,
      verification_status, last_checked_at, check_after, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 0, NULL, 'pending', NULL, NULL, ?)
  `).run(
    "pending-place",
    "Test Kitchen",
    "Lunch plate",
    "Caribbean",
    800,
    800,
    "$8.00",
    "1 Test Street, New York, NY",
    "2026-08-26T12:00:00Z",
  );

  const command = database.prepare(`
    INSERT OR IGNORE INTO baroke_review_events (
      id, entity_type, entity_id, event_type, from_status, to_status,
      reason, actor, occurred_at
    )
    SELECT ?, 'place', id, 'place_verified', verification_status, 'verified', ?, ?, ?
    FROM baroke_places
    WHERE id = ? AND verification_status = 'pending'
  `);
  const commandArguments = [
    "review-command:verify-pending-place",
    "Menu and address checked against the linked source.",
    "review-key",
    "2026-08-26T13:00:00Z",
    "pending-place",
  ];
  command.run(...commandArguments);
  database.prepare(`
    UPDATE baroke_places
    SET verification_status = 'verified', source_url = ?,
        last_checked_at = ?, check_after = ?
    WHERE id = ? AND verification_status = 'pending'
  `).run(
    "https://example.com/menu",
    "2026-08-26T13:00:00Z",
    "2026-09-09",
    "pending-place",
  );
  command.run(...commandArguments);

  assert.deepEqual(
    { ...database.prepare(`
      SELECT verification_status, source_url, check_after
      FROM baroke_places WHERE id = ?
    `).get("pending-place") },
    {
      verification_status: "verified",
      source_url: "https://example.com/menu",
      check_after: "2026-09-09",
    },
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM baroke_review_events WHERE id = ?")
      .get("review-command:verify-pending-place").count,
    1,
  );
});

test("supports explicit rejection and re-verification event types", () => {
  const database = migratedDatabase();
  const insert = database.prepare(`
    INSERT INTO baroke_review_events (
      id, entity_type, entity_id, event_type, from_status, to_status,
      reason, actor, occurred_at
    ) VALUES (?, 'place', ?, ?, ?, ?, ?, 'review-key', ?)
  `);
  insert.run(
    "event-reverified",
    "place-1",
    "place_reverified",
    "needs_review",
    "verified",
    "Source was checked again.",
    "2026-08-26T14:00:00Z",
  );
  insert.run(
    "event-rejected",
    "place-2",
    "place_rejected",
    "pending",
    "rejected",
    "Submission could not be substantiated.",
    "2026-08-26T14:05:00Z",
  );

  assert.deepEqual(
    database.prepare(`
      SELECT event_type FROM baroke_review_events
      WHERE id IN ('event-reverified', 'event-rejected')
      ORDER BY id
    `).all().map((row) => ({ ...row })),
    [{ event_type: "place_rejected" }, { event_type: "place_reverified" }],
  );
});

test("supports audited deal re-confirmation and rejection", () => {
  const database = migratedDatabase();
  const insert = database.prepare(`
    INSERT INTO baroke_review_events (
      id, entity_type, entity_id, event_type, from_status, to_status,
      reason, actor, occurred_at
    ) VALUES (?, 'deal', ?, ?, ?, ?, ?, 'review-key', ?)
  `);
  insert.run(
    "deal-command-reconfirm",
    "ten-ichi-half-price-2026",
    "deal_reconfirmed",
    "needs_review",
    "confirmed",
    "The offer page and next recheck were reviewed.",
    "2026-08-28T14:00:00Z",
  );
  insert.run(
    "deal-command-reject",
    "que-rico-lunch-2026",
    "deal_rejected",
    "expired",
    "rejected",
    "The offer could no longer be substantiated.",
    "2026-08-28T14:05:00Z",
  );
  database.prepare("UPDATE baroke_deals SET status = 'rejected' WHERE id = ?")
    .run("que-rico-lunch-2026");

  assert.equal(
    database.prepare("SELECT status FROM baroke_deals WHERE id = ?")
      .get("que-rico-lunch-2026").status,
    "rejected",
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM baroke_deals WHERE status = 'confirmed'")
      .get().count,
    9,
  );
  assert.throws(
    () => database.prepare("UPDATE baroke_review_events SET reason = 'changed' WHERE id = ?")
      .run("deal-command-reconfirm"),
    /review events are immutable/,
  );
});

test("stores community deals as private pending records linked to one place", () => {
  const database = migratedDatabase();
  database.prepare(`
    INSERT INTO baroke_deals (
      id, brand, title, details, requirement, source_url,
      verified_at, expires_at, check_after, status
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'pending')
  `).run(
    "community-deal",
    "Chipotle",
    "Student-reported offer",
    "Proof needs manual review.",
    "Check location terms.",
    "https://example.com/proof",
  );
  database.prepare(`
    INSERT INTO baroke_place_deals (place_id, deal_id) VALUES (?, ?)
  `).run("chipotle-125-e-23rd", "community-deal");

  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM baroke_deals WHERE status = 'pending'").get().count,
    1,
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS count FROM baroke_deals WHERE status = 'confirmed'").get().count,
    10,
  );
  assert.equal(
    database.prepare("SELECT place_id FROM baroke_place_deals WHERE deal_id = ?").get("community-deal").place_id,
    "chipotle-125-e-23rd",
  );
});
