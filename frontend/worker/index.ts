/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { createPlacesFreshnessIndex, createPlacesStatusIndex, createPlacesTable } from "../db/schema";

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

async function ensurePlaceSchema(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(createPlacesTable),
    db.prepare(createPlacesStatusIndex),
    db.prepare(createPlacesFreshnessIndex),
  ]);
}

async function sweepStalePlaces(db: D1Database): Promise<number> {
  const result = await db.prepare(`
    UPDATE baroke_places
    SET verification_status = 'needs_review'
    WHERE verification_status = 'verified'
      AND (last_checked_at IS NULL OR last_checked_at < datetime('now', '-1 day'))
  `).run();
  return result.meta.changes ?? 0;
}

function json(payload: unknown, status = 200): Response {
  return Response.json(payload, { status, headers: { "cache-control": "no-store" } });
}

async function listPlaces(env: Env): Promise<Response> {
  await ensurePlaceSchema(env.DB);
  await sweepStalePlaces(env.DB);
  const result = await env.DB.prepare(`
    SELECT id, name, meal_name, cuisine, price_min_cents, price_max_cents,
           address, location_note, student_discount, source_url,
           verification_status, last_checked_at
    FROM baroke_places
    WHERE verification_status = 'verified'
    ORDER BY price_min_cents, name
  `).all();
  return json({
    places: result.results,
    verification_policy: "Only manually verified places are published. Records return to needs_review after 24 hours without a fresh check.",
  });
}

async function submitPlace(request: Request, env: Env): Promise<Response> {
  await ensurePlaceSchema(env.DB);
  const input = await request.json() as Record<string, unknown>;
  const name = String(input.name ?? "").trim();
  const mealName = String(input.meal_name ?? "").trim();
  const cuisine = String(input.cuisine ?? "").trim();
  const address = String(input.address ?? "").trim();
  const locationNote = String(input.location_note ?? "").trim();
  const sourceUrl = String(input.source_url ?? "").trim() || null;
  const priceMin = Number(input.price_min);
  const priceMax = Number(input.price_max);
  if (!name || !mealName || !cuisine || !address || !locationNote) {
    return json({ error: "Place, meal, cuisine, address, and location details are required." }, 422);
  }
  if (!Number.isFinite(priceMin) || !Number.isFinite(priceMax) || priceMin <= 0 || priceMax < priceMin) {
    return json({ error: "Enter a valid meal price range." }, 422);
  }
  if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
    return json({ error: "Evidence links must start with http:// or https://." }, 422);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO baroke_places (
      id, name, meal_name, cuisine, price_min_cents, price_max_cents,
      address, location_note, student_discount, source_url,
      verification_status, last_checked_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?)
  `).bind(
    id,
    name,
    mealName,
    cuisine,
    Math.round(priceMin * 100),
    Math.round(priceMax * 100),
    address,
    locationNote,
    input.student_discount === true ? 1 : 0,
    sourceUrl,
    createdAt,
  ).run();
  return json({ id, verification_status: "pending", message: "Place saved for manual verification." }, 201);
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
      await ensurePlaceSchema(env.DB);
      await sweepStalePlaces(env.DB);
    })());
  },
};

export default worker;
