/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import {
  createDealsStatusIndex,
  createDealsTable,
  createPlaceDealsLookupIndex,
  createPlaceDealsTable,
  createPlacesFreshnessIndex,
  createPlacesStatusIndex,
  createPlacesTable,
  createReviewEventsEntityIndex,
  createReviewEventsImmutableDeleteTrigger,
  createReviewEventsImmutableUpdateTrigger,
  createReviewEventsQueueIndex,
  createReviewEventsTable,
  seedConfirmedDeals,
  seedPlaceDeals,
  seedVerifiedCoordinates,
  seedVerifiedPlaces,
} from "../db/schema";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  BAROKE_REVIEW_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController {
  scheduledTime: number;
  cron: string;
}

async function ensureContentSchema(db: D1Database): Promise<void> {
  await db.prepare(createPlacesTable).run();
  let placeColumns = await db.prepare("PRAGMA table_info(baroke_places)").all();
  if (!placeColumns.results.some((column) => column.name === "price_label")) {
    const createNextPlacesTable = createPlacesTable.replace("baroke_places", "baroke_places_next");
    await db.batch([
      db.prepare("DROP INDEX IF EXISTS idx_baroke_places_status_created"),
      db.prepare("DROP INDEX IF EXISTS idx_baroke_places_verified_checked"),
      db.prepare(createNextPlacesTable),
      db.prepare(`
        INSERT INTO baroke_places_next (
          id, name, meal_name, cuisine, price_min_cents, price_max_cents,
          price_label, address, location_note, student_discount, source_url,
          verification_status, last_checked_at, check_after, created_at
        )
        SELECT
          id, name, meal_name, cuisine, price_min_cents, price_max_cents,
          CASE
            WHEN price_min_cents = price_max_cents THEN printf('$%.2f', price_min_cents / 100.0)
            ELSE printf('$%.2f–$%.2f', price_min_cents / 100.0, price_max_cents / 100.0)
          END,
          address, location_note, student_discount, source_url,
          verification_status, last_checked_at,
          CASE WHEN last_checked_at IS NULL THEN NULL ELSE date(last_checked_at, '+30 days') END,
          created_at
        FROM baroke_places
      `),
      db.prepare("DROP TABLE baroke_places"),
      db.prepare("ALTER TABLE baroke_places_next RENAME TO baroke_places"),
    ]);
    placeColumns = await db.prepare("PRAGMA table_info(baroke_places)").all();
  }
  if (!placeColumns.results.some((column) => column.name === "latitude")) {
    await db.batch([
      db.prepare("ALTER TABLE baroke_places ADD COLUMN latitude REAL CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90)"),
      db.prepare("ALTER TABLE baroke_places ADD COLUMN longitude REAL CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180)"),
      db.prepare("ALTER TABLE baroke_places ADD COLUMN coordinate_source_url TEXT"),
      db.prepare("ALTER TABLE baroke_places ADD COLUMN coordinate_checked_at TEXT"),
    ]);
  }
  const seedStatements = seedConfirmedDeals.map((deal) => db.prepare(`
    INSERT OR IGNORE INTO baroke_deals (
      id, brand, title, details, requirement, source_url,
      verified_at, expires_at, check_after, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')
  `).bind(...deal));
  const placeStatements = seedVerifiedPlaces.map((place) => db.prepare(`
    INSERT OR IGNORE INTO baroke_places (
      id, name, meal_name, cuisine, price_min_cents, price_max_cents,
      price_label, address, location_note, student_discount, source_url,
      verification_status, last_checked_at, check_after, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?, ?, ?)
  `).bind(...place));
  const coordinateStatements = seedVerifiedCoordinates.map((coordinate) => db.prepare(`
    UPDATE baroke_places
    SET latitude = ?, longitude = ?, coordinate_source_url = ?, coordinate_checked_at = ?
    WHERE id = ? AND latitude IS NULL AND longitude IS NULL
  `).bind(coordinate[1], coordinate[2], coordinate[3], coordinate[4], coordinate[0]));
  const linkStatements = seedPlaceDeals.map((link) => db.prepare(`
    INSERT OR IGNORE INTO baroke_place_deals (place_id, deal_id)
    VALUES (?, ?)
  `).bind(...link));
  await db.batch([
    db.prepare(createPlacesStatusIndex),
    db.prepare(createPlacesFreshnessIndex),
    db.prepare(createDealsTable),
    db.prepare(createDealsStatusIndex),
    db.prepare(createPlaceDealsTable),
    db.prepare(createPlaceDealsLookupIndex),
    db.prepare(createReviewEventsTable),
    db.prepare(createReviewEventsEntityIndex),
    db.prepare(createReviewEventsQueueIndex),
    db.prepare(createReviewEventsImmutableUpdateTrigger),
    db.prepare(createReviewEventsImmutableDeleteTrigger),
    ...seedStatements,
    ...placeStatements,
    ...coordinateStatements,
    ...linkStatements,
  ]);
}

