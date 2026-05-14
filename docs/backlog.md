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
| F2 | `speaker-split`       | Split user vs Claude tabs in output HTML           | Shipped. Two-tab split (You / Claude) with per-tab empty-state.          |
| F3 | `stream-and-progress` | Stream tokenize + terminal progress bar (no flags) | Shipped. Streaming pipeline + per-role Map fold (no whole-corpus arrays). TTY-gated stderr progress bar. Bundled BUG-001 (harness vocab filter, extended to task-notification + bash-* tags from real-data smoke) + GAP-004 (real token totals in subhead). |
| F4 | `a11y-table`          | Top-N `<table>` fallback below wordcloud           | a11y commitment per `docs/techstack.md` § Key Dependencies.              |
| F5 | `png-export`          | Wire `html-to-image` to in-page Export button      | Social-share = core value prop per `docs/overview.md`.                   |
| F6 | `npm-publish`         | Publish to npm registry, README, `npx` smoke       | Ships v1. Closes the distribution loop.                                  |
| F7 | `sentence-frequency`  | Sentence tokenization + sentence-cloud (v2)        | v2 per `docs/overview.md` — iterate post-publish.                        |

---

## Open

### GAP-005 — short-Latin filter drops legit interjections (`y`, `n`, `k`, `lol`-ish)

- **Area:** `src/tokenize.ts` line ~24 (`if (!isCjk && [...lower].length < 2) continue;`)
- **Why it matters:** F3 wet-run surfaced this — user reports saying "y" a lot, expects it in cloud, doesn't appear. Current rule drops ALL single-char Latin to kill code-variable noise (`i`, `j`, `x`). Collateral damage = legit interjections (`y`/`n` for yes/no, `k` for "ok"). Meme energy loss.
- **Surfaced during:** F3 wet-run inspection.
- **Proposed fix (design call needed):** options —
  1. Whitelist single-char Latin interjections (`y`, `n`, `k`) — explicit, narrow, easy to defend.
  2. Drop length filter entirely, lean on stopword set + paste denoise to control noise — riskier; now testable since GAP-002 denoise shipped.
  3. Context-aware filter — only drop short Latin INSIDE pasted code blocks (overlapping work already done by denoise).
- **Open:** is "y" alone meaningful enough to ship, or is "yeah"/"yes" the real signal? Check post-denoise data now that GAP-002 landed.
- **Unblocked:** GAP-002 paste denoise shipped — evaluate options on clean data.

### GAP-003 — revisit per-occurrence vs per-message counting

- **Area:** `src/aggregate.ts` (or upstream in pipeline)
- **Why it matters:** current rule = every token instance counts. "ok claude ok claude" in one message = 2. Preserves intensity (matches brand). But amplifies any per-message repetition pathology. Once GAP-002 ships, re-evaluate whether per-message dedup or a per-message cap improves signal.
- **Surfaced during:** F2 brainstorm. Decided to keep per-occurrence for v1; defer reconsideration until paste-denoise ships — paste blobs were the real noise driver that motivated the worry. GAP-002 denoise shipped; re-evaluate now on post-denoise data.
- **Proposed fix (if revisited):** per-message cap at N occurrences, or per-message dedup. Pick after data, not speculation.
