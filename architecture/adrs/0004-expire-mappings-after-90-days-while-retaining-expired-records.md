---
status: accepted
---

# Expire mappings after 90 days while retaining expired records

## Context and Problem Statement

Commit `9508cc3` explicitly required URLs to expire after 90 days. The implementation distinguishes expired codes from unknown codes and permits a destination to receive a fresh mapping after its previous mapping expires. [Store/repository tests](../../test/json-url-store.test.js) verify retention of expired records, exclusion from active lookups, and creation of a fresh code for an expired destination.

This retrospective record is accepted following explicit user approval. Acceptance records approval now, not evidence of historical approval. The 90-day requirement comes from commit history; retention, HTTP behavior, and tradeoffs below are based on the current implementation. No separate historical approval of these details was found.

## Considered Options

- Fixed expiration after creation, enforced on access, with expired records retained.
- Delete expired mappings through scheduled cleanup.
- Renew expiration when a destination is submitted again or a link is visited.

## Decision Outcome

Chosen option: "Fixed expiration after creation, enforced on access, with expired records retained", because it implements the lifetime without a background scheduler and preserves enough history to identify expired codes and avoid reassigning them.

[JsonUrlStore](../../storage/json-url-store.js) assigns numeric epoch-millisecond timestamps with a default lifetime of `90 * 24 * 60 * 60 * 1000` milliseconds. A record expires when `expiresAt <= now`. Active destination lookups and listings omit expired records; code lookups and code-existence checks retain them. [server.js](../../server.js) checks expiration during resolution, returning HTTP 410 for expired records, 404 for unknown codes, and 302 for active records. Repeated submission does not renew an active mapping; after expiry, the [repository creates a new code](0003-use-seven-char-mixed-case-alphanumeric-codes-and-reuse-active-mappings.md).

When loading legacy records without timestamps, the store supplies `createdAt` from its clock and derives `expiresAt`. These values are persisted only when the file is next written. The checked-in [sample data](../../data/urls.json) lacks timestamps, so restarting before such a write can recalculate its lifetime. Startup submits two sample destinations through `createOrGet`, creating fresh mappings if their previous records have expired.

### Consequences

- Good, because access checks enforce expiry without waiting for a cleanup job.
- Good, because retaining records lets the server explain expired links and prevents normal code generation from reusing their codes.
- Bad, because expiration does not reclaim storage; accumulated records increase the cost of the [JSON store](0002-isolate-json-persistence-behind-a-replaceable-storage-boundary.md).
- Bad, because correctness depends on wall-clock time. The server uses `Date.now()` directly even though the store supports an injected clock.
- Bad, because legacy timestamp defaults do not establish a durable creation date until a subsequent write, and repeat submissions or visits do not extend the lifetime.
