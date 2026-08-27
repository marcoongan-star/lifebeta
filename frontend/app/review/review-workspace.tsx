"use client";

import { useState } from "react";
import Link from "next/link";
import {
  decidePlaceReview,
  loadReviewQueue,
  type ReviewPlace,
  type ReviewQueue,
} from "../baroke-api";

type ReviewState = "locked" | "loading" | "ready" | "error";

export function ReviewWorkspace() {
  const [reviewKey, setReviewKey] = useState("");
  const [state, setState] = useState<ReviewState>("locked");
  const [queue, setQueue] = useState<ReviewQueue | null>(null);
  const [message, setMessage] = useState("");

  async function refresh(key = reviewKey) {
    setState("loading");
    setMessage("");
    try {
      setQueue(await loadReviewQueue(key));
      setState("ready");
    } catch (error) {
      setQueue(null);
      setState("error");
      setMessage(error instanceof Error ? error.message : "The review queue could not be loaded.");
    }
  }

  return <main className="review-shell">
    <header className="review-header"><Link href="/">BAROKE</Link><div><small>PRIVATE OPERATIONS</small><h1>Evidence review</h1><p>Verify what can be supported. Reject what cannot. Every decision becomes immutable history.</p></div><span className={`review-state ${state}`}>{state === "ready" ? "QUEUE UNLOCKED" : state === "loading" ? "CHECKING ACCESS" : "LOCKED"}</span></header>

    {state !== "ready" && <section className="review-unlock"><small>SERVER-PROTECTED ROUTE</small><h2>Enter the review credential.</h2><p>The credential is held only in this open page. It is not saved in browser storage or written to review history.</p><form onSubmit={(event) => { event.preventDefault(); void refresh(); }}><label>REVIEW CREDENTIAL<input type="password" required value={reviewKey} onChange={(event) => setReviewKey(event.target.value)} autoComplete="off" /></label><button disabled={state === "loading"}>{state === "loading" ? "Checking…" : "Open queue →"}</button></form>{message && <p className="review-error" role="alert">{message}</p>}</section>}

    {state === "ready" && queue && <>
      <section className="review-summary"><article><small>PLACE DECISIONS</small><strong>{queue.places.length}</strong><span>pending or overdue</span></article><article><small>DEAL RECHECKS</small><strong>{queue.deals.length}</strong><span>read-only this milestone</span></article><article><small>AUDIT EVENTS</small><strong>{queue.events.length}</strong><span>latest 100 loaded</span></article><button onClick={() => void refresh()}>Refresh queue ↻</button></section>

      <section className="review-section"><div className="review-section-head"><div><small>MANUAL EVIDENCE GATE</small><h2>Places waiting for a decision</h2></div><p>{queue.rule}</p></div>{queue.places.length === 0 ? <div className="review-empty">No place decisions are waiting.</div> : <div className="review-place-grid">{queue.places.map((place) => <PlaceDecision key={place.id} place={place} reviewKey={reviewKey} onComplete={() => void refresh()} />)}</div>}</section>

      <section className="review-section muted"><div className="review-section-head"><div><small>NEXT MILESTONE</small><h2>Deal rechecks</h2></div><p>Deal decisions stay read-only until they receive the same evidence, retry, and audit guarantees as places.</p></div><div className="review-deal-list">{queue.deals.length === 0 ? <div className="review-empty">No deal rechecks are waiting.</div> : queue.deals.map((deal) => <article key={deal.id}><span>{deal.status.replace("_", " ")}</span><strong>{deal.brand} · {deal.title}</strong><a href={deal.source_url} target="_blank" rel="noreferrer">Open evidence ↗</a></article>)}</div></section>
    </>}
  </main>;
}

function PlaceDecision({ place, reviewKey, onComplete }: { place: ReviewPlace; reviewKey: string; onComplete: () => void }) {
  const [reason, setReason] = useState("");
  const [sourceUrl, setSourceUrl] = useState(place.source_url ?? "");
  const [checkAfter, setCheckAfter] = useState("");
  const [busy, setBusy] = useState<"verify" | "reject" | null>(null);
  const [error, setError] = useState("");

  async function decide(decision: "verify" | "reject") {
    setBusy(decision);
    setError("");
    try {
      await decidePlaceReview(reviewKey, place.id, {
        decision,
        reason,
        source_url: sourceUrl,
        check_after: checkAfter,
        client_command_id: crypto.randomUUID(),
      });
      onComplete();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The decision could not be saved.");
      setBusy(null);
    }
  }

  return <article className="review-place-card"><header><span>{place.verification_status.replace("_", " ")}</span><small>{place.created_at.slice(0, 10)}</small></header><h3>{place.name}</h3><p>{place.meal_name} · {place.cuisine} · {place.price_label}</p><address>{place.address}{place.location_note ? ` · ${place.location_note}` : ""}</address><div className="review-fields"><label>EVIDENCE URL<input type="url" value={sourceUrl} placeholder="https://…" onChange={(event) => setSourceUrl(event.target.value)} /></label><label>NEXT RECHECK<input type="date" value={checkAfter} onChange={(event) => setCheckAfter(event.target.value)} /></label><label className="review-reason">SPECIFIC DECISION REASON<textarea required minLength={8} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What did the evidence establish?" /></label></div><div className="review-actions"><button className="reject" disabled={busy !== null || reason.length < 8} onClick={() => void decide("reject")}>{busy === "reject" ? "Rejecting…" : "Reject"}</button><button className="verify" disabled={busy !== null || reason.length < 8 || !sourceUrl || !checkAfter} onClick={() => void decide("verify")}>{busy === "verify" ? "Verifying…" : place.verification_status === "needs_review" ? "Re-verify →" : "Verify →"}</button></div>{error && <p className="review-error" role="alert">{error}</p>}</article>;
}