async function sweepStalePlaces(db: D1Database): Promise<number> {
  const [, result] = await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO baroke_review_events (
        id, entity_type, entity_id, event_type, from_status, to_status,
        reason, actor, occurred_at
      )
      SELECT
        id || ':verification_overdue:' || date('now'), 'place', id,
        'verification_overdue', 'verified', 'needs_review',
        'The recorded evidence recheck date passed.', 'system-sweep', datetime('now')
      FROM baroke_places
      WHERE verification_status = 'verified'
        AND check_after IS NOT NULL
        AND check_after < date('now')
    `),
    db.prepare(`
      UPDATE baroke_places
      SET verification_status = 'needs_review'
      WHERE verification_status = 'verified'
        AND check_after IS NOT NULL
        AND check_after < date('now')
    `),
  ]);
  return result.meta.changes ?? 0;
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "cache-control": "no-store" } });
}

async function listPlaces(env: Env): Promise<Response> {
  await ensureContentSchema(env.DB);
  await sweepStalePlaces(env.DB);
  await sweepStaleDeals(env.DB);
  const [placeResult, dealResult] = await env.DB.batch([
    env.DB.prepare(`
    SELECT id, name, meal_name, cuisine, price_min_cents, price_max_cents, price_label,
           address, location_note, student_discount, source_url,
           latitude, longitude, coordinate_source_url, coordinate_checked_at,
           verification_status, last_checked_at, check_after
    FROM baroke_places
    WHERE verification_status = 'verified'
    ORDER BY price_min_cents IS NULL, price_min_cents, name
  `),
    env.DB.prepare(`
      SELECT pd.place_id, d.id, d.brand, d.title, d.details, d.requirement,
             d.source_url, d.verified_at, d.expires_at, d.check_after
      FROM baroke_place_deals pd
      JOIN baroke_deals d ON d.id = pd.deal_id
      JOIN baroke_places p ON p.id = pd.place_id
      WHERE p.verification_status = 'verified' AND d.status = 'confirmed'
      ORDER BY pd.place_id, d.title
    `),
  ]);
  const dealsByPlace = new Map<string, unknown[]>();
  for (const row of dealResult.results) {
    const placeId = String(row.place_id);
    const existing = dealsByPlace.get(placeId) ?? [];
    existing.push(row);
    dealsByPlace.set(placeId, existing);
  }
  return json({
    places: placeResult.results.map((place) => ({
      ...place,
      deals: dealsByPlace.get(String(place.id)) ?? [],
    })),
    verification_policy: "Published places require evidence review. Each place and deal disappears after its recorded recheck or expiration boundary.",
  });
}

async function submitPlace(request: Request, env: Env): Promise<Response> {
  await ensureContentSchema(env.DB);
  const input = await request.json() as Record<string, unknown>;
  const name = String(input.name ?? "").trim();
  const mealName = String(input.meal_name ?? "").trim();
  const cuisine = String(input.cuisine ?? "").trim();
  const address = String(input.address ?? "").trim();
  const locationNote = String(input.location_note ?? "").trim();
  const sourceUrl = String(input.source_url ?? "").trim() || null;
  const mealPrice = Number(input.meal_price);
  if (!name || !cuisine || !address) {
    return json({ error: "Place, cuisine, meal price, and address are required." }, 422);
  }
  if (!Number.isFinite(mealPrice) || mealPrice <= 0) {
    return json({ error: "Enter a valid meal price." }, 422);
  }
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    return json({ error: "Evidence links must start with http:// or https://." }, 422);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`
    INSERT INTO baroke_places (
      id, name, meal_name, cuisine, price_min_cents, price_max_cents,
      price_label, address, location_note, student_discount, source_url,
      verification_status, last_checked_at, check_after, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, NULL, ?)
    `).bind(
      id,
      name,
      mealName || "Meal",
      cuisine,
      Math.round(mealPrice * 100),
      Math.round(mealPrice * 100),
      `$${mealPrice.toFixed(2)}`,
      address,
      locationNote,
      input.student_discount === true ? 1 : 0,
      sourceUrl,
      createdAt,
    ),
    env.DB.prepare(`
      INSERT INTO baroke_review_events (
        id, entity_type, entity_id, event_type, from_status, to_status,
        reason, actor, occurred_at
      ) VALUES (?, 'place', ?, 'submitted', NULL, 'pending', ?, 'public-submission', ?)
    `).bind(
      crypto.randomUUID(),
      id,
      sourceUrl ? "Student submitted a place with an evidence link." : "Student submitted a place without an evidence link.",
      createdAt,
    ),
  ]);
  return json({ id, verification_status: "pending", message: "Place saved for manual verification." }, 201);
}

async function submitDeal(request: Request, env: Env, placeId: string): Promise<Response> {
  await ensureContentSchema(env.DB);
  const input = await request.json() as Record<string, unknown>;
  const title = String(input.title ?? "").trim();
  const details = String(input.details ?? "").trim();
  const requirement = String(input.requirement ?? "").trim();
  const sourceUrl = String(input.source_url ?? "").trim();
  if (title.length < 3 || details.length < 8 || !/^https?:\/\//i.test(sourceUrl)) {
    return json({ error: "Deal title, specific details, and an http:// or https:// proof link are required." }, 422);
  }
  const place = await env.DB.prepare(`
    SELECT id, name FROM baroke_places
    WHERE id = ? AND verification_status = 'verified'
  `).bind(placeId).first<{ id: string; name: string }>();
  if (!place) return json({ error: "Choose a currently verified place." }, 404);

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO baroke_deals (
        id, brand, title, details, requirement, source_url,
        verified_at, expires_at, check_after, status
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 'pending')
    `).bind(id, place.name, title, details, requirement || "Confirm the terms at the location before ordering.", sourceUrl),
    env.DB.prepare(`
      INSERT INTO baroke_place_deals (place_id, deal_id) VALUES (?, ?)
    `).bind(place.id, id),
    env.DB.prepare(`
      INSERT INTO baroke_review_events (
        id, entity_type, entity_id, event_type, from_status, to_status,
        reason, actor, occurred_at
      ) VALUES (?, 'deal', ?, 'submitted', NULL, 'pending', ?, 'public-submission', ?)
    `).bind(crypto.randomUUID(), id, "Student submitted a deal with a proof link for manual review.", createdAt),
  ]);
  return json({ id, status: "pending", message: "Deal saved for manual verification." }, 201);
}

