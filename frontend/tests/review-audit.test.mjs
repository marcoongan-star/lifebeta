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
