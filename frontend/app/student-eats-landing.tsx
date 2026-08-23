import { BaroqueExplorer, MealBudgetLab } from "./baroque-explorer";

export function StudentEatsLanding() {
  return (
    <main className="baroque-shell">
      <header className="baroque-nav">
        <a className="baroque-brand" href="#top"><span>B</span><div><strong>BAROQUE</strong><small>BARUCH STUDENT EATS</small></div></a>
        <nav><a href="#why">Why now</a><a href="#preview">Explore preview</a><a href="/tracker">LifeBeta data</a></nav>
        <a className="nav-cta" href="#preview">Find a cheap meal →</a>
      </header>

      <section className="baroque-hero" id="top">
        <div className="hero-proof"><span>POWERED BY LIFEBETA</span><p>Student food affordability, measured before it is marketed.</p></div>
        <div className="hero-copy-block">
          <p className="baroque-kicker">BUILT FOR BARUCH · NEW YORK CITY</p>
          <h1>The city got expensive.<br /><em>Lunch shouldn&apos;t.</em></h1>
          <p className="baroque-intro">Baroque is the upcoming student food map for honest prices, student discounts, verified deals, and meals close enough to make before your next class.</p>
          <div className="baroque-actions"><a href="#preview">Preview Baroque <span>→</span></a><a href="/tracker">Open the inflation tracker</a></div>
        </div>
        <article className="hero-stat" id="why">
          <small>U.S. FOOD AWAY FROM HOME CPI</small><strong>+37.3%</strong><p>January 2020 → July 2026</p><span>BLS series CUUR0000SEFV · national benchmark</span>
        </article>
      </section>

      <section className="inflation-story">
        <div className="baroque-section-head"><div><span>LIFEBETA EVIDENCE</span><h2>Price growth becomes meals lost.</h2></div><p>Change the assumptions. The affordability model shows the actual weekly constraint.</p></div>
        <MealBudgetLab />
        <div className="source-line"><span>OFFICIAL BENCHMARK</span><p>The public 37.3% figure compares the January 2020 and July 2026 U.S. food-away-from-home CPI indexes.</p><a href="https://www.bls.gov/news.release/archives/cpi_08122026.htm" target="_blank" rel="noreferrer">Read the BLS release ↗</a></div>
      </section>
      <BaroqueExplorer />
      <section className="product-boundary"><span>LIFEBETA MEASURES THE PROBLEM</span><i>→</i><span>BAROQUE HELPS STUDENTS ACT</span></section>
      <footer className="baroque-footer"><a className="baroque-brand" href="#top"><span>B</span><div><strong>BAROQUE</strong><small>POWERED BY LIFEBETA</small></div></a><p>Independent educational project · seeded restaurant preview · no active deal claims</p><a href="/tracker">Open LifeBeta tracker →</a></footer>
    </main>
  );
}