async function sweepStaleDeals(db: D1Database): Promise<number> {
  const [, , expired, stale] = await db.batch([
    db.prepare(`
      INSERT OR IGNORE INTO baroke_review_events (
        id, entity_type, entity_id, event_type, from_status, to_status,
        reason, actor, occurred_at
      )
      SELECT
        id || ':deal_expired:' || date('now'), 'deal', id, 'deal_expired',
        'confirmed', 'expired', 'The source stated expiration date passed.',
        'system-sweep', datetime('now')
      FROM baroke_deals
      WHERE status = 'confirmed'
        AND expires_at IS NOT NULL
        AND expires_at < date('now')
    `),
    db.prepare(`
      INSERT OR IGNORE INTO baroke_review_events (
        id, entity_type, entity_id, event_type, from_status, to_status,
        reason, actor, occurred_at
      )
      SELECT
        id || ':deal_review_overdue:' || date('now'), 'deal', id,
        'deal_review_overdue', 'confirmed', 'needs_review',
        'The deal has no stated ending and its recheck date passed.',
        'system-sweep', datetime('now')
      FROM baroke_deals
      WHERE status = 'confirmed'
        AND expires_at IS NULL
        AND check_after < date('now')
    `),
    db.prepare(`
      UPDATE baroke_deals
      SET status = 'expired'
      WHERE status = 'confirmed'
        AND expires_at IS NOT NULL
        AND expires_at < date('now')
    `),
    db.prepare(`
      UPDATE baroke_deals
      SET status = 'needs_review'
      WHERE status = 'confirmed'
        AND expires_at IS NULL
        AND check_after < date('now')
    `),
  ]);
  return (expired.meta.changes ?? 0) + (stale.meta.changes ?? 0);
}

