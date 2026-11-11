---
status: accepted
---

# Use seven-character mixed-case alphanumeric codes and reuse active mappings

## Context and Problem Statement

Commit `d35f99d` required seven-character, mixed-case alphanumeric slugs and reuse of the same slug for the same long URL. Commit `9508cc3` later introduced expiration; current behavior reuses a mapping only while it remains active. [Slug tests](../../test/slug-generator.test.js) check length and alphabet, and [store/repository tests](../../test/json-url-store.test.js) verify creation of a new code after expiry.

This retrospective record is accepted following explicit user approval. Acceptance records approval now, not evidence of historical approval. Requirements above come from commit history; random generation, alternatives, and tradeoffs below describe the implementation and reconstructed reasoning rather than a documented historical options review.

## Considered Options

- Random seven-character alphanumeric codes with collision checks and active destination deduplication.
- Sequential identifiers encoded into short strings.
- Deterministic codes derived from the destination URL.

## Decision Outcome

Chosen option: "Random seven-character alphanumeric codes with collision checks and active destination deduplication", because it implements the requested format without a shared sequence or URL-hash collision scheme, while using stored mappings to preserve identity for repeated submissions.

[generateSlug](../../storage/slug-generator.js) obtains seven bytes from `crypto.randomBytes` and maps each byte into `0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ` using modulo 62. [UrlRepository.createOrGet](../../storage/url-repository.js) first looks for an active destination match, then retries generated codes while the store reports a collision. The store also checks for an active destination before creating a record. Expired records still reserve their codes, as described in [ADR 0004](0004-expire-mappings-after-90-days-while-retaining-expired-records.md).

For browser submissions, [server.js](../../server.js) trims and parses the input with Node's `URL`, trying an `https://` prefix if the initial parse fails. Deduplication compares the resulting serialized string exactly; it does not recognize all semantically equivalent destinations. Returning an existing mapping preserves its original expiration time.

### Consequences

- Good, because active repeated submissions return a stable link without adding another record or extending its lifetime.
- Good, because random generation avoids a persistent sequence counter and collision checks include retained history.
- Bad, because modulo mapping introduces character-frequency bias; these codes provide no authorization or secrecy guarantee.
- Bad, because collision checking and insertion are separate operations without a storage-level code uniqueness constraint. The current implementation does not guarantee uniqueness under concurrency.
- Bad, because code case must be preserved and equivalent URLs with different serialized representations can receive different mappings.
