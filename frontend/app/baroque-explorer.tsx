"use client";

import { useMemo, useState } from "react";

const places = [
  { id: "slice", name: "Lexington Slice", cuisine: "Pizza", price: 6.5, distance: .2, studentDiscount: true, x: 47, y: 42, note: "2 slices + drink" },
  { id: "deli", name: "23rd Street Deli", cuisine: "Deli", price: 9.5, distance: .1, studentDiscount: true, x: 57, y: 57, note: "Egg sandwich + coffee" },
  { id: "falafel", name: "Gramercy Falafel", cuisine: "Mediterranean", price: 9, distance: .4, studentDiscount: false, x: 35, y: 64, note: "Falafel pita" },
  { id: "bento", name: "Madison Bento", cuisine: "Japanese", price: 12.5, distance: .3, studentDiscount: true, x: 44, y: 27, note: "Lunch bento" },
  { id: "taco", name: "Taco Bell Cantina", cuisine: "Fast food", price: 8.5, distance: .8, studentDiscount: false, x: 72, y: 29, note: "Value-menu meal" },
  { id: "curry", name: "Curry Hill Express", cuisine: "Indian", price: 11, distance: .9, studentDiscount: false, x: 76, y: 70, note: "Rice + curry special" },
];

const dealPreviews = [
  { place: "Chipotle", title: "Rewards and app-promotion watch", source: "Chain offer monitor", status: "Needs source", tone: "verify" },
  { place: "Taco Bell", title: "Value drop and Tuesday offer watch", source: "Chain offer monitor", status: "Needs source", tone: "verify" },
  { place: "Lexington Slice", title: "10% with valid student ID", source: "Student submitted", status: "Pending moderation", tone: "pending" },
];

export function BaroqueExplorer() {
  const [maxPrice, setMaxPrice] = useState(12);
  const [maxDistance, setMaxDistance] = useState(1);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [selected, setSelected] = useState("slice");
  const [submission, setSubmission] = useState(false);
  const filtered = useMemo(() => places.filter((place) => place.price <= maxPrice && place.distance <= maxDistance && (!discountOnly || place.studentDiscount)), [discountOnly, maxDistance, maxPrice]);

  return (
    <>
      <section className="explore-section" id="preview">
        <div className="baroque-section-head"><div><span>INTERACTIVE PRODUCT PREVIEW</span><h2>Find lunch between classes.</h2></div><p>Seeded demonstration listings—not current restaurant prices.</p></div>
        <div className="filter-bar">
          <fieldset><legend>TYPICAL MEAL PRICE</legend>{[8, 12, 16].map((price) => <button className={maxPrice === price ? "active" : ""} onClick={() => setMaxPrice(price)} key={price}>Up to ${price}</button>)}</fieldset>
          <label>DISTANCE FROM BARUCH<select value={maxDistance} onChange={(event) => setMaxDistance(Number(event.target.value))}><option value={.25}>¼ mile</option><option value={.5}>½ mile</option><option value={1}>1 mile</option></select></label>
          <label className="discount-toggle"><input type="checkbox" checked={discountOnly} onChange={(event) => setDiscountOnly(event.target.checked)} /><span />Student discount only</label>
          <div className="result-count"><strong>{filtered.length}</strong><span>preview matches</span></div>
        </div>

        <div className="explore-grid">
          <div className="place-list">
            {filtered.length ? filtered.map((place) => <button className={selected === place.id ? "selected" : ""} onClick={() => setSelected(place.id)} key={place.id}><span className="place-price">${place.price.toFixed(0)}<small>typical</small></span><div><small>{place.cuisine} · {place.distance} mi</small><strong>{place.name}</strong><p>{place.note}</p></div>{place.studentDiscount && <i>STUDENT DEAL</i>}<b>→</b></button>) : <div className="no-matches"><strong>No seeded matches</strong><p>Increase price or distance, or turn off the discount filter.</p></div>}
          </div>
          <div className="demo-map" aria-label="Seeded map preview">
            <div className="map-grid" /><span className="campus-pin">B<small>BARUCH</small></span>
            {filtered.map((place) => <button key={place.id} onClick={() => setSelected(place.id)} aria-label={`Select ${place.name}`} className={selected === place.id ? "active" : ""} style={{ left: `${place.x}%`, top: `${place.y}%` }}><span>${place.price.toFixed(0)}</span></button>)}
            <div className="map-note">MAP PREVIEW · SEEDED COORDINATES</div>
          </div>
        </div>
      </section>

      <section className="deals-section" id="deals">
        <div className="baroque-section-head inverse"><div><span>DEALS, WITH PROVENANCE</span><h2>A code is only useful if it works.</h2></div><p>Future deals will show source, verification state, and expiration instead of silently staying live.</p></div>
        <div className="deal-grid">{dealPreviews.map((deal, index) => <article key={deal.place}><span className="deal-number">0{index + 1}</span><small>{deal.place}</small><h3>{deal.title}</h3><p>{deal.source}</p><i className={deal.tone}>{deal.status}</i></article>)}</div>
        <p className="deal-disclaimer">These cards demonstrate the verification workflow. They are not active offers or usable codes.</p>
      </section>

      <section className="submit-section" id="submit">
        <div><span>COMMUNITY SIGNAL</span><h2>Students find the deals first.</h2><p>Baroque will let students submit a deal, but submissions will remain pending until a moderator or trusted source verifies the terms and expiration.</p></div>
        {submission ? <div className="submission-success"><span>✓</span><strong>Preview submission captured on this device.</strong><p>No data was sent or saved. Production submissions will require authentication, moderation, and an audit trail.</p><button onClick={() => setSubmission(false)}>Submit another preview</button></div> : <form onSubmit={(event) => { event.preventDefault(); setSubmission(true); }}><label>PLACE<input required placeholder="Restaurant or store" /></label><label>DEAL DETAILS<textarea required placeholder="What is the deal, and what proof did you see?" /></label><label>EXPIRATION, IF KNOWN<input type="date" /></label><button type="submit">Preview submission →</button><small>Device-only demonstration · nothing is uploaded</small></form>}
      </section>
    </>
  );
}