function reviewActor(request: Request, env: Env): string | Response {
  if (!env.BAROKE_REVIEW_KEY) {
    return json({ error: "Review access is not configured." }, 503);
  }
  if (request.headers.get("x-baroke-review-key") !== env.BAROKE_REVIEW_KEY) {
    return json({ error: "Review access denied." }, 401);
  }
  const authenticatedUserId = request.headers.get("oai-authenticated-user-id");
  return authenticatedUserId ? `oai-user:${authenticatedUserId}` : "review-key";
}

async function listReviewQueue(request: Request, env: Env): Promise<Response> {
  const actor = reviewActor(request, env);
  if (actor instanceof Response) return actor;
  await ensureContentSchema(env.DB);
  await sweepStalePlaces(env.DB);
  await sweepStaleDeals(env.DB);
  const [places, deals, events] = await env.DB.batch([
    env.DB.prepare(`
      SELECT id, name, meal_name, cuisine, price_label, address, location_note,
             source_url, latitude, longitude, coordinate_source_url, coordinate_checked_at,
             verification_status, last_checked_at, check_after, created_at
      FROM baroke_places
      WHERE verification_status IN ('pending', 'needs_review')
      ORDER BY CASE verification_status WHEN 'needs_review' THEN 0 ELSE 1 END,
               created_at
    `),
    env.DB.prepare(`
      SELECT id, brand, title, source_url, status, verified_at, expires_at, check_after
      FROM baroke_deals
      WHERE status IN ('pending', 'needs_review', 'expired')
      ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'needs_review' THEN 1 ELSE 2 END,
               check_after, brand
    `),
    env.DB.prepare(`
      SELECT id, entity_type, entity_id, event_type, from_status, to_status,
             reason, actor, occurred_at
      FROM baroke_review_events
      ORDER BY occurred_at DESC, id DESC
      LIMIT 100
    `),
  ]);
  return json({
    places: places.results,
    deals: deals.results,
    events: events.results,
    rule: "Review records are append-only. A protected decision must verify or reject each place before its public status changes.",
  });
}

async function listDealReviewHistory(
  request: Request,
  env: Env,
  dealId: string,
): Promise<Response> {
  const actor = reviewActor(request, env);
  if (actor instanceof Response) return actor;
  await ensureContentSchema(env.DB);

  const deal = await env.DB.prepare(`
    SELECT id, brand, title, status, source_url, verified_at, expires_at, check_after
    FROM baroke_deals
    WHERE id = ?
  `).bind(dealId).first<Record<string, unknown>>();
  if (!deal) return json({ error: "Deal not found." }, 404);

  const events = await env.DB.prepare(`
    SELECT id, entity_type, entity_id, event_type, from_status, to_status,
           reason, actor, occurred_at
    FROM baroke_review_events
    WHERE entity_type = 'deal' AND entity_id = ?
    ORDER BY occurred_at DESC, id DESC
  `).bind(dealId).all();

  return json({
    deal,
    events: events.results,
    rule: "This entity history is append-only and available only through the protected review route.",
  });
}

