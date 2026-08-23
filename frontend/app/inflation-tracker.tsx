"use client";

import Link from "next/link";
import { useState } from "react";

type Product = { name: string; detail: string; category: string; start: number; current: number | null; age: number; weight: number };
type Basket = { id: string; name: string; period: string; cpi: number; products: Product[] };

const baskets: Basket[] = [
  { id: "training", name: "Training Day", period: "Jan 2024 → Aug 2026", cpi: 8.7, products: [
    { name: "Chicken bowl", detail: "Chipotle · chicken, rice, black beans, fajita vegetables, pico, sour cream", category: "Food", start: 9.25, current: 11.35, age: 8, weight: 35 },
    { name: "Built Bar 4-pack", detail: "Normalized to price per bar", category: "Protein", start: 9.99, current: 12.49, age: 16, weight: 20 },
    { name: "LA Fitness membership", detail: "Monthly recurring price", category: "Gym", start: 34.99, current: 39.99, age: 12, weight: 30 },
    { name: "Common zip-up", detail: "Comparable midweight cotton blend", category: "Clothes", start: 55, current: 65, age: 51, weight: 15 },
  ]},
  { id: "matchday", name: "Matchday Kit", period: "Aug 2024 → Aug 2026", cpi: 6.1, products: [
    { name: "Liverpool home jersey", detail: "Adult stadium shirt · missing current observation", category: "Jerseys", start: 89.99, current: null, age: 0, weight: 45 },
    { name: "Barcelona home jersey", detail: "Adult stadium shirt", category: "Jerseys", start: 89.99, current: 99.99, age: 21, weight: 30 },
    { name: "Spain home jersey", detail: "Adult replica shirt", category: "Jerseys", start: 95, current: 100, age: 31, weight: 25 },
  ]},
  { id: "everyday", name: "Everyday Core", period: "Jan 2024 → Aug 2026", cpi: 8.7, products: [
    { name: "Spotify Premium", detail: "Individual monthly plan", category: "Subscription", start: 10.99, current: 12.99, age: 10, weight: 20 },
    { name: "Chicken bowl", detail: "Same normalized Chipotle configuration", category: "Food", start: 9.25, current: 11.35, age: 8, weight: 30 },
    { name: "Barebells 4-pack", detail: "Normalized to price per bar", category: "Protein", start: 10.49, current: 12.99, age: 18, weight: 20 },
    { name: "LA Fitness membership", detail: "Monthly recurring price", category: "Gym", start: 34.99, current: 39.99, age: 12, weight: 30 },
  ]},
];

