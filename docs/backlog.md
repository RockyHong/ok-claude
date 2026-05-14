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

### GAP-009 — apply cc-log-schema findings to `parse.ts` + `discover.ts`

- **Area:** `src/parse.ts`, `src/discover.ts`
- **Why it matters:** GAP-008 landed `docs/cc-log-schema.md` — the empirical+community-verified per-line schema. Audit surfaced two concrete prose-gating leaks the current parser does not handle:
  1. **`isSidechain: true` leak (huge).** 45% of `user` lines (24,942) and 44% of `assistant` lines (33,772) in the local 235k-line probe carry `isSidechain: true`. These are inline subagent/Task dispatch transcripts — LLM-to-LLM prose, not human typing. Current `discover.ts` only filters subagents stored as separate files under `subagents/`; inline sidechains inside main session files all leak through. Likely the single biggest noise source still in the wordcloud.
  2. **`isApiErrorMessage: true` leak (small).** 50 assistant lines flagged as rate-limit / server-error stubs (status 429 / 529). Low volume but trivially droppable.
  3. **Type-whitelist gap.** Today `parse.ts` survives noisy line types (`attachment`, `system`, `progress`, `last-prompt`, …) only by accident — the role check on `message.role` happens to fail when the line shape lacks a `message` field. Brittle. Replace with positive whitelist: `type === "user" || type === "assistant"`.
  4. **`isVisibleInTranscriptOnly: true` redundant gate.** Always co-occurs with `isCompactSummary: true` (88/88 paired). Drop adds belt-and-suspenders against version drift; near-zero risk.
- **Proposed fix:** add the four gates in `parse.ts` line-skip block in the order specified in `docs/cc-log-schema.md` § "Recommended prose-gating filter". TDD per CLAUDE.md — fixtures for each flag using the anonymized samples already in the schema doc. No `discover.ts` change needed (subagent path filter still correct).
- **Surfaced during:** GAP-008 schema research session.
- **Depends on:** none. Ready to pick up.

### GAP-007 — non-fenced error/log paste denoise (real-data TDD fixtures)

- **Area:** `src/denoise.ts` (or new pre-tokenize step)
- **Why it matters:** after BUG-002 (subagent path) + BUG-003 (compact-summary) + GAP-002 (fenced-code strip), residual user top-100 still contains tech tokens user explicitly says they never type. Real-data probe shows leaks:

  | User says they NEVER type | top-100 count / rank |
  | --- | --- |
  | `mono` | 406 / **#11** |
  | `jit` | 313 / **#20** |
  | `null` | 266 / #25 |
  | `program` | 158 / #60 |
  | `gradle` | 145 / #65 |
  | `android` | 131 / #81 |
  | `bool` | 129 / #82 |
  | `object` | 125 / #87 |
  | `src` | 115 / #95 |

  | User says they RARELY type | count / rank |
  | --- | --- |
  | `date` | 355 / #15 |
  | `unity` | 348 / #17 |
  | `then` | 178 / #51 |
  | `library` | 114 / #96 |

  Likely sources: pasted TS/lint type errors (`null`, `bool`, `object`, `NullReferenceException` style), build/runtime log paste (`mono`, `jit`, `gradle`, `android` from Unity/Android stack traces), JS `.then()` chain mentions, `Date.now()` references. All survive fenced-code strip because users paste error text inline without ``` ``` fences.
- **Proposed fix (design call needed):** detect non-fenced structured/repetitive blocks:
  1. Stack-trace pattern (lines starting `at ...`, `  File "...", line ###`, indented stack frames).
  2. Type-error pattern (`Type '...' is not assignable to type '...'`, `NullReferenceException`, `error TSxxxx:`).
  3. Heuristic: any 3+ consecutive lines where ≥50% of tokens are identifier-like (`[a-z]+\.[a-z]+`, `[A-Z][a-zA-Z]+Error`) → treat as paste blob, strip.
- **TDD fixtures:** every token in the table above is a known-bad. Test = denoise pipeline should reduce their counts to user-reported reality (`mono` 0–5, not 406). Pre-write per-token assertions before iterating regex.
- **Also surfaced:** `soc` (user says they say it a lot, count=83, rank #168) — under-ranked, related GAP-### would be rarity/per-session weighting. Keep separate from this paste-denoise scope; this scope is about cutting noise floor, not boosting signal.
- **Surfaced during:** post-BUG-003 wet-run audit (this session).

### GAP-006 — rarity / per-session weight for meme-energy tokens

- **Area:** `src/aggregate.ts` or new ranking step
- **Why it matters:** even after schema + paste cleanup, conversational meme tokens (`wth` count=30 rank #478, `soc` count=83 rank #168) sit far below the top-100 render cut. Across 7331 unique user tokens, working vocab (`task`, `commit`, `claude`, `skill`) dominates by absolute count. But the wordcloud's brand promise = "the meme self-roast you," not "the boring dev grammar." Raw-frequency ranking loses this fight.
- **Surfaced during:** this session's audit after BUG-002 + BUG-003 landed and revealed real-but-rare `wth`/`soc` counts that still won't render.
- **Proposed fix (design call needed):** options —
  1. **Per-session normalize** — count token frequency per session-file, average across sessions. Distinctive vocab survives; project-specific tech vocab demoted by spread.
  2. **TF-IDF-ish boost** — multiply count by `log(total_sessions / sessions_containing_token)`. Memes that appear in few sessions but heavily get a boost; everywhere-tokens get cut.
  3. **Per-message dedup or cap** — overlaps GAP-003. Caps within-message repetition.
- **Open:** picking #1 or #2 changes the count semantics that show in the cloud — the "size = count" mental model breaks. May need a tooltip / secondary "distinctive vocab" view.
- **Depends on:** GAP-007 (paste denoise) — should land first so we're not boosting `mono`/`jit` noise into top-100.

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
