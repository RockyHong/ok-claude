# F8 — mood-cloud-pivot

> Spec for F8 from `docs/overview.md` § Roadmap. Brainstormed 2026-05-15. Rewritten 2026-05-16 to match mockup-locked UX (`mockup-f8.html`). Ship target: pre-F5 (`png-export`).
> Temporal — delete this file when F8 lands (per `CLAUDE.md` § Doc Sync).

## Problem

F1–F4 shipped a body-token wordcloud + opener side panel. A/B against real corpus (441 sessions, 11.6k msgs, captured in `ok-claude-firstword.html`) showed:

- Body-token cloud is **balanced** (top1/top10 ≈ 2.3×) — looks like a generic dev cloud (`need` / `repo` / `skill` / `user` / `run`). Brand pun (`OK Claude`) never lands in the cloud itself.
- First-word cloud is **power-law** (top1/top10 ≈ 13.4×, `ok` = 739). Brand pun lands as the giant word; opener tics (`wait` / `what` / `let` / `no` / `so` / `why`) form the halo around it.

Per § Problem reframe: tool is a ~30s glance for the pun, not a reflection / rewind artifact. Share-loop favors first-word punch.

Brainstorm originally specced dual-axis (cloud=first-word + panel=top-5 body-token). Mockup iteration audited the strip against § Problem 30s-glance / § NN#7 meme-energy / § NN#6 two-axis spirit and dropped it (see `docs/backlog.md` DEBT-006). Body-token vocab is generic dev-cloud noise — same failure mode that justified pivoting the cloud away from body-tokens. Ship the cloud-only artifact; restore the strip post-publish only if user demand surfaces.