export function InflationTracker() {
  const [basketId, setBasketId] = useState("training");
  const [base, setBase] = useState<"weighted" | "equal">("weighted");
  const basket = baskets.find((item) => item.id === basketId) ?? baskets[0];
  const missing = basket.products.filter((product) => product.current === null);
  const stale = basket.products.filter((product) => product.current !== null && product.age > 45);
  const inflation = (() => {
    if (missing.length) return null;
    const weighted = basket.products.reduce((total, product) => {
      const change = ((product.current! / product.start) - 1) * 100;
      return total + change * (base === "equal" ? 1 / basket.products.length : product.weight / 100);
    }, 0);
    return weighted;
  })();

  return (
    <main className="life-shell">
      <header className="life-nav"><Link href="/tracker" className="life-brand"><span>β</span><strong>LIFEBETA</strong></Link><nav><Link href="/">Baroke</Link><a href="#basket">My basket</a><a href="#method">Method</a></nav><div className="privacy-chip">PRIVATE BY DEFAULT</div></header>

      <section className="life-hero" id="top">
        <div><p>YOUR COST OF LIVING · MEASURED</p><h1>Inflation is personal.<br /><em>Track yours.</em></h1><span>Build an index from the food, gym, jerseys, clothes, and subscriptions you actually buy—then compare it with released CPI.</span></div>
        <aside><small>SELECT SAVED BASKET</small>{baskets.map((item) => <button key={item.id} onClick={() => setBasketId(item.id)} className={basket.id === item.id ? "active" : ""}><span>{item.name}</span><i>{item.products.length} products</i><b>→</b></button>)}</aside>
      </section>

      <section className="life-dashboard" id="basket">
        <header className="basket-head"><div><small>SAVED BASKET</small><h2>{basket.name}</h2><p>{basket.period} · seeded observations</p></div><div className="method-switch"><small>WEIGHTING</small><button className={base === "weighted" ? "active" : ""} onClick={() => setBase("weighted")}>My spending</button><button className={base === "equal" ? "active" : ""} onClick={() => setBase("equal")}>Equal</button></div></header>

        {missing.length > 0 ? <div className="quality-banner missing"><span>!</span><div><strong>Calculation blocked: {missing.length} current price missing</strong><p>Add an observation for {missing.map((item) => item.name).join(", ")}. LifeBeta will not silently drop a product and distort your index.</p></div><button>Add price</button></div> : stale.length > 0 ? <div className="quality-banner stale"><span>△</span><div><strong>Calculated with {stale.length} stale observation</strong><p>{stale.map((item) => item.name).join(", ")} was last checked more than 45 days ago. The result remains available with this warning.</p></div><button>Review</button></div> : <div className="quality-banner fresh"><span>✓</span><div><strong>Basket is ready</strong><p>Every product has a current, normalized observation with provenance.</p></div></div>}

        <div className="metric-grid">
          <article className={inflation === null ? "blocked" : ""}><small>YOUR BASKET</small><strong>{inflation === null ? "—" : `+${inflation.toFixed(1)}%`}</strong><span>{inflation === null ? "Waiting for complete data" : "Cumulative price change"}</span></article>
          <article><small>RELEASED CPI</small><strong>+{basket.cpi.toFixed(1)}%</strong><span>Comparable published period</span></article>
          <article><small>PERSONAL GAP</small><strong>{inflation === null ? "—" : `${inflation - basket.cpi >= 0 ? "+" : ""}${(inflation - basket.cpi).toFixed(1)} pts`}</strong><span>Your basket minus CPI</span></article>
          <article className="buying-power"><small>$100 THEN BUYS</small><strong>{inflation === null ? "—" : `$${(100 / (1 + inflation / 100)).toFixed(2)}`}</strong><span>in base-period dollars</span></article>
        </div>

        <div className="basket-grid">
          <article className="products-panel"><div className="life-section-head"><div><small>NORMALIZED PRODUCTS</small><h3>Price history</h3></div><span>{basket.products.length} tracked</span></div>
            <div className="product-head"><span>PRODUCT</span><span>START</span><span>LATEST</span><span>CHANGE</span><span>STATUS</span></div>
            {basket.products.map((product) => { const change = product.current === null ? null : (product.current / product.start - 1) * 100; return <div className="product-row" key={product.name}><div><b>{product.name}</b><small>{product.detail}</small></div><span>${product.start.toFixed(2)}</span><strong>{product.current === null ? "Missing" : `$${product.current.toFixed(2)}`}</strong><span className={change === null ? "muted" : "hot"}>{change === null ? "—" : `+${change.toFixed(1)}%`}</span><i className={product.current === null ? "missing" : product.age > 45 ? "stale" : "fresh"}>{product.current === null ? "Missing" : product.age > 45 ? `${product.age}d old` : "Current"}</i></div>; })}
          </article>

          <article className="drivers-panel"><div className="life-section-head"><div><small>FIRST-PRINCIPLES VIEW</small><h3>What drives it</h3></div></div>{basket.products.map((product) => { const change = product.current === null ? 0 : (product.current / product.start - 1) * 100; return <div className="driver" key={product.name}><div><span>{product.category}</span><strong>{product.current === null ? "Missing" : `+${change.toFixed(1)}%`}</strong></div><div><i style={{ width: `${Math.min(100, change * 3)}%` }} /></div><small>{base === "weighted" ? `${product.weight}% basket weight` : "Equal weight"}</small></div>; })}<p>Price change is computed product by product after unit normalization, then aggregated with the selected weights.</p></article>
        </div>
      </section>

      <section className="life-method" id="method"><span>THE TRUST BOUNDARY</span><h2>Complete data before clean numbers.</h2><div><article><b>01</b><strong>Normalize</strong><p>Compare the same quantity, configuration, currency, and recurring period.</p></article><article><b>02</b><strong>Validate</strong><p>Block missing endpoints. Warn—but do not hide—older observations.</p></article><article><b>03</b><strong>Compare</strong><p>Use only CPI releases available by the requested date to prevent look-ahead bias.</p></article><article><b>04</b><strong>Protect</strong><p>Store opt-in aggregates, never raw Fidelity holdings or transactions.</p></article></div></section>
      <footer><strong>LIFEBETA</strong><span>Seeded educational data · no fabricated live prices · not financial advice</span></footer>
    </main>
  );
}
