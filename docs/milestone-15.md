# Milestone 15: private evidence-review workspace

Baroke now has an operator interface for the protected place-decision API. The `/review` route begins locked and renders no queue data. A reviewer enters the server-managed credential to load pending or overdue places, inspect their submitted details, record evidence and a future recheck date, and either verify or reject the record.

The public restaurant directory does not link to this route. Hiding a link is not the security boundary: every queue read and decision still requires server authorization.

## Browser-to-database flow

```text
reviewer enters credential
        |
        v
GET protected queue ----------> pending / overdue records
        |
reviewer checks evidence
        |
        v
POST decision + command ID
        |
        v
server authorization + validation + optimistic status predicate
        |
        v
D1 batch: append audit event + update place status
        |
        v
refreshed queue; verified place becomes eligible for public reads
```

## Privacy and failure boundaries

- The credential lives in React memory only. It is not placed in local storage, a URL, the repository, or the audit event.
- The page is marked `noindex, nofollow`, but robots metadata is only discoverability guidance—not authorization.
- The locked server-rendered page contains no place, deal, or review-event data.
- Verification controls remain disabled until the reviewer supplies a reason, evidence URL, and recheck date.
- Rejection requires a reason but does not require a source that failed to substantiate the claim.
- The server, not the browser, performs final validation and rejects stale competing decisions.
- Deals are displayed read-only because their write workflow has not yet received equivalent idempotency and audit tests.

## Interview explanation

“I treated moderation as a privileged state transition rather than an admin-looking page. The browser collects evidence, but the server owns authorization, validation, concurrency, and the audit event. The secret stays in page memory, and the locked server render includes no queue data. A database batch writes the decision and the state change together.”
