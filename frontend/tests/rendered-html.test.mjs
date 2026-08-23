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

test("server-renders the Baroque student food launch story", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Baroque — Baruch Student Eats, powered by LifeBeta<\/title>/i);
  assert.match(html, /The city got expensive/);
  assert.match(html, /\+37\.3%/);
  assert.match(html, /Seeded demonstration listings/i);
  assert.match(html, /They are not active offers or usable codes/i);
  assert.match(html, /nothing is uploaded/i);
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