async function decidePlaceReview(
  request: Request,
  env: Env,
  placeId: string,
): Promise<Response> {
  const actor = reviewActor(request, env);
  if (actor instanceof Response) return actor;
  await ensureContentSchema(env.DB);
  const input = await request.json() as Record<string, unknown>;
  const decision = String(input.decision ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  const clientCommandId = String(input.client_command_id ?? "").trim();
  if (!['verify', 'reject'].includes(decision) || reason.length < 8 || clientCommandId.length < 8) {
    return json({ error: "Decision, a specific reason, and a command ID are required." }, 422);
  }
  const eventId = `review-command:${clientCommandId}`;
  const previousCommand = await env.DB.prepare(`
    SELECT entity_id, to_status FROM baroke_review_events WHERE id = ?
  `).bind(eventId).first<Record<string, unknown>>();
  const targetStatus = decision === "verify" ? "verified" : "rejected";
  if (previousCommand) {
    if (previousCommand.entity_id === placeId && previousCommand.to_status === targetStatus) {
      return json({ id: placeId, status: targetStatus, decision, idempotent: true });
    }
    return json({ error: "That review command ID was already used for another decision." }, 409);
  }
  const place = await env.DB.prepare(`
    SELECT id, source_url, verification_status FROM baroke_places WHERE id = ?
  `).bind(placeId).first<Record<string, unknown>>();
  if (!place) return json({ error: "Place not found." }, 404);
  const previousStatus = String(place.verification_status);
  if (!['pending', 'needs_review'].includes(previousStatus)) {
    return json({ error: "Only queued places can receive a review decision." }, 409);
  }

  const occurredAt = new Date().toISOString();
  const today = occurredAt.slice(0, 10);
  const sourceUrl = String(input.source_url ?? place.source_url ?? "").trim();
  const checkAfter = String(input.check_after ?? "").trim();
  const latitudeInput = input.latitude === undefined || input.latitude === null || input.latitude === "" ? null : Number(input.latitude);
  const longitudeInput = input.longitude === undefined || input.longitude === null || input.longitude === "" ? null : Number(input.longitude);
  const coordinateSourceUrl = String(input.coordinate_source_url ?? "").trim();
  const suppliedCoordinatePart = latitudeInput !== null || longitudeInput !== null || Boolean(coordinateSourceUrl);
  if (decision === "verify") {
    if (!/^https?:\/\//i.test(sourceUrl)) {
      return json({ error: "Verification requires an http:// or https:// evidence link." }, 422);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkAfter) || checkAfter <= today) {
      return json({ error: "Verification requires a future YYYY-MM-DD recheck date." }, 422);
    }
    if (suppliedCoordinatePart && (
      latitudeInput === null || !Number.isFinite(latitudeInput) || latitudeInput < -90 || latitudeInput > 90
      || longitudeInput === null || !Number.isFinite(longitudeInput) || longitudeInput < -180 || longitudeInput > 180
      || !/^https?:\/\//i.test(coordinateSourceUrl)
    )) {
      return json({ error: "Coordinates require valid latitude, longitude, and an evidence URL." }, 422);
    }
  }
  const eventType = decision === "reject"
    ? "place_rejected"
    : previousStatus === "needs_review" ? "place_reverified" : "place_verified";
  const eventInsert = env.DB.prepare(`
    INSERT OR IGNORE INTO baroke_review_events (
      id, entity_type, entity_id, event_type, from_status, to_status,
      reason, actor, occurred_at
    )
    SELECT ?, 'place', id, ?, verification_status, ?, ?, ?, ?
    FROM baroke_places
    WHERE id = ? AND verification_status = ?
  `).bind(
    eventId,
    eventType,
    targetStatus,
    reason,
    actor,
    occurredAt,
    placeId,
    previousStatus,
  );
  const placeUpdate = decision === "verify"
    ? env.DB.prepare(`
        UPDATE baroke_places
        SET verification_status = 'verified', source_url = ?,
            last_checked_at = ?, check_after = ?,
            latitude = COALESCE(?, latitude), longitude = COALESCE(?, longitude),
            coordinate_source_url = COALESCE(?, coordinate_source_url),
            coordinate_checked_at = CASE WHEN ? IS NULL THEN coordinate_checked_at ELSE ? END
        WHERE id = ? AND verification_status = ?
      `).bind(
        sourceUrl, occurredAt, checkAfter,
        latitudeInput, longitudeInput, coordinateSourceUrl || null,
        latitudeInput, today, placeId, previousStatus,
      )
    : env.DB.prepare(`
        UPDATE baroke_places
        SET verification_status = 'rejected', check_after = NULL
        WHERE id = ? AND verification_status = ?
      `).bind(placeId, previousStatus);
  const [, updated] = await env.DB.batch([eventInsert, placeUpdate]);
  if ((updated.meta.changes ?? 0) !== 1) {
    return json({ error: "The queue changed before this decision was applied. Reload and retry." }, 409);
  }
  return json({
    id: placeId,
    status: targetStatus,
    decision,
    last_checked_at: decision === "verify" ? occurredAt : null,
    check_after: decision === "verify" ? checkAfter : null,
    idempotent: false,
  });
}

