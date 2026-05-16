# Backlog

Single tracker for deferred items — things found but not fixing now. Solo-dev queue. Scanned by doc sync at commit. When picking up new work, scan related items here to bundle.

**Three categories** distinguished by ID prefix:

- **`BUG-###`** — broken behavior. Surface symptom may hide deeper cause.
- **`DEBT-###`** — working but rotting (test fixture rot, stale dep, cleanup owed).
- **`GAP-###`** — design gap, never properly specced.

No phase prescription per category — when an item rolls into a session, the harness phase-gate triage decides which superpowers phases run. Surface "clear fix" can become design work after evidence; pre-routing biases that judgment.

Format per item: stable ID, short title, affected area, why it matters, proposed fix or what's missing. Newest at top. When resolved, **delete the item** — git history is the archive.

---

## Open

### DEBT-006 — body-token strip path dropped from F8 UX (functional code still live; clean-up vs keep-latent decision pending)

**Area:** `src/pipeline.ts` body-token tokenize-and-fold + per-side body-token `topN` call; `src/render.ts` panel slot + `paintPanel` (whatever F8 wire names it); `src/tokenize.ts` body-token consumer paths.

**Symptom:** F8 mockup iteration dropped the bottom-strip "vocab" surface (per first-principle audit against `docs/overview.md` §Problem 30s-glance / §NN#7 meme-energy / §NN#6 two-axis spirit — strip failed every test, generic dev vocab `need / run / repo / skill` not unique-to-you punch). Cloud-only artifact ships. But pipeline still tokenizes body content + computes per-side top-N body-token frequencies that no surface consumes. Dead-data path post-F8 wire.

**Why it matters:** Code that exists but isn't rendered = rot risk — slow drift, future contributor confusion ("why is body-token tokenize here?"), tiny per-event perf cost (fold against frequency Map for every token). Counter-argument for keeping latent: if §Problem ever re-frames toward analytical/reflection, or a new surface (different visual treatment, header sub-stat, etc) uses body-token freq, the data path is already there.

**Decision deferred — monitor post-publish for restore signal:**
- If any user begs for vocab list / "what words did I use most" within 2 release cycles → restore strip OR design alt surface using existing data path
- If no demand → clean up (delete dead body-token tokenize/fold/topN paths, simplify pipeline to first-word-only)

**If cleaning up later:**
- Drop body-token tokenize fold from `pipeline.ts` (keep `firstOpener` fold only)
- Drop `topN(userTokens, ...)` + `topN(claudeTokens, ...)` calls
- Drop `panelUser` / `panelClaude` (or equivalent F8-wire names) from render-input shape
- Drop `paintPanel` from `render.ts` if rendered
- Verify `tokenize.ts` still needed (likely yes — `firstOpener` may depend on segmenter setup); audit imports
- Update F8 spec + DEBT-005 locked table to reflect single-axis ship
- Drop DATA.bodytokenUser / DATA.bodytokenClaude from `mockup-f8.html` if mockup still around

**Mockup reference:** Drop happened in `mockup-f8.html`. Strip HTML/CSS/JS removed; `DATA.bodytokenUser` / `DATA.bodytokenClaude` arrays retained as restore-bait for fast A/B if vocab axis returns.

**F8 spec impact:** Spec rewritten 2026-05-16 — `docs/superpowers/specs/2026-05-15-mood-cloud-pivot.md` now ships single-axis cloud-only artifact (decision #12 = strip dropped). Pipeline body-token tokenize/fold/topN stays live as restore-bait per this debt; render no longer consumes it.

**DEBT-005 impact:** Locks table shrinks (strip-related rules vanish: status-line layout, bottom cardpos, hairline rule, lowercase-strip-case, `vocab:` prefix). Update during F8 wire.

### DEBT-005 — visual UI systematic pass + remake context

**Area:** `src/render.ts` visual layer (F8-shipped structure: dual canvas wordcloud, fixed 1:1 share image, brutal headline header, asymmetric side-labels, install-CTA footer, white/amber identity pair). Copy already locked (mockup migrated 1:1 in F8 wire); this debt is aesthetic-polish only.

**Symptom:** F8 mockup iteration locked structural UX + copy (see Locked table). Visual polish flagged for systematic design-pass. Specifically: dim-hierarchy not unified across header / strip / labels (ad-hoc gray values `#5b6168` / `#7a838c` / `#8a939b`). Uppercase usage inconsistent — wordmark + headline uppercase, strip + labels lowercase, no systematic rule for shout-vs-whisper. Color emphasis placement ad-hoc (white-bold for numbers, amber for identity, gray for scaffold; no rule for where each applies). Padding rhythms set per-section without consistency pass. Edge-case visual breakage uncharted: lopsided user/claude corpus, single-letter openers (`i` / `A`) inflating cloud, very-few-openers underfilling halves.

**Why it matters:** Output is a one-shot share image. Visual coherence IS the meme — inconsistent hierarchy reads as amateur, breaks share-loop punch. Per-feature pixel-tweaks conflate scope; systematic rules need one dedicated session.

**Proposed fix:** One session reads rendered output on 3+ corpus shapes (small / typical / extreme), reference share platforms (Twitter/X, LinkedIn, Discord). Defines systematic rules for: dim hierarchy (3-tier gray ladder w/ explicit hex map), uppercase usage policy (when shout / when whisper), color emphasis placement (identity vs scaffold vs accent), padding rhythm across sections, edge-case rendering. Ships single visual-only commit. No data-shape, no copy changes. Run after F8 ships.

**Context for AI doing the remake — F8 mockup-locked invariants:**

| Locked (don't break) | Tunable (design-pass scope) |
| --- | --- |
| 1:1 square ratio output (universal share-platform fit per § NN#3 one-shot) | Dim-gray hierarchy — currently 3 ad-hoc values; needs systematic ladder |
| Dual horizontal halves: left=you, right=Claude (per § NN#6 two-axis) | Uppercase usage policy — needs systematic shout/whisper rules |
| Data shape: `topUser` / `topClaude` = `Array<[surface, count]>` first-word entries (body-token tokenize/fold path latent per DEBT-006 — no `panelUser` / `panelClaude` keys) | Color emphasis placement system (where white-bold vs amber-identity vs gray-scaffold) |
| `firstOpener()` extraction contract (see F8 spec + `src/openers.ts`) | Sub-line typography distinctness (currently uppercase-tracked, may rework) |
| § Non-Negotiable #3 one shot, one file — single self-contained HTML | Padding rhythm across header / strip / side-label / footer sections |
| `paintXxx` functions `textContent`-set (XSS-safe) — preserve | Visual weight balance under lopsided corpus (user tiny / claude huge or reverse) |
| `wordcloud2` vendored at `src/vendor/wordcloud2.js` (REVERSED earlier "drop it" lean — needed for spiral + origin seed) | Edge-case rendering: single-char openers blowing up, very-few-opener underfill, lopsided sides |
| Brand wordmark display: `OK. CLAUDE` (period-bound, single inline unit) | Exact accent hex (`#d97757` Claude amber — locked as Claude brand, but placement rules tunable) |
| Footer install-CTA: bottom-right `▸ npx ok-claude`, monospace micro-text, travels w/ PNG export | |
| Identity color pair: white=user, amber `#d97757`=Claude. Identity colors live on side-labels + per-side card-word colors. NOT on emphasis (emphasis uses white-bold) | |
| Token source: `usage.input_tokens` + `usage.output_tokens` from cc session log (parse.ts:105-110) — NOT internal tokenizer. Cache tokens (`cache_creation_input` / `cache_read_input`) NOT summed; only relevant if total-burn pivots include input-side accounting | |
| Burn-display: output-tokens-only ("burn-brag" cultural trend) — drop input-token display | |
| Cloud render: no alpha (font size carries weight signal); font range 6→500px; gap = 3× fontMin; adaptive N via wordcloud2 `drawOutOfBound: false` | |
| Rotation: user=25% chaos, claude=0% order (asymmetric pun) | |
| Side-label flow position: own row above canvas (NOT absolute overlay), mirror align (user-left / claude-right) | |
| Side-label copy: user `This is what you dump across [N] messages:` (L-align, white@0.7) / claude `And this is what claude response:` (R-align, amber@0.85). Lowercase. Attack-then-react cadence | |
| Header: 2-line burn-truth structure. Top: brand + burn-fact, L-aligned, auto-fits header width via JS measure-scale. Bottom: avg-velocity, R-aligned. Sentence pattern: `OK. CLAUDE — [10.3M tokens] burned in [30 days].` / `avg [343K tokens/day].` with white-bold accent on numbers, gray scaffold on verbs/connectives | |

**Mockup reference:** `mockup-f8.html` (repo root, committed) — live UX playground. Structural + copy decisions locked here; aesthetic flagged to this debt.

**npm name decision pending:** Both `ok.claude` and `ok-claude` 404 on registry (verified during F8 iteration). Current footer/docs use hyphen convention; brand wordmark uses period. Decision pending: ship `ok-claude` only (hyphen-convention) vs claim both with `ok.claude` primary + `ok-claude` shim (zero-translation viewer→install). Resolve before publish — log as separate item if not handled in F8 wire.

**Update trigger:** as F8 mockup iteration locks more decisions, promote them above. Living context until DEBT-005 itself ships.

### DEBT-003 — opener prefix leakage (list markers, role labels, single-letter Latin)

**Area:** `src/openers.ts` — `firstOpener()` takes first wordlike segment unfiltered.

**Symptom:** A/B sample (`ok-claude-firstword.html`, 441 sessions) shows polluted user openers: `1` (92), `A` (66), `B` (34) from numbered/lettered list items (`"1. fix this"` / `"A) approve"`); `Request` (43) from copy-pasted issue/PR templates with `Request:` prefix; `i` (75) from sentence-initial single-letter Latin (currently slips because opener path doesn't apply `tokenize.ts` `SHORT_LATIN_KEEP` rule). All survive into wordcloud + panel after F8 ships.

**Why it matters:** F8 ships first-word as cloud source. These artifacts will dominate the visible surface alongside real openers — degrades meme punch (`A` and `B` aren't tics, they're paste residue). Strict mechanical-count framing (§ Non-Negotiable #5) doesn't excuse ingesting copy-paste structure as user voice.

**Proposed fix paths (independent, can ship piecemeal):**

1. **List-marker strip** — before opener scan, strip leading `^\s*(\d+|[A-Za-z])[.):]\s+` once. Conservative: only matches list-item shape (digit/letter + `.`/`)`/`:` + whitespace). Kills `1`/`A`/`B` from list openers; preserves `1` if it's the actual word ("1 thing missing").
2. **Role-label whitelist** — if first wordlike segment matches `/^(Request|Response|User|Assistant|System|Prompt|Reply)$/i` followed immediately by `:`, skip and take next wordlike. Conservative — only known label words, prevents false positives.
3. **Single-letter Latin drop** — opener key check applies `SHORT_LATIN_KEEP` (`y`/`n`/`k` admit) mirroring `tokenize.ts`. Drops `i`/`a`/etc. from openers.

Each is a clear rule with a unit-test fixture. Mechanical, no LLM. Order: ship 1 first (highest-volume noise), then 2, then 3. Defer until after F8 baseline ships so we can measure delta against real cloud.

### GAP-014 — clitic strip loses contractions in cloud + openers

**Area:** `src/denoise.ts` — `N_CLITIC` + `CLITIC` regexes (lines 26, 29).

**Symptom:** `let's` → `let`, `don't` → `do`, `we're` → `we`, `it's` → `it`, `I'll` → `I` (then dropped as single-Latin), `won't` → `wo` (then STOPWORDS-killed). Affects both wordcloud and opener panel (same denoise pass before both).

**Why it matters:** Contractions carry mood signal — `let's go`, `don't`, `I'll` are first-person directives that lose their identity in the cloud. Surfaced during F4 opener-frequency ship: opener panel showed `Let` instead of `Let's`.

**Cause:** Strip-whole strategy was a defensive fix to prevent segmenter from emitting fragment tokens (`re`, `ve`, `s`). Trade-off: lossy by design.

**Proposed fix paths:**

1. **Concat (drop apostrophe, keep letters)** — regex `$1` → `$1$2` with capture on `(s|d|m|re|ve|ll)`. `let's` → `lets`, `don't` → `dont`. Collisions: `were` (past-tense vs `we're`), `its` (poss vs `it's`), `ill` (sick vs `I'll`), `id` (ident vs `I'd`). Minor for mechanical-count tool.
2. **Trust segmenter + post-tokenize filter** — drop denoise strip; add filter dropping bare `s`/`re`/`ve`/`ll`/`d`/`m`/`t` after `Intl.Segmenter`. Preserves `let's` whole when ICU keeps it. Risk: ICU behavior drifts across Node versions (the existing strip was the defensive fix).

Pick on next session; needs test pass on both wordcloud + opener surfaces.



