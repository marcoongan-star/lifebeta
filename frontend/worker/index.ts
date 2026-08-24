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
  seedConfirmedDeals,
  seedPlaceDeals,
  seedVerifiedPlaces,
} from "../db/schema";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
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
  const placeColumns = await db.prepare("PRAGMA table_info(baroke_places)").all();
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
    ...seedStatements,
    ...placeStatements,
    ...linkStatements,
  ]);
}

async function sweepStalePlaces(db: D1Database): Promise<number> {
  const result = await db.prepare(`
    UPDATE baroke_places
    SET verification_status = 'needs_review'
    WHERE verification_status = 'verified'
      AND check_after IS NOT NULL
      AND check_after < date('now')
  `).run();
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
  await env.DB.prepare(`
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
  ).run();
  return json({ id, verification_status: "pending", message: "Place saved for manual verification." }, 201);
}

async function sweepStaleDeals(db: D1Database): Promise<number> {
  const [expired, stale] = await db.batch([
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

async function listDeals(env: Env): Promise<Response> {
  await ensureContentSchema(env.DB);
  await sweepStaleDeals(env.DB);
  const result = await env.DB.prepare(`
    SELECT id, brand, title, details, requirement, source_url,
           verified_at, expires_at, check_after
    FROM baroke_deals
    WHERE status = 'confirmed'
    ORDER BY brand, title
  `).all();
  return json({ deals: result.results });
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
    if (url.pathname === "/api/deals" && request.method === "GET") {
      return listDeals(env);
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
