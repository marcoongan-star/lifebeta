"use client";

import { useState } from "react";
import Link from "next/link";
import {
  decideDealReview,
  decidePlaceReview,
  loadDealReviewHistory,
  loadReviewQueue,
  type ReviewEvent,
  type ReviewDeal,
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
      <section className="review-summary"><article><small>PLACE DECISIONS</small><strong>{queue.places.length}</strong><span>pending or overdue</span></article><article><small>DEAL DECISIONS</small><strong>{queue.deals.length}</strong><span>expired or overdue</span></article><article><small>AUDIT EVENTS</small><strong>{queue.events.length}</strong><span>latest 100 loaded</span></article><button onClick={() => void refresh()}>Refresh queue ↻</button></section>

      <section className="review-section"><div className="review-section-head"><div><small>MANUAL EVIDENCE GATE</small><h2>Places waiting for a decision</h2></div><p>{queue.rule}</p></div>{queue.places.length === 0 ? <div className="review-empty">No place decisions are waiting.</div> : <div className="review-place-grid">{queue.places.map((place) => <PlaceDecision key={place.id} place={place} reviewKey={reviewKey} onComplete={() => void refresh()} />)}</div>}</section>

      <section className="review-section"><div className="review-section-head"><div><small>PROTECTED DEAL GATE</small><h2>Deals waiting for a decision</h2></div><p>Re-confirm only against current evidence and a new recheck boundary. Rejected deals remain in immutable history but never return to the public directory.</p></div>{queue.deals.length === 0 ? <div className="review-empty">No deal decisions are waiting.</div> : <div className="review-place-grid">{queue.deals.map((deal) => <DealDecision key={deal.id} deal={deal} reviewKey={reviewKey} onComplete={() => void refresh()} />)}</div>}</section>
    </>}
  </main>;
}

function DealDecision({ deal, reviewKey, onComplete }: { deal: ReviewDeal; reviewKey: string; onComplete: () => void }) {
  const [reason, setReason] = useState("");
  const [sourceUrl, setSourceUrl] = useState(deal.source_url);
  const [checkAfter, setCheckAfter] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [pendingCommandId, setPendingCommandId] = useState("");
  const [busy, setBusy] = useState<"confirm" | "reject" | null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<ReviewEvent[] | null>(null);
  const [historyState, setHistoryState] = useState<"closed" | "loading" | "ready" | "error">("closed");

  async function decide(decision: "confirm" | "reject") {
    const commandId = pendingCommandId || crypto.randomUUID();
    setPendingCommandId(commandId);
    setBusy(decision);
    setError("");
    try {
      await decideDealReview(reviewKey, deal.id, {
        decision,
        reason,
        source_url: sourceUrl,
        check_after: checkAfter,
        expires_at: expiresAt,
        client_command_id: commandId,
      });
      setPendingCommandId("");
      onComplete();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The decision could not be saved.");
      setBusy(null);
    }
  }

  async function toggleHistory() {
    if (historyState === "ready") {
      setHistoryState("closed");
      return;
    }
    if (historyState === "closed" && history) {
      setHistoryState("ready");
      return;
    }
    setHistoryState("loading");
    setError("");
    try {
      const result = await loadDealReviewHistory(reviewKey, deal.id);
      setHistory(result.events);
      setHistoryState("ready");
    } catch (requestError) {
      setHistoryState("error");
      setError(requestError instanceof Error ? requestError.message : "The evidence history could not be loaded.");
    }
  }

  return <article className="review-place-card review-deal-card"><header><span>{deal.status.replace("_", " ")}</span><small>Last verified {deal.verified_at}</small></header><h3>{deal.brand}</h3><p>{deal.title}</p><div className="review-evidence-actions"><a className="review-evidence-link" href={deal.source_url} target="_blank" rel="noreferrer">Open existing evidence ↗</a><button type="button" onClick={() => void toggleHistory()} disabled={historyState === "loading"}>{historyState === "loading" ? "Loading history…" : historyState === "ready" ? "Hide evidence history" : "View evidence history"}</button></div>{historyState === "ready" && <ol className="review-history">{history?.length ? history.map((event) => <li key={event.id}><div><strong>{event.event_type.replaceAll("_", " ")}</strong><time dateTime={event.occurred_at}>{new Date(event.occurred_at).toLocaleString()}</time></div><p>{event.reason}</p><small>{event.from_status ?? "created"} → {event.to_status} · {event.actor}</small></li>) : <li className="empty">No review decisions have been recorded for this deal yet.</li>}</ol>}<div className="review-fields"><label>EVIDENCE URL<input type="url" value={sourceUrl} placeholder="https://…" onChange={(event) => setSourceUrl(event.target.value)} /></label><label>NEXT RECHECK<input type="date" value={checkAfter} onChange={(event) => setCheckAfter(event.target.value)} /></label><label>OFFER ENDS · OPTIONAL<input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label><label className="review-reason">SPECIFIC DECISION REASON<textarea required minLength={8} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What did the current evidence establish?" /></label></div><div className="review-actions"><button className="reject" disabled={busy !== null || reason.length < 8} onClick={() => void decide("reject")}>{busy === "reject" ? "Rejecting…" : "Reject deal"}</button><button className="verify" disabled={busy !== null || reason.length < 8 || !sourceUrl || !checkAfter} onClick={() => void decide("confirm")}>{busy === "confirm" ? "Saving…" : "Re-confirm deal →"}</button></div>{error && <p className="review-error" role="alert">{error} {pendingCommandId && "A retry will reuse the same command."}</p>}</article>;
}

