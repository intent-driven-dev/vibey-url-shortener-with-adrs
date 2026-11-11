---
status: accepted
---

# Use a dependency-free Node.js application

## Context and Problem Statement

Users need to submit long URLs, receive short links, and follow those links to their destinations. Commit `7d5a031` explicitly required a dependency-free Node application. [package.json](../../package.json) and [server.js](../../server.js) implement that requirement using CommonJS and Node's built-in HTTP server, with server-rendered HTML, inline CSS, and ordinary form submissions.

This retrospective record is accepted following explicit user approval. The requirement is documented in commit history; the options and tradeoffs below are reconstructed from the implementation, rather than evidence of a historical options review. Acceptance records approval now, not evidence of historical approval.

## Considered Options

- A dependency-free Node.js process serving HTML and redirects.
- A Node.js web framework and template engine.
- A separate browser application calling an HTTP API.

## Decision Outcome

Chosen option: "A dependency-free Node.js process serving HTML and redirects", because it meets the explicit dependency constraint and supports the browser workflow without a frontend build or separate service.

Proposed partial superseded-by: [ADR 0005 (proposed)](0005-use-async-for-slow-io-operations.md), which would allow the npm `async` package for selected slow I/O operations. This decision remains accepted pending acceptance of that successor; the proposal does not change the current dependency policy.

The server handles creation at `POST /shorten`, active listings at `GET /urls`, and resolution at `GET /<code>`, using HTTP 302 for active redirects. Persistence is accessed through the [storage boundary](0002-isolate-json-persistence-behind-a-replaceable-storage-boundary.md). These route and rendering choices are observed implementation details; the original prompt did not prescribe them.

### Consequences

- Good, because running the application requires Node and `npm start`, without third-party runtime packages or a frontend build.
- Good, because one process owns the browser workflow and redirect handling, keeping deployment small.
- Bad, because routing, request parsing, HTML rendering, and error handling must be maintained directly in application code.
- Bad, because HTTP handling and presentation share one module and cannot be deployed independently.