async function decideDealReview(
  request: Request,
  env: Env,
  dealId: string,
): Promise<Response> {
  const actor = reviewActor(request, env);
  if (actor instanceof Response) return actor;
  await ensureContentSchema(env.DB);
  const input = await request.json() as Record<string, unknown>;
  const decision = String(input.decision ?? "").trim();
  const reason = String(input.reason ?? "").trim();
  const clientCommandId = String(input.client_command_id ?? "").trim();
  if (!["confirm", "reject"].includes(decision) || reason.length < 8 || clientCommandId.length < 8) {
    return json({ error: "Decision, a specific reason, and a command ID are required." }, 422);
  }

  const targetStatus = decision === "confirm" ? "confirmed" : "rejected";
  const eventId = `review-command:${clientCommandId}`;
  const previousCommand = await env.DB.prepare(`
    SELECT entity_type, entity_id, to_status
    FROM baroke_review_events WHERE id = ?
  `).bind(eventId).first<Record<string, unknown>>();
  if (previousCommand) {
    if (
      previousCommand.entity_type === "deal"
      && previousCommand.entity_id === dealId
      && previousCommand.to_status === targetStatus
    ) {
      return json({ id: dealId, status: targetStatus, decision, idempotent: true });
    }
    return json({ error: "That review command ID was already used for another decision." }, 409);
  }

  const deal = await env.DB.prepare(`
    SELECT id, source_url, status, expires_at, check_after
    FROM baroke_deals WHERE id = ?
  `).bind(dealId).first<Record<string, unknown>>();
  if (!deal) return json({ error: "Deal not found." }, 404);
  const previousStatus = String(deal.status);
  if (!["pending", "needs_review", "expired"].includes(previousStatus)) {
    return json({ error: "Only queued deals can receive a review decision." }, 409);
  }

  const occurredAt = new Date().toISOString();
  const today = occurredAt.slice(0, 10);
  const sourceUrl = String(input.source_url ?? deal.source_url ?? "").trim();
  const checkAfter = String(input.check_after ?? "").trim();
  const expiresAt = String(input.expires_at ?? "").trim() || null;
  if (decision === "confirm") {
    if (!/^https?:\/\//i.test(sourceUrl)) {
      return json({ error: "Confirmation requires an http:// or https:// evidence link." }, 422);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkAfter) || checkAfter <= today) {
      return json({ error: "Confirmation requires a future YYYY-MM-DD recheck date." }, 422);
    }
    if (expiresAt && (!/^\d{4}-\d{2}-\d{2}$/.test(expiresAt) || expiresAt < today)) {
      return json({ error: "An expiration date must be today or a future YYYY-MM-DD date." }, 422);
    }
  }

  const eventType = decision === "confirm"
    ? previousStatus === "pending" ? "deal_confirmed" : "deal_reconfirmed"
    : "deal_rejected";
  const eventInsert = env.DB.prepare(`
    INSERT OR IGNORE INTO baroke_review_events (
      id, entity_type, entity_id, event_type, from_status, to_status,
      reason, actor, occurred_at
    )
    SELECT ?, 'deal', id, ?, status, ?, ?, ?, ?
    FROM baroke_deals
    WHERE id = ? AND status = ?
  `).bind(
    eventId,
    eventType,
    targetStatus,
    reason,
    actor,
    occurredAt,
    dealId,
    previousStatus,
  );
  const dealUpdate = decision === "confirm"
    ? env.DB.prepare(`
        UPDATE baroke_deals
        SET status = 'confirmed', source_url = ?, verified_at = ?,
            expires_at = ?, check_after = ?
        WHERE id = ? AND status = ?
      `).bind(sourceUrl, today, expiresAt, checkAfter, dealId, previousStatus)
    : env.DB.prepare(`
        UPDATE baroke_deals
        SET status = 'rejected'
        WHERE id = ? AND status = ?
      `).bind(dealId, previousStatus);
  const [, updated] = await env.DB.batch([eventInsert, dealUpdate]);
  if ((updated.meta.changes ?? 0) !== 1) {
    return json({ error: "The queue changed before this decision was applied. Reload and retry." }, 409);
  }
  return json({
    id: dealId,
    status: targetStatus,
    decision,
    verified_at: decision === "confirm" ? today : null,
    expires_at: decision === "confirm" ? expiresAt : null,
    check_after: decision === "confirm" ? checkAfter : null,
    idempotent: false,
  });
}

