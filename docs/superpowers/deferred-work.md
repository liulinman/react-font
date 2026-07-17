## Deferred from: code review of spec-weak-word-context-repair-loop (2026-07-17)

- Replace the existing in-process Context Lab generator with a durable external queue so pending tasks survive a backend process exit. This is a pre-existing architecture concern outside the approved feature boundary.
