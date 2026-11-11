---
status: proposed
---

# Isolate JSON persistence behind a replaceable storage boundary

## Context and Problem Statement

Short-code mappings must survive process restarts. Commit `de29f7d` explicitly requested JSON-file storage for now, structured so it could later be swapped to Postgres. [server.js](../../server.js) constructs a [UrlRepository](../../storage/url-repository.js) with a [JsonUrlStore](../../storage/json-url-store.js); HTTP handlers use the repository instead of manipulating the file.

This retrospective record is proposed for review. The storage requirement comes from commit history; alternatives and tradeoffs below are reconstructed. Postgres is an intended extension, not an implemented adapter or an approved migration.

## Considered Options

- JSON-file storage injected into a repository that owns short-code creation.
- Direct file access from HTTP handlers.
- A Postgres-backed store immediately.

## Decision Outcome

Chosen option: "JSON-file storage injected into a repository that owns short-code creation", because it satisfies the requested persistence mechanism while separating HTTP handling and code generation from storage operations.

The store loads `data/urls.json` into memory during initialization and rewrites the complete `{ links: [...] }` document on creation. Records contain `code`, `longUrl`, `createdAt`, and `expiresAt`. Missing files are created; JSON parse errors fail initialization. Invalid records are discarded during loading, while missing timestamps are supplied in memory. See the [expiration decision](0004-expire-mappings-after-90-days-while-retaining-expired-records.md) for the consequences of these defaults.

The repository relies on store operations including `init`, `findByCode`, `findByLongUrl`, `list`, `hasCode`, and `create`. A replacement must preserve [mapping identity](0003-use-seven-char-mixed-case-alphanumeric-codes-and-reuse-active-mappings.md) and expiration semantics. This boundary is a JavaScript convention, with no formal interface or database adapter.

### Consequences

- Good, because persisted mappings require no database service and the repository can receive a different store implementation.
- Good, because the store accepts a file path and clock, allowing isolated tests with temporary files and controlled time.
- Bad, because all records remain in memory, lookups scan arrays, and each insertion rewrites the whole file.
- Bad, because there is no interprocess coordination, atomic file replacement, or serialization of overlapping writes. Multiple writers require further work; even a single process can overlap asynchronous writes.
- Bad, because creation mutates memory before writing, so a failed write can leave a record available in memory despite a failed request. A Postgres replacement also needs deliberate transaction and uniqueness handling.
