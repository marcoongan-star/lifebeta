import { BarokeExplorer, MealMetrics } from "./baroque-explorer";

export function StudentEatsLanding() {
  return (
    <main className="baroque-shell">
      <header className="baroque-nav">
        <a className="baroque-brand" href="#top"><span>B</span><div><strong>BAROKE</strong><small>POWERED BY LIFEBETA</small></div></a>
        <nav><a href="#why">Why now</a><a href="#places">Places</a><a href="#add-place">Add a place</a></nav>
        <a className="nav-cta" href="#places">Find a meal →</a>
      </header>

      <section className="baroque-hero" id="top">
        <div className="hero-proof"><span>POWERED BY LIFEBETA</span></div>
        <div className="hero-copy-block">
          <h1>The city got expensive.<br /><em>Lunch shouldn&apos;t.</em></h1>
          <p className="baroque-intro">Baroke is a student food map for clear meal prices, verified places, and locations close enough to reach between classes.</p>
          <div className="baroque-actions"><a href="#places">Browse places <span>→</span></a><a href="#add-place">Add a place</a></div>
        </div>
        <article className="hero-stat" id="why">
          <small>FOOD AWAY FROM HOME PRICE GROWTH</small><strong>+37.3%</strong><p>January 2020 → July 2026</p><span>U.S. city average</span>
        </article>
      </section>

      <section className="inflation-story">
        <div className="baroque-section-head"><div><h2>Price growth becomes meals lost.</h2></div><p>These fixed base metrics show what a higher meal price does to the same weekly budget.</p></div>
        <MealMetrics />
        <div className="source-line"><p>The 37.3% figure compares the January 2020 and July 2026 U.S. food-away-from-home CPI indexes. <a href="https://www.bls.gov/news.release/archives/cpi_08122026.htm" target="_blank" rel="noreferrer">Read the BLS release ↗</a></p></div>
      </section>
      <BarokeExplorer />
      <footer className="baroque-footer"><a className="baroque-brand" href="#top"><span>B</span><div><strong>BAROKE</strong><small>POWERED BY LIFEBETA</small></div></a></footer>
    </main>
  );
}
