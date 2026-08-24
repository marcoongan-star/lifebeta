"use client";

import { useEffect, useMemo, useState } from "react";
import { loadBarokePlaces, submitBarokePlace, type BarokePlace } from "./baroke-api";

type DatabaseState = "loading" | "ready" | "unavailable";
type SubmissionState = "idle" | "saving" | "saved" | "error";

export function BarokeExplorer() {
  const [places, setPlaces] = useState<BarokePlace[]>([]);
  const [maxPrice, setMaxPrice] = useState(12);
  const [location, setLocation] = useState("");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [databaseState, setDatabaseState] = useState<DatabaseState>("loading");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");

  const filtered = useMemo(() => {
    const query = location.trim().toLowerCase();
    return places.filter((place) => {
      const locationMatches = !query || `${place.address} ${place.locationNote}`.toLowerCase().includes(query);
      return place.priceMin <= maxPrice && locationMatches && (!discountOnly || place.studentDiscount);
    });
  }, [discountOnly, location, maxPrice, places]);

  useEffect(() => {
    const controller = new AbortController();
    loadBarokePlaces(controller.signal)
      .then((next) => {
        setPlaces(next);
        setDatabaseState("ready");
      })
      .catch(() => setDatabaseState("unavailable"));
    return () => controller.abort();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionState("saving");
    setSubmissionMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await submitBarokePlace({
        name: String(data.get("name") ?? ""),
        meal_name: String(data.get("meal_name") ?? ""),
        cuisine: String(data.get("cuisine") ?? ""),
        price_min: Number(data.get("price_min")),
        price_max: Number(data.get("price_max")),
        address: String(data.get("address") ?? ""),
        location_note: String(data.get("location_note") ?? ""),
        student_discount: data.get("student_discount") === "on",
        source_url: String(data.get("source_url") ?? ""),
      });
      form.reset();
      setSubmissionState("saved");
      setSubmissionMessage("Saved for review. It will not appear publicly until its price and location are verified.");
    } catch (error) {
      setSubmissionState("error");
      setSubmissionMessage(error instanceof Error ? error.message : "Place could not be saved.");
    }
  }

  return (
    <>
      <section className="explore-section" id="places">
        <div className="baroque-section-head">
          <div><h2>Find lunch between classes.</h2></div>
          <p>Only manually verified places appear here. Prices return to review after 24 hours without a fresh check.</p>
        </div>
        <div className="filter-bar">
          <fieldset><legend>MEAL PRICE</legend>{[8, 12, 16].map((price) => <button type="button" className={maxPrice === price ? "active" : ""} onClick={() => setMaxPrice(price)} key={price}>Up to ${price}</button>)}</fieldset>
          <label>LOCATION<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Street or neighborhood" /></label>
          <label className="discount-toggle"><input type="checkbox" checked={discountOnly} onChange={(event) => setDiscountOnly(event.target.checked)} /><span />Student discount only</label>
          <div className="result-count"><strong>{filtered.length}</strong><span>verified places</span></div>
        </div>

        <div className="verified-grid">
          <div className="place-list">
            {databaseState === "loading" && <div className="no-matches"><strong>Loading verified places…</strong></div>}
            {databaseState === "unavailable" && <div className="no-matches"><strong>Place database is temporarily unavailable.</strong><p>You can still add a place below and try again shortly.</p></div>}
            {databaseState === "ready" && filtered.length === 0 && <div className="no-matches"><strong>No verified matches yet.</strong><p>Add a place below. New submissions stay private until they pass review.</p></div>}
            {databaseState === "ready" && filtered.map((place) => (
              <article className="verified-place" key={place.id}>
                <span className="place-price">${place.priceMin.toFixed(0)}–${place.priceMax.toFixed(0)}<small>meal price</small></span>
                <div><small>{place.cuisine} · {place.address}</small><strong>{place.name}</strong><p>{place.mealName} · {place.locationNote}</p></div>
                <div className="place-badges">{place.studentDiscount && <i>STUDENT DISCOUNT</i>}<i>VERIFIED</i></div>
              </article>
            ))}
          </div>
          <aside className="verification-panel">
            <small>HOW VERIFICATION WORKS</small>
            <ol>
              <li><span>1</span><p>A student adds the place, meal, price range, location, and evidence.</p></li>
              <li><span>2</span><p>The submission stays pending while its menu or receipt evidence is checked.</p></li>
              <li><span>3</span><p>Only verified records become public search results.</p></li>
              <li><span>4</span><p>A daily freshness sweep returns old prices to review instead of presenting them as current.</p></li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="submit-section" id="add-place">
        <div><h2>Add a place.</h2><p>Help build the database with a real meal, price range, and exact location. Submission is not publication: every record begins as pending.</p></div>
        <form onSubmit={handleSubmit}>
          <label>PLACE<input name="name" required placeholder="Restaurant or store" /></label>
          <label>MEAL OR ITEM<input name="meal_name" required placeholder="Chicken bowl, lunch special…" /></label>
          <label>CUISINE<input name="cuisine" required placeholder="Mexican, deli, pizza…" /></label>
          <label>MINIMUM MEAL PRICE<input name="price_min" required type="number" min="0.01" step="0.01" placeholder="8.00" /></label>
          <label>MAXIMUM MEAL PRICE<input name="price_max" required type="number" min="0.01" step="0.01" placeholder="12.00" /></label>
          <label className="form-wide">ADDRESS<input name="address" required placeholder="Street address" /></label>
          <label className="form-wide">LOCATION DETAILS<input name="location_note" required placeholder="Cross streets, neighborhood, or walking landmark" /></label>
          <label className="form-wide">MENU OR RECEIPT LINK<input name="source_url" required type="url" placeholder="https://…" /></label>
          <label className="form-check"><input name="student_discount" type="checkbox" />This place offers a student discount</label>
          <button type="submit" disabled={submissionState === "saving"}>{submissionState === "saving" ? "Saving…" : "Submit for verification →"}</button>
          {submissionMessage && <p className={submissionState === "error" ? "form-message error" : "form-message"}>{submissionMessage}</p>}
        </form>
      </section>
    </>
  );
}

export function MealMetrics() {
  return (
    <div className="base-metrics">
      <article><small>MEAL PRICE THEN</small><strong>$9.00</strong><span>base assumption</span></article>
      <article><small>MEAL PRICE NOW</small><strong>$13.00</strong><span>base assumption</span></article>
      <article><small>MEALS LOST / WEEK</small><strong>2.6</strong><span>with the same $75 budget</span></article>
      <article><small>WEEKLY SHORTFALL</small><strong>$16</strong><span>for seven meals</span></article>
    </div>
  );
}
