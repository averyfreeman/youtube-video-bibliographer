# Persist asynchronous jobs on the local filesystem

Full-video bibliography work can outlive an HTTP request and can require retries, so creation returns a job identifier while a local worker persists transcript, candidate, and synthesis checkpoints under `.runtime/jobs`. Atomic JSON writes and restart recovery make the prototype resumable without introducing a database before the job model is proven.
