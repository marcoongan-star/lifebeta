"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadBarokeDeals,
  loadBarokePlaces,
  submitBarokePlace,
  type BarokeDeal,
  type BarokePlace,
} from "./baroke-api";

type DatabaseState = "loading" | "ready" | "unavailable";
type SubmissionState = "idle" | "saving" | "saved" | "error";

function formatDealDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T12:00:00Z`));
}

export function BarokeExplorer() {
  const [places, setPlaces] = useState<BarokePlace[]>([]);
  const [deals, setDeals] = useState<BarokeDeal[]>([]);
  const [maxPrice, setMaxPrice] = useState(12);
  const [location, setLocation] = useState("");
  const [dealOnly, setDealOnly] = useState(false);
  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(null);
  const [databaseState, setDatabaseState] = useState<DatabaseState>("loading");
  const [dealState, setDealState] = useState<DatabaseState>("loading");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");

  const filtered = useMemo(() => {
    const query = location.trim().toLowerCase();
    return places.filter((place) => {
      const locationMatches = !query || `${place.address} ${place.locationNote}`.toLowerCase().includes(query);
      const priceMatches = place.priceMin === null ? place.deals.length > 0 : place.priceMin <= maxPrice;
      return priceMatches && locationMatches && (!dealOnly || place.deals.length > 0);
    });
  }, [dealOnly, location, maxPrice, places]);

  useEffect(() => {
    const controller = new AbortController();
    loadBarokePlaces(controller.signal)
      .then((next) => {
        setPlaces(next);
        setDatabaseState("ready");
      })
      .catch(() => setDatabaseState("unavailable"));
    loadBarokeDeals(controller.signal)
      .then((next) => {
        setDeals(next);
        setDealState("ready");
      })
      .catch(() => setDealState("unavailable"));
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
        meal_price: Number(data.get("meal_price")),
        address: String(data.get("address") ?? ""),
        location_note: String(data.get("location_note") ?? ""),
        student_discount: data.get("student_discount") === "on",
        source_url: String(data.get("source_url") ?? ""),
      });
      form.reset();
      setSubmissionState("saved");
      setSubmissionMessage("Saved for Codex review. It will not appear publicly until I check its price and location during a Baroke work session.");
    } catch (error) {
      setSubmissionState("error");
      setSubmissionMessage(error instanceof Error ? error.message : "Place could not be saved.");
    }
  }

  return (
    <>
      <section className="explore-section" id="places">
        <div className="baroque-section-head">
          <div><h2>Find lunch between classes.</h2></div><p>Choose a place to see its checked offers, exact terms, and source.</p>
        </div>
        <div className="filter-bar">
          <fieldset><legend>MEAL PRICE</legend>{[8, 12, 16].map((price) => <button type="button" className={maxPrice === price ? "active" : ""} onClick={() => setMaxPrice(price)} key={price}>Up to ${price}</button>)}</fieldset>
          <label>LOCATION<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Street or neighborhood" /></label>
          <label className="discount-toggle"><input type="checkbox" checked={dealOnly} onChange={(event) => setDealOnly(event.target.checked)} /><span />Current deal only</label>
          <div className="result-count"><strong>{filtered.length}</strong><span>verified places</span></div>
        </div>

        <div className="verified-grid">
          <div className="place-list">
            {databaseState === "loading" && <div className="no-matches"><strong>Loading verified places…</strong></div>}
            {databaseState === "unavailable" && <div className="no-matches"><strong>Place database is temporarily unavailable.</strong><p>You can still add a place below and try again shortly.</p></div>}
            {databaseState === "ready" && filtered.length === 0 && <div className="no-matches"><strong>No verified matches yet.</strong><p>Add a place below. New submissions stay private until they pass review.</p></div>}
            {databaseState === "ready" && filtered.map((place) => {
              const expanded = expandedPlaceId === place.id;
              return (
                <article className={`verified-place${expanded ? " expanded" : ""}`} key={place.id}>
                  <button className="place-summary" type="button" aria-expanded={expanded} onClick={() => setExpandedPlaceId(expanded ? null : place.id)}>
                    <span className="place-price">{place.priceLabel}<small>{place.priceMin === null ? "current offer" : "meal price"}</small></span>
                    <span className="place-copy"><small>{place.cuisine} · {place.address}</small><strong>{place.name}</strong><span>{[place.mealName, place.locationNote].filter(Boolean).join(" · ")}</span></span>
                    <span className="place-badges">{place.deals.length > 0 && <i className="current-deal">✓ CURRENT DEAL</i>}{place.studentDiscount && <i>STUDENT DISCOUNT</i>}<i>VERIFIED</i></span>
                    <b className="place-expand" aria-hidden="true">{expanded ? "−" : "+"}</b>
                  </button>
                  {expanded && (
                    <div className="place-deal-drawer">
                      <div className="place-deal-head"><span>{place.deals.length} CURRENT {place.deals.length === 1 ? "OFFER" : "OFFERS"}</span>{place.sourceUrl && <a href={place.sourceUrl} target="_blank" rel="noreferrer">Place source ↗</a>}</div>
                      {place.deals.length === 0 && <p>No linked deal is current. The place itself is still verified.</p>}
                      {place.deals.map((deal) => (
                        <article key={deal.id}>
                          <div><i>✓</i><h3>{deal.title}</h3></div>
                          <p>{deal.details}</p>
                          <p className="place-deal-terms">{deal.requirement}</p>
                          <footer><span>{deal.expiresAt ? `Ends ${formatDealDate(deal.expiresAt)}` : `Recheck by ${formatDealDate(deal.checkAfter)}`}</span><a href={deal.sourceUrl} target="_blank" rel="noreferrer">Deal source ↗</a></footer>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <aside className="verification-panel">
            <small>HOW VERIFICATION WORKS</small>
            <ol>
              <li><span>1</span><p>A student adds the place, cuisine, meal price, and address. Extra details are optional.</p></li>
              <li><span>2</span><p>Codex checks the submitted source or receipt during a Baroke review session.</p></li>
              <li><span>3</span><p>A checked deal appears directly on its restaurant card.</p></li>
              <li><span>4</span><p>Expired or overdue offers disappear until Codex verifies them again.</p></li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="deals-section" id="deals">
        <div className="baroque-section-head inverse">
          <div><span>SOURCE-CHECKED AUGUST 24, 2026</span><h2>Confirmed deals.</h2></div>
          <p>Terms and participation can vary by location. Open the original source before ordering.</p>
        </div>
        <div className="deal-grid">
          {dealState === "loading" && <div className="deal-empty"><strong>Loading confirmed deals…</strong></div>}
          {dealState === "unavailable" && <div className="deal-empty"><strong>Deals are temporarily unavailable.</strong><p>Try again shortly.</p></div>}
          {dealState === "ready" && deals.length === 0 && <div className="deal-empty"><strong>No current confirmed deals.</strong><p>Offers with expired or overdue checks are hidden automatically.</p></div>}
          {dealState === "ready" && deals.map((deal, index) => (
            <article key={deal.id}>
              <span className="deal-number">{String(index + 1).padStart(2, "0")}</span>
              <small>{deal.brand}</small>
              <h3>{deal.title}</h3>
              <p>{deal.details}</p>
              <p className="deal-terms">{deal.requirement}</p>
              <div className="deal-meta">
                <i>CONFIRMED</i>
                <a href={deal.sourceUrl} target="_blank" rel="noreferrer">Original source ↗</a>
              </div>
              <span className="deal-validity">{deal.expiresAt ? `Ends ${formatDealDate(deal.expiresAt)}` : `Recheck by ${formatDealDate(deal.checkAfter)}`}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="submit-section" id="add-place">
        <div><h2>Add a place.</h2><p>Add a place and the price you paid or saw. Optional details help me verify it during our next Baroke work session.</p></div>
        <form onSubmit={handleSubmit}>
          <label>PLACE<input name="name" required placeholder="Restaurant or store" /></label>
          <label>CUISINE<input name="cuisine" required placeholder="Mexican, deli, pizza…" /></label>
          <label>MEAL PRICE<input name="meal_price" required type="number" min="0.01" step="0.01" placeholder="10.00" /></label>
          <label className="form-wide">ADDRESS<input name="address" required placeholder="Street address" /></label>
          <label>MEAL OR ITEM · OPTIONAL<input name="meal_name" placeholder="Chicken bowl, lunch special…" /></label>
          <label>LOCATION DETAILS · OPTIONAL<input name="location_note" placeholder="Neighborhood or walking landmark" /></label>
          <label className="form-wide">MENU OR RECEIPT LINK · OPTIONAL<input name="source_url" type="url" placeholder="https://…" /></label>
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
