# F8 — mood-cloud-pivot

> Spec for F8 from `docs/overview.md` § Roadmap. Brainstormed 2026-05-15. Ship target: pre-F5 (`png-export`).
> Temporal — delete this file when F8 lands (per `CLAUDE.md` § Doc Sync).

## Problem

F1–F4 shipped a body-token wordcloud + opener side panel. A/B against real corpus (441 sessions, 11.6k msgs, captured in `ok-claude-firstword.html`) shows:

- Body-token cloud is **balanced** (top1/top10 ≈ 2.3×) — looks like a generic dev cloud (`need` / `repo` / `skill` / `user` / `run`). Brand pun (`OK Claude`) never lands in the cloud itself.
- First-word cloud is **power-law** (top1/top10 ≈ 13.4×, `ok` = 739). Brand pun lands as the giant center word; opener tics (`wait` / `what` / `let` / `no` / `so` / `why`) form a halo around it.

Per § Problem reframe (this spec triggers it): tool is a ~30s glance-for-pun, not a reflection / rewind artifact. Share-loop favors first-word punch; "look how much of my year I spent on X" framing gets dropped.

Decision matrix walked in brainstorm: pure surface-fit favors body-token cloud; share-loop favors first-word cloud. With dual-surface (cloud + panel), both axes coexist — cloud takes the meme axis (first-word), panel takes the vocab axis (body-token).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Cloud source = first-word.** Per-role first-word frequency feeds the cloud. | Power-law puts brand pun at center; instant-recognizable share artifact. |
| 2 | **Panel source = top-5 body-token words + counts.** Side panel keeps its slot, swaps source from openers to body-token; list size trims 10 → 5. | Recovers vocab axis lost from cloud. Top-5 (vs 10) saves vertical space → bigger cloud. Body-token long-tail dies; accepted. |
| 3 | **Tabs unchanged.** You/Claude both surface first-word cloud + body-token panel. | Symmetry preserved per § Non-Negotiable #6. Claude-side first-word (`Now` / `Done` / `Right`) doubles meme surface at zero cost. |
| 4 | **No opener filter tweaks.** Prefix leakage (`1` / `A` / `B` / `Request` / `i` from A/B sample) → DEBT-003. | Filter design is independent extraction problem; measure delta against real shipped cloud before tuning. |
| 5 | **No clitic fix.** GAP-014 stays deferred. | Separate denoise-layer concern; same reasoning as #4. |
| 6 | **No halo-weight tweak.** Linear weighting (`12 + ratio * 80px`) stays. | Power-law honestly rendered. Tune if visually broken post-ship. |
| 7 | **Panel header label = `Words` placeholder.** F4 `Openers` label survives mechanically as `Words` for source swap. | Full copy revision deferred to DEBT-004 (UI wording surface review). No per-feature copy edits. |

## Non-goals (deferred)

- Sentence clustering (F7 — own brainstorm pending; UI layout open)
- Opener prefix filtering (DEBT-003)
- UI wording surface review (DEBT-004)
- Clitic strip fix (GAP-014)
- Halo-weight tuning
- Brand-center force-placement (trust `wordcloud2` default; tune only if `ok` lands off-center post-ship)
- F4 panel deletion (initial F8 roadmap text said "retire" — superseded by this spec; panel stays, source swaps)

## Surface changes (file-by-file)

- **`src/pipeline.ts`**
  - Drop body-token tokenize fold from primary cloud-data path. Tokenize fold persists but feeds panel source instead of cloud.
  - Cloud-data source: reshape `topNOpeners(userOpeners, TOP_N)` output → `Array<[surface, count]>` → assign to `topUser` / `topClaude` render-input keys.
  - Panel-data source: `topN(userTokens, 5)` / `topN(claudeTokens, 5)` → assign to new `panelUser` / `panelClaude` render-input keys.
  - Drop `openersUser` / `openersClaude` from render-input.
  - Constant rename: `TOP_OPENERS = 10` → `TOP_PANEL = 5`. Cloud `TOP_N = 100` unchanged.
- **`src/render.ts`**
  - `__DATA__` shape change: `{ topUser, topClaude, panelUser, panelClaude, meta }`. Drop `openersUser` / `openersClaude` keys.
  - `RenderInput` type: add `panelUser` / `panelClaude: Array<[string, number]>`; remove `openersUser` / `openersClaude`.
  - `paintOpeners` → `paintPanel`. Function body unchanged in shape (textContent-set per row, XSS-safe). Reads `panelUser` / `panelClaude` instead of `openersUser` / `openersClaude`. Display = surface; count = count.
  - `<h2>Openers</h2>` → `<h2>Words</h2>` (decision #7).
  - Cloud weighting unchanged.
  - `<aside id="openers">` keep id (or rename to `panel` — pick in execute; both fine, low blast).
  - Empty-state copy unchanged (`No words from You yet.` is source-agnostic).
- **`src/aggregate.ts`** — no changes. `topN`, `topNOpeners`, `foldOpener`, `OpenerMap` all retained as primitives.
- **`src/openers.ts`** — no changes. `firstOpener` unchanged.
- **`src/tokenize.ts`** — no changes. Still feeds panel source.
- **`src/denoise.ts`** — no changes.

## Test surface

- `pipeline.test.ts` — update fixture expectations: `topUser` / `topClaude` now carry first-word data; `panelUser` / `panelClaude` carry body-token top-5.
- `render.test.ts` (if exists) — update DOM assertions for panel header text + data-source key rename.
- No new test files needed; reusing existing primitives.

## Success criteria

1. `pnpm test` green
2. `pnpm exec tsc --noEmit` green
3. Smoke on real corpus: cloud renders with first-word data; top first-word visually dominant; panel shows 5 body-token rows with counts.
4. Screenshot eyeball: brand pun visible at first glance (top first-word ≥ 3× larger than next).
5. Panel slot still occupied (not visually broken). Tab switching still toggles both cloud + panel data.
6. CJK-bearing message inputs still extract first-word + tokenize cleanly (existing primitives unchanged — regression-only check).

## On-merge cleanup

- Delete this spec file (`docs/superpowers/specs/2026-05-15-mood-cloud-pivot.md`) per `CLAUDE.md` § Doc Sync temporal cleanup.
- Delete F8 row from `docs/overview.md` § Roadmap per § Doc Sync roadmap cleanup.
- `docs/overview.md` § Module Index updates for `pipeline.ts` (cloud-source change) and `render.ts` (panel-source change, `__DATA__` shape) batch with execute commit.

## F7 deferred state (captured for next brainstorm)

Macro direction settled this brainstorm:

- Sentence-cluster via mechanical hashing (no LLM, no model download — protects § Non-Negotiable #2 zero-install).
- Lean primitive: char n-gram (n=3) MinHash + LSH bucket. Language-agnostic, CJK-clean, robust to typos and segmenter drift. Hand-rollable ~100 LOC, zero deps.
- Lean scope: first-sentence-only (extends F8 first-word axis from word → phrase, tighter signal-to-noise).

Open for F7 brainstorm:

- **UI layout** — replace cloud / replace panel / third surface / co-existence shape. (User flagged exploration needed.)
- Threshold tuning (Jaccard cutoff for cluster bucket).
- All-sentence vs first-sentence-only — final call.
- CJK as first-class design constraint: per-script threshold scaling, particle/stopword equivalents, sentence-boundary primitive (`Intl.Segmenter({granularity:"sentence"})`).