function PlaceDecision({ place, reviewKey, onComplete }: { place: ReviewPlace; reviewKey: string; onComplete: () => void }) {
  const [reason, setReason] = useState("");
  const [sourceUrl, setSourceUrl] = useState(place.source_url ?? "");
  const [checkAfter, setCheckAfter] = useState("");
  const [latitude, setLatitude] = useState(place.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(place.longitude?.toString() ?? "");
  const [coordinateSourceUrl, setCoordinateSourceUrl] = useState(place.coordinate_source_url ?? "");
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
        latitude: latitude ? Number(latitude) : undefined,
        longitude: longitude ? Number(longitude) : undefined,
        coordinate_source_url: coordinateSourceUrl || undefined,
        client_command_id: crypto.randomUUID(),
      });
      onComplete();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "The decision could not be saved.");
      setBusy(null);
    }
  }

  return <article className="review-place-card"><header><span>{place.verification_status.replace("_", " ")}</span><small>{place.created_at.slice(0, 10)}</small></header><h3>{place.name}</h3><p>{place.meal_name} · {place.cuisine} · {place.price_label}</p><address>{place.address}{place.location_note ? ` · ${place.location_note}` : ""}</address><div className="review-fields"><label>EVIDENCE URL<input type="url" value={sourceUrl} placeholder="https://…" onChange={(event) => setSourceUrl(event.target.value)} /></label><label>NEXT RECHECK<input type="date" value={checkAfter} onChange={(event) => setCheckAfter(event.target.value)} /></label><label>LATITUDE · OPTIONAL<input type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} /></label><label>LONGITUDE · OPTIONAL<input type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} /></label><label className="review-reason">COORDINATE SOURCE · REQUIRED WITH COORDINATES<input type="url" value={coordinateSourceUrl} placeholder="https://…" onChange={(event) => setCoordinateSourceUrl(event.target.value)} /></label><label className="review-reason">SPECIFIC DECISION REASON<textarea required minLength={8} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="What did the evidence establish?" /></label></div><div className="review-actions"><button className="reject" disabled={busy !== null || reason.length < 8} onClick={() => void decide("reject")}>{busy === "reject" ? "Rejecting…" : "Reject"}</button><button className="verify" disabled={busy !== null || reason.length < 8 || !sourceUrl || !checkAfter} onClick={() => void decide("verify")}>{busy === "verify" ? "Verifying…" : place.verification_status === "needs_review" ? "Re-verify →" : "Verify →"}</button></div>{error && <p className="review-error" role="alert">{error}</p>}</article>;
}
