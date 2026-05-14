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

### GAP-009 — schema-driven parse redesign + vocab contracts (TDD)

Anchor work for the next pipeline pass. Absorbs and supersedes the prior GAP-005 (short-Latin interjections), GAP-006 (rarity/meme weighting), GAP-007 (non-fenced paste denoise) — their TDD material is the **Vocab Contracts** section below. Original fix-mechanism prescriptions preserved as **Likely mechanisms**. GAP-003 (per-occurrence counting) stays separate — orthogonal counting-semantics question.

#### A. Parse.ts redesign

- **Area:** `src/parse.ts` (primary), `src/discover.ts` (unchanged — subagent path filter still correct)
- **Why it matters:** GAP-008 landed `docs/cc-log-schema.md`. Current `parseLine` filter is implicit — drops 10 metadata line types only because their shape lacks `.message`. Two prose-gating leaks confirmed empirically:
  1. **`isSidechain: true` leak (huge).** 45% of `user` lines (24,942) and 44% of `assistant` lines (33,772) in the 235k-line probe — inline subagent/Task dispatch prose. Single biggest noise source remaining.
  2. **`isApiErrorMessage: true` leak (small).** 50 assistant lines (status 429 / 529 stubs).
  3. **Type-whitelist gap.** Replace implicit role-failure drops with explicit `type ∈ {"user","assistant"}` first gate. Brittle accident → spec-driven contract.
  4. **`isVisibleInTranscriptOnly` redundant pair-gate.** Always co-occurs with `isCompactSummary` (88/88). Add as belt-and-suspenders against version drift.
- **Spec:** `docs/cc-log-schema.md` § "Recommended prose-gating filter" — execute that pseudocode verbatim. Order: type-whitelist → flag gates → content-block extraction.
- **Implementation shape:** keep `parseLine(line): LogEvent | null` public surface. Replace ad-hoc `if` ladder with typed `RawLine` schema + single drop switch keyed by reason. Each drop has a stable reason string for debugging.

#### B. Fixture tests (line-type contracts)

Convert the 12 anonymized samples already in `docs/cc-log-schema.md` § "Anonymized samples" into `vitest` fixtures. One per case:

| Fixture | Expected | Drop reason |
|---|---|---|
| user-plain | keep | — |
| user-meta | null | `isMeta` |
| user-compactSummary | null | `isCompactSummary` |
| user-sidechain | null | `isSidechain` ← currently leaks |
| user-toolResult (no text block) | null | empty-text after extract |
| assistant-plain | keep | — |
| assistant-sidechain | null | `isSidechain` ← currently leaks |
| assistant-apiError | null | `isApiErrorMessage` ← currently leaks |
| system / attachment / progress / last-prompt / ai-title / file-history-snapshot / permission-mode / queue-operation / custom-title / agent-name | null | type-whitelist |

Plus version-drift defense: synthetic `{"type": "summary", ...}` → null (legacy compact-summary type, zero observed in current corpus but documented).

#### C. Vocab contracts (cross-cutting; absorbed from GAP-005/006/007)

End-to-end pipeline assertions on user top-100 after full run against `~/.claude/projects/`. These are **wet-run contract tests**, not parse-only — they validate the whole pipeline meets self-reported user vocab reality.

**User says they NEVER type — target count ≤5 each, must NOT appear in top-100:**

| Token | Pre-fix count / rank | Likely source |
|---|---|---|
| `mono` | 406 / #11 | Unity/Android build stack traces in subagent dispatches |
| `jit` | 313 / #20 | Unity IL2CPP / JIT compiler logs |
| `null` | 266 / #25 | TS lint errors, NullReferenceException pastes |
| `program` | 158 / #60 | C# `Program.cs` stack-frame references |
| `gradle` | 145 / #65 | Android build log paste |
| `android` | 131 / #81 | Android build log paste |
| `bool` | 129 / #82 | TS type-error paste |
| `object` | 125 / #87 | TS type-error paste |
| `src` | 115 / #95 | path fragments in stack traces |

**User says they RARELY type — must fall outside top-50:**

| Token | Pre-fix count / rank |
|---|---|
| `date` | 355 / #15 |
| `unity` | 348 / #17 |
| `then` | 178 / #51 |
| `library` | 114 / #96 |

**User says they say A LOT — must appear in top-100 (currently missing or under-ranked):**

| Token | Pre-fix count / rank | Currently blocked by |
|---|---|---|
| `y` | dropped pre-aggregate | single-char Latin filter (`tokenize.ts`) |
| `n` | dropped pre-aggregate | single-char Latin filter |
| `k` | dropped pre-aggregate | single-char Latin filter |
| `wth` | 30 / #478 | absolute-frequency ranking buries low-count meme |
| `soc` | 83 / #168 | absolute-frequency ranking |

#### D. Likely mechanisms (carry-over from absorbed gaps)

Contract failures may not all resolve from parse redesign alone. Mechanism hints, in landing order:

1. **Parse redesign (this item's anchor work)** — sidechain drop kills 45% of user lines, dents NEVER tokens that originated in subagent stack-trace dispatches (`mono`, `jit`, `gradle`, `android`, `program`). Type-whitelist + apiError gate add defense in depth.
2. **Non-fenced paste denoise** (was GAP-007's `src/denoise.ts` extension) — detect non-fenced stack-trace / type-error blocks via heuristics: lines starting `at ...` / `  File "...", line ###`; patterns like `Type '...' is not assignable`, `NullReferenceException`, `error TSxxxx:`; 3+ consecutive lines where ≥50% tokens are identifier-shape (`[a-z]+\.[a-z]+`, `[A-Z][a-zA-Z]+Error`) → strip. Kills residual NEVER/RARELY tokens that persist in main-convo prose.
3. **Short-Latin whitelist** (was GAP-005's `src/tokenize.ts` ~line 24) — admit `y` / `n` / `k` as named exceptions to the single-char Latin drop. Narrow whitelist; explicit.
4. **Rarity/per-session weighting** (was GAP-006's `src/aggregate.ts` or new ranking step) — surface low-count high-distinctiveness memes (`wth`, `soc`). Options: per-session normalize, TF-IDF-ish `log(total_sessions / sessions_with_token)`, or per-message cap. Mental-model risk: breaks "size = count"; may need tooltip / secondary view.

Pick mechanism per failing contract — TDD is the driver, not pre-committed ordering.

#### Surfaced during

GAP-008 schema research session. Vocab contracts originally surfaced in F3 wet-run + post-BUG-003 audit; consolidated here.

#### Depends on

None. Schema doc landed. Ready to pick up.

### GAP-003 — revisit per-occurrence vs per-message counting

- **Area:** `src/aggregate.ts` (or upstream in pipeline)
- **Why it matters:** current rule = every token instance counts. "ok claude ok claude" in one message = 2. Preserves intensity (matches brand). But amplifies any per-message repetition pathology. Once GAP-002 ships, re-evaluate whether per-message dedup or a per-message cap improves signal.
- **Surfaced during:** F2 brainstorm. Decided to keep per-occurrence for v1; defer reconsideration until paste-denoise ships — paste blobs were the real noise driver that motivated the worry. GAP-002 denoise shipped; re-evaluate now on post-denoise data.
- **Proposed fix (if revisited):** per-message cap at N occurrences, or per-message dedup. Pick after data, not speculation.
