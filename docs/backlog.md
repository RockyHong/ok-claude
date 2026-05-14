# Backlog

Single tracker for deferred items — things found but not fixing now. Solo-dev queue. Scanned by doc sync at commit. When picking up new work, scan related items here to bundle.

**Three categories** distinguished by ID prefix:

- **`BUG-###`** — broken behavior. Surface symptom may hide deeper cause.
- **`DEBT-###`** — working but rotting (test fixture rot, stale dep, cleanup owed).
- **`GAP-###`** — design gap, never properly specced.

No phase prescription per category — when an item rolls into a session, the harness phase-gate triage decides which superpowers phases run. Surface "clear fix" can become design work after evidence; pre-routing biases that judgment.

Format per item: stable ID, short title, affected area, why it matters, proposed fix or what's missing. Newest at top. When resolved, **delete the item** — git history is the archive.

---

## Roadmap

Ordered feature list. F1 shipped; rest are placeholders until promoted. When a feature begins, write its spec at `docs/superpowers/specs/{date}-{slug}.md` and plan at `docs/superpowers/plans/{date}-{slug}.md`; when it ships, delete those temporal files (per CLAUDE.md § Doc Sync).

| ID | Slug                  | Title                                              | Rationale                                                                |
| -- | --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| F1 | `mvp-wordcloud`       | Vertical slice: logs → tokens → HTML wordcloud     | Smallest end-to-end runnable. Proves stack. Shipped.                     |
| F2 | `speaker-split`       | Split user vs Claude tabs in output HTML           | Core v1 promise per `docs/overview.md`.                                  |
| F3 | `cli-filters`         | `--project <name>`, `--since <window>`, `--top-n`  | Scope long histories / many-project users.                               |
| F4 | `a11y-table`          | Top-N `<table>` fallback below wordcloud           | a11y commitment per `docs/techstack.md` § Key Dependencies.              |
| F5 | `png-export`          | Wire `html-to-image` to in-page Export button      | Social-share = core value prop per `docs/overview.md`.                   |
| F6 | `npm-publish`         | Publish to npm registry, README, `npx` smoke       | Ships v1. Closes the distribution loop.                                  |
| F7 | `sentence-frequency`  | Sentence tokenization + sentence-cloud (v2)        | v2 per `docs/overview.md` — iterate post-publish.                        |

---

## Open

_(none — GAP-001 resolved; feature breakdown above replaces it.)_
