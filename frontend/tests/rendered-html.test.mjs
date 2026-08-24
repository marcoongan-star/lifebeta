import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the simplified Baroke place experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Baroke — Verified Meal Prices<\/title>/i);
  assert.match(html, /The city got expensive/);
  assert.match(html, /\+37\.3%/);
  assert.match(html, /MEAL PRICE THEN/i);
  assert.match(html, /MEALS LOST \/ WEEK/i);
  assert.match(html, /Confirmed deals/i);
  assert.match(html, /SOURCE-CHECKED AUGUST 24, 2026/i);
  assert.match(html, /Choose a place to see its checked offers/i);
  assert.match(html, /Current deal only/i);
  assert.match(html, /Add a place/i);
  assert.match(html, /MEAL PRICE/i);
  assert.match(html, /class="hero-proof"><span>POWERED BY LIFEBETA<\/span>/i);
  assert.doesNotMatch(html, /<small>POWERED BY LIFEBETA<\/small>/i);
  assert.doesNotMatch(html, /Only manually verified places/i);
  assert.doesNotMatch(html, /These fixed base metrics/i);
  assert.doesNotMatch(html, /BARUCH STUDENT EATS/i);
  assert.doesNotMatch(html, /INTERACTIVE PRODUCT PREVIEW/i);
  assert.doesNotMatch(html, /A code is only useful/i);
  assert.doesNotMatch(html, /COMMUNITY SIGNAL/i);
  assert.doesNotMatch(html, /Same calculation as/i);
  assert.doesNotMatch(html, /OFFICIAL BENCHMARK/i);
  assert.doesNotMatch(html, /LIFEBETA MEASURES THE PROBLEM/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the LifeBeta tracker available as the evidence layer", async () => {
  const response = await render("/tracker");
  const html = await response.text();
  assert.match(html, /<title>LifeBeta Food Inflation Tracker<\/title>/i);
  assert.match(html, /Inflation is personal/);
  assert.match(html, /Training Day/);
  assert.match(html, /stale observation/);
  assert.match(html, /Your basket/);
  assert.match(html, /Released CPI/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("states the data-quality and privacy rules", async () => {
  const response = await render("/tracker");
  const html = await response.text();
  assert.match(html, /Block missing endpoints/);
  assert.match(html, /never raw Fidelity holdings/i);
  assert.match(html, /no fabricated live prices/i);
});