The two-axis spirit (§ NN#6) is satisfied by the dual horizontal halves — user-cloud on the left, Claude-cloud on the right. Speaker split is the axis.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Cloud source = first-word per role.** Per-role first-word frequency (`firstOpener` fold) feeds both canvases. | Power-law puts brand pun at center; instant-recognizable share artifact. Confirmed in A/B. |
| 2 | **Dual canvas, horizontal halves, 1:1 square ratio.** Left half = user, right half = Claude. No tabs, no swap, both visible simultaneously. | 1:1 fits every share platform (Twitter/X, LinkedIn, IG, Discord) without crop. Two-axis spirit (§ NN#6) lives in the side-by-side, not tabs. |
| 3 | **Asymmetric rotation = the pun.** User side rotates 25% (chaos — `rotateRatio: 0.25`, ±π/8); Claude side stays 0% (order — `rotateRatio: 0`). | "Chaotic dev brain dumps at assistant order" reads instantly. Asymmetry IS the joke; matching both sides erases it. |
| 4 | **Identity colors: white = user, amber `#d97757` = Claude.** Applied to side-labels + per-side word fill. **Not** emphasis — emphasis uses white-bold against gray scaffold. | Claude amber is the brand color; white is the user's voice. Color = identity, not stress. Emphasis lives only in the headline. |
| 5 | **Brutal two-line header, asymmetric L/R.** Top line (L-aligned): `OK. CLAUDE — [10.3M tokens] burned in [30 days].` auto-fits header width via JS measure-scale. Bottom line (R-aligned, smaller): `avg [343K tokens/day].` White-bold accent on numbers, gray scaffold (`#7a838c`) on connectives. Brand wordmark `OK. CLAUDE` (period-bound, single inline unit). | Burn-truth headline punches before the cloud. Auto-fit guarantees the top line owns the header regardless of corpus size. L/R asymmetry mirrors the dual-cloud asymmetry below. |
| 6 | **Token source = `usage.output_tokens` from cc session log (parse.ts:105-110).** Aggregate `meta.tokensOut` only for headline burn-display. Input tokens still summed into `meta.tokensIn` for record but not surfaced in header. Cache tokens (`cache_creation_input` / `cache_read_input`) not summed. | Output-tokens-only matches "burn-brag" cultural trend (what Claude wrote, i.e. what *you* caused). Input-token totals inflate the number with cache-padded context that doesn't read as burn. |
| 7 | **Asymmetric side-labels, own flow above canvas.** User: `This is what you dump across [N] messages:` (L-aligned, white at 0.7 opacity). Claude: `And this is what claude response:` (R-aligned, amber at 0.85 opacity). Lowercase. Mirror-aligned, not absolute overlay. `N` = `fmtTokens(meta.messages)`. | Self-explanatory copy — no decoder ring. Attack-then-react cadence ("you dump … and claude response") tells the joke in two beats. Mirror alignment reinforces the dual-cloud axis. |
| 8 | **Footer CTA: `> npx ok-claude  # confess yours`** at bottom-right of artifact, monospace micro-text. Amber `npx ok-claude`, gray comment. Travels with PNG export. | Install path lives on the meme — no caption needed when shared. "Confess yours" frames the share-loop. |
| 9 | **No alpha on cloud words.** Font size carries weight signal (range 6→500px). `gridSize = 3 × fontMin` (gap ratio 3). Adaptive N via `drawOutOfBound: false` — wordcloud2 drops what can't place. | Alpha + size dual-encoding muddies the power-law. Single signal (size) lets the brand pun dominate honestly. Wide gap = brutalism breathing room. |
| 10 | **`wordcloud2` vendored.** `src/vendor/wordcloud2.js` stays at runtime (REVERSED earlier "drop it" lean). | Needed for spiral placement + per-canvas `origin` seed. Roll-our-own would re-derive `drawOutOfBound` + spiral search — out of scope. |
| 11 | **Origin seed: `edge` (inner-facing).** User cloud origin at `[W*0.92, H/2]` (right edge of left half); Claude cloud origin at `[W*0.08, H/2]` (left edge of right half). | Pulls dominant words toward the centerline — brand pun (`ok` / `Now`) meets across the dual canvas. Reads as one composition, not two clouds. |
| 12 | **Strip dropped.** Body-token side panel removed from artifact. Pipeline body-token tokenize/fold/topN path stays live (per DEBT-006: cleanup-vs-keep-latent decision deferred post-publish). | First-principle audit against § Problem 30s-glance + § NN#7 meme-energy: generic dev vocab fails both. Restore only on user demand signal. |
| 13 | **No opener filter tweaks, no clitic fix, no halo-weight tweak.** DEBT-003 (list-marker / role-label / single-Latin leakage), GAP-014 (clitic strip), and halo weighting all deferred. | Independent denoise-layer concerns; measure delta against real shipped cloud before tuning. |

## Non-goals (deferred)

- **Strip / dual-axis / body-token panel** — DEBT-006 (decision deferred post-publish; pipeline body-token path stays live as restore-bait).
- **Aesthetic polish** — DEBT-005 (systematic dim-hierarchy / uppercase policy / color-emphasis placement / padding rhythm / edge-case rendering — one dedicated design-AI pass post-wire).
- **npm name finalization** — DEBT-005 § npm name decision pending (`ok.claude` vs `ok-claude`); current artifact uses `ok-claude` per existing brand convention.
- **Sentence clustering** — F7 (own brainstorm pending; UI layout open).
- **Opener prefix filtering** — DEBT-003.
- **UI wording surface review** — DEBT-004 (largely absorbed into mockup copy-locks; residual = "verify mockup copy migrates 1:1 to src/render.ts post-F8 wire").
- **Clitic strip fix** — GAP-014.
- **Brand-center force-placement** — trust `wordcloud2` default + edge-origin seed (decision #11); tune only if `ok` lands off-center post-ship.

## Surface changes (file-by-file)

- **`src/pipeline.ts`**
  - Drop `topN(userMap, TOP_N)` / `topN(claudeMap, TOP_N)` from render-input assignment.
  - Cloud-data source: `topNOpeners(userOpeners, TOP_N)` / `topNOpeners(claudeOpeners, TOP_N)` reshaped to `Array<[surface, count]>` → assign to `topUser` / `topClaude`.
  - `TOP_OPENERS = 10` → `TOP_N` reused (100, full first-word list; wordcloud2 adaptive-drops).
  - Body-token tokenize fold (`tokenize(denoised)` per event into `userMap` / `claudeMap`) stays live per DEBT-006 — output unused by F8 render, retained as restore-bait.
  - Drop `openersUser` / `openersClaude` from render-input. Drop body-token-derived `panelUser` / `panelClaude` (never landed; original spec only).
  - `meta.tokensOut` aggregation unchanged (already summed from `usage.output_tokens`).
- **`src/render.ts`** — full rewrite of the visual layer. Data shape simplifies; structure pivots to mockup.
  - `__DATA__` shape: `{ topUser, topClaude, meta }`. Drop `openersUser` / `openersClaude`. Add nothing else.
  - `RenderInput` type: `topUser` / `topClaude: Array<[string, number]>`; drop `openersUser` / `openersClaude`. `meta` unchanged.
  - Drop `formatSubhead` — header rebuilt as brutal two-line burn-truth (top L-aligned auto-fit, bottom R-aligned).
  - Drop tab system (`#tabs` block + click handler + `setActive`). Both clouds render simultaneously.
  - Drop single `<canvas>` + `paintOpeners` + `<aside id="openers">`. Replace with `.halves` flex container holding `.half.user` + `.half.claude`, each containing a `.side-label` row + `.canvas-wrap` with its own canvas.
  - Add brutal header with `OK. CLAUDE` brand wordmark, accented burn-fact, R-aligned avg-velocity sub-line. Inline-JS `fitHeadlineWidth()` measure-scales top line via two-pass scrollWidth → font-size.
  - Add `originPoint(canvas, side, 'edge')` helper for inner-edge cloud origin seed (decision #11).
  - Add `drawHalf(canvas, words, n, side, opts)` wrapping `WordCloud(canvas, {...})` with: per-side `fillColor` from `ACCENT[side]`, `rotateRatio` from per-side `LOCKED.rotationUser`/`rotationClaude`, `weightFactor` with log shape + `fontMin`→`fontMax` range, `drawOutOfBound: false`.
  - Add `LOCKED` const for ratio/layout/origin/curve/rotation/fontMin/fontMax/gapRatio — hidden from UI (no controls). Mockup retained controls; ship strips them.
  - Add `install-cta` footer (`> npx ok-claude  # confess yours`) inside `#artifact` (not outside) so PNG export captures it.
  - Add `window.resize` re-render + post-`load` double-`requestAnimationFrame` first render (matches mockup).
  - Empty-state copy still source-agnostic — if `topUser` / `topClaude` empty, render canvas-wrap as `<p>` placeholder per side (mirror existing F4 pattern; carry forward).
- **`src/openers.ts`** — no changes. `firstOpener` extraction contract unchanged.
- **`src/aggregate.ts`** — no changes. `topNOpeners` reshape happens in pipeline (`Array<[surface, count]>`), aggregate primitives stay.
- **`src/tokenize.ts`** — no changes. Still feeds body-token fold (now unconsumed by render; per DEBT-006 stays live).
- **`src/denoise.ts`** — no changes.

## Test surface

- `pipeline.test.ts` — update fixture expectations: `topUser` / `topClaude` now carry first-word data (`Array<[string, number]>` shape preserved). Drop assertions on `openersUser` / `openersClaude`.
- `render.test.ts` (if exists) — update DOM assertions: dual canvas (`#canvas-user` + `#canvas-claude`), brutal header structure (`.hl-top` + `.hl-bot` + `.hl-brand` + `.m-accent`), side-labels (`.half.user .side-label` + `.half.claude .side-label`), install-CTA (`.install-cta .cta-cmd`). Drop tab / opener-panel assertions.
- No new test files needed; reusing existing primitives.

## Success criteria

1. `pnpm test` green
2. `pnpm exec tsc --noEmit` green
3. Smoke on real corpus: both canvases render with first-word data; brand pun (`ok` user-side, `Now` Claude-side) dominates; no decoder-ring needed for any visible string.
4. Visual diff against `mockup-f8.html`: artifact layout matches (1:1 ratio, dual horizontal halves, brutal header L/R split, asymmetric rotation, identity colors, install-CTA bottom-right, no strip).
5. Headline auto-fit: top line fills header width without overflow or under-fill regardless of corpus burn-total magnitude (test against 10K-token and 10M-token meta).
6. PNG export (when F5 lands) captures full artifact including install-CTA — verify CTA is inside `#artifact` not outside.
7. CJK-bearing message inputs still extract first-word cleanly (regression-only check — `firstOpener` unchanged).

## On-merge cleanup

- Delete this spec file (`docs/superpowers/specs/2026-05-15-mood-cloud-pivot.md`) per `CLAUDE.md` § Doc Sync temporal cleanup.
- Delete F8 row from `docs/overview.md` § Roadmap per § Doc Sync roadmap cleanup.
- `docs/overview.md` § Module Index updates batch with execute commit: `pipeline.ts` (cloud source = first-word; body-token fold latent per DEBT-006), `render.ts` (full visual rewrite — dual canvas, brutal header, no tabs, no panel, install-CTA).
- `docs/overview.md` § Current State + § Problem already reframed for first-word + 30s-glance; verify still accurate post-wire.
- DEBT-005 locked-invariants table: cross-check rewritten spec matches; strip-related rules (status-line layout, bottom cardpos, hairline rule, lowercase-strip-case, `vocab:` prefix) should already be dropped from DEBT-005 — verify.
- DEBT-006 § F8 spec impact note: verify reality matches ("dual-axis dropped; pipeline body-token path latent").
- Handoff: post-wire commit, hand `src/render.ts` to design-AI session with DEBT-005 locked/tunable table for aesthetic polish pass.

## F7 deferred state (captured for next brainstorm)

Macro direction settled at original brainstorm; preserved here for F7 pickup:

- Sentence-cluster via mechanical hashing (no LLM, no model download — protects § NN#2 zero-install).
- Lean primitive: char n-gram (n=3) MinHash + LSH bucket. Language-agnostic, CJK-clean, robust to typos and segmenter drift. Hand-rollable ~100 LOC, zero deps.
- Lean scope: first-sentence-only (extends F8 first-word axis from word → phrase, tighter signal-to-noise).

Open for F7 brainstorm:

- **UI layout** — replace cloud / replace one half / third surface / co-existence shape. (User flagged exploration needed.)
- Threshold tuning (Jaccard cutoff for cluster bucket).
- All-sentence vs first-sentence-only — final call.
- CJK as first-class design constraint: per-script threshold scaling, particle/stopword equivalents, sentence-boundary primitive (`Intl.Segmenter({granularity:"sentence"})`).
