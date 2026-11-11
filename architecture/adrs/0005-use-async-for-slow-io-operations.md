---
status: proposed
---

# Use async for slow I/O operations

## Context and Problem Statement

Selected requests will perform slow external calls or other I/O, and callers should wait for the result in the same HTTP request. The application already uses native `async`/`await` and asynchronous file I/O; the purpose of adding the npm `async` package is to coordinate work with bounded concurrency. The concrete operations and affected routes have not yet been identified.

Proposed partial supersedes: [ADR 0001 (accepted)](0001-use-a-dependency-free-nodejs-application.md). If accepted, this decision relaxes its dependency-free constraint to allow `async`, while preserving the existing Node.js application structure. ADR 0001 remains accepted pending acceptance of this successor; creating this record does not accept the proposal.

## Considered Options

- Native promises and `async`/`await`, with application-managed concurrency control.
- The npm `async` package using `async.queue` with bounded concurrency.
- Durable background jobs with an immediate job identifier and completion polling.

## Decision Outcome

Chosen option: "The npm `async` package using `async.queue` with bounded concurrency", because it meets the explicit library preference and provides concurrency control for selected slow I/O while allowing callers to wait for completion.

Use a queue shared across the selected workload within the process, with handlers awaiting `pushAsync` to receive each task's result or rejection. The [Async queue documentation](https://caolan.github.io/async/v3/docs.html#queue) describes the concurrency limit and promise-based error propagation. Native asynchronous I/O remains necessary inside workers; the queue does not make blocking work non-blocking.

Concrete operations, routes, concurrency limits, queue capacity, timeouts, and cancellation behavior will be specified when the workload is designed. This documentation-only proposal does not install the package or introduce HTTP interfaces or application code.

Request coordination is separate from the [JSON persistence boundary in ADR 0002](0002-isolate-json-persistence-behind-a-replaceable-storage-boundary.md). This proposal does not serialize all storage mutations or resolve overlapping JSON writes, failed-write consistency, or code uniqueness under concurrency.

### Consequences

- Good, because selected I/O workloads can have explicit concurrency limits shared across requests in one process.
- Good, because handlers can await individual results and propagate task failures through their request error handling.
- Bad, because a third-party runtime dependency introduces installation, maintenance, and upgrade responsibilities.
- Bad, because requests remain open during queueing and execution, requiring workload-specific capacity and timeout policies.
- Bad, because queued work is held in memory and does not survive process restarts; limits are local to each process.
- Bad, because the queue does not offload CPU-heavy work or fix persistence concurrency hazards.
