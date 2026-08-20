# Milestone 7 — Saved-basket analysis and released CPI

A saved basket can now be analyzed without resubmitting its products or complete price history on every request.

`basket id + dates → load normalized basket → load provenance-aware prices → select no-look-ahead snapshots → normalize units → calculate index and drivers`

If the request selects a stored benchmark series, LifeBeta also loads only benchmark values released by each analysis date. This prevents a historical comparison from using CPI information that was not yet public.

Benchmark observations retain their series, measurement period, release date, level, source label, and source URL. Caller-supplied and demonstration data remains labeled; this milestone does not claim a live CPI connection.