export function MealBudgetLab() {
  const [basePrice, setBasePrice] = useState(9);
  const [currentPrice, setCurrentPrice] = useState(13);
  const [budget, setBudget] = useState(75);
  const [meals, setMeals] = useState(7);
  const baseCapacity = budget / Math.max(basePrice, .01);
  const currentCapacity = budget / Math.max(currentPrice, .01);
  const shortfall = Math.max(0, currentPrice * meals - budget);
  return <div className="budget-lab"><div className="budget-inputs"><label>MEAL THEN <span>${basePrice.toFixed(2)}</span><input type="range" min="5" max="18" step=".5" value={basePrice} onChange={(event) => setBasePrice(Number(event.target.value))} /></label><label>MEAL NOW <span>${currentPrice.toFixed(2)}</span><input type="range" min="5" max="22" step=".5" value={currentPrice} onChange={(event) => setCurrentPrice(Number(event.target.value))} /></label><label>WEEKLY BUDGET <span>${budget}</span><input type="range" min="35" max="150" step="5" value={budget} onChange={(event) => setBudget(Number(event.target.value))} /></label><label>MEALS NEEDED <span>{meals}</span><input type="range" min="3" max="14" value={meals} onChange={(event) => setMeals(Number(event.target.value))} /></label></div><div className="budget-output"><article><small>MEALS LOST / WEEK</small><strong>{Math.max(0, baseCapacity - currentCapacity).toFixed(1)}</strong></article><article><small>CURRENT CAPACITY</small><strong>{currentCapacity.toFixed(1)}</strong><span>meals</span></article><article className={shortfall > 0 ? "short" : "covered"}><small>WEEKLY SHORTFALL</small><strong>${shortfall.toFixed(2)}</strong><span>{shortfall > 0 ? "budget does not cover the plan" : "plan covered"}</span></article><p>Same calculation as <code>POST /v1/food-affordability</code>. Public preview uses only the values you set here.</p></div></div>;
}