async function listDeals(env: Env): Promise<Response> {
  await ensureContentSchema(env.DB);
  await sweepStaleDeals(env.DB);
  const [result, freshness] = await env.DB.batch([
    env.DB.prepare(`
      SELECT id, brand, title, details, requirement, source_url,
             verified_at, expires_at, check_after
      FROM baroke_deals
      WHERE status = 'confirmed'
      ORDER BY brand, title
    `),
    env.DB.prepare(`
      SELECT
        COUNT(*) AS confirmed_count,
        COALESCE(SUM(CASE
          WHEN expires_at IS NOT NULL
           AND expires_at BETWEEN date('now') AND date('now', '+7 days')
          THEN 1 ELSE 0 END), 0) AS expires_within_7_days,
        COALESCE(SUM(CASE
          WHEN expires_at IS NULL
           AND check_after BETWEEN date('now') AND date('now', '+7 days')
          THEN 1 ELSE 0 END), 0) AS rechecks_within_7_days,
        MIN(COALESCE(expires_at, check_after)) AS next_boundary
      FROM baroke_deals
      WHERE status = 'confirmed'
    `),
  ]);
  return json({
    deals: result.results,
    freshness: {
      as_of: new Date().toISOString(),
      ...(freshness.results[0] ?? {
        confirmed_count: 0,
        expires_within_7_days: 0,
        rechecks_within_7_days: 0,
        next_boundary: null,
      }),
    },
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/places" && request.method === "GET") {
      return listPlaces(env);
    }
    if (url.pathname === "/api/places" && request.method === "POST") {
      return submitPlace(request, env);
    }
    const dealSubmissionMatch = url.pathname.match(/^\/api\/places\/([^/]+)\/deals$/);
    if (dealSubmissionMatch && request.method === "POST") {
      return submitDeal(request, env, decodeURIComponent(dealSubmissionMatch[1]));
    }
    if (url.pathname === "/api/deals" && request.method === "GET") {
      return listDeals(env);
    }
    if (url.pathname === "/api/internal/review-queue" && request.method === "GET") {
      return listReviewQueue(request, env);
    }
    const placeReviewMatch = url.pathname.match(/^\/api\/internal\/review-queue\/places\/([^/]+)$/);
    if (placeReviewMatch && request.method === "POST") {
      return decidePlaceReview(request, env, decodeURIComponent(placeReviewMatch[1]));
    }
    const dealReviewMatch = url.pathname.match(/^\/api\/internal\/review-queue\/deals\/([^/]+)$/);
    if (dealReviewMatch && request.method === "GET") {
      return listDealReviewHistory(request, env, decodeURIComponent(dealReviewMatch[1]));
    }
    if (dealReviewMatch && request.method === "POST") {
      return decideDealReview(request, env, decodeURIComponent(dealReviewMatch[1]));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => {
      await ensureContentSchema(env.DB);
      await sweepStalePlaces(env.DB);
      await sweepStaleDeals(env.DB);
    })());
  },
};

export default worker;
