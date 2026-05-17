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

### GAP-016 — CJK font fallback inconsistent across OS; PNG bakes per-machine face

**Area:** `src/render.ts` — `INTER_STACK = '"Inter", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif'`. Cloud canvas font stack has no CJK family.

**Symptom:** Inter ships Latin only. Browser falls through stack to `system-ui` for CJK glyphs:
- macOS → PingFang SC/TC
- Windows → Microsoft YaHei / Yu Gothic
- Linux → Noto Sans CJK if installed, else tofu (□□□)

PNG export (`html-to-image`) rasterizes whatever the user's machine rendered → screenshots inconsistent across share network. Two devs with CJK sessions get visually different artifacts. Linux without Noto = unreadable tofu PNG.

**Why it matters:** Silent §NN#3 (self-contained) violation for CJK users. Brand consistency on social share = degraded — same `npx ok-claude` command produces different-looking PNGs depending on OS. The pun/meme energy depends on visual consistency.

**Why deferred:**

Ship math hostile. Real fixes either bust artifact size budget or re-break §NN#3:

1. **Embed Noto Sans CJK** — even subset is ~10MB+ (CJK char count ~20k unicode block). Kills artifact size budget; HTML balloons past download-friendly. Latin subset is ~200KB; CJK is 50× that.
2. **Runtime-subset on observed CJK chars** — extract CJK chars from user data → fetch subset from CDN at render time. Breaks §NN#3 (online dep returns); also adds offline-fail path.
3. **Detect CJK presence; conditionally fetch** — same online dep problem; conditional logic adds complexity.
4. **Ship single font weight, single script** — pick CJK locale (Japanese OR Simplified Chinese OR Traditional Chinese, not all) → still ~3-5MB per locale. Hostile to CJK-mixed sessions.
5. **Accept OS fallback, document as known gap** — current behavior. Brand inconsistency for CJK users; functional for macOS/Windows; tofu risk on Linux.

**Pick on signal:** revisit when a CJK user files actual complaint about visual inconsistency or tofu. Until then, path 5 (accept). Most Claude Code users on macOS/Windows get readable CJK; Linux tofu is rare edge.

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

### DEBT-003 — opener prefix leakage (list markers, role labels, single-letter Latin)

**Area:** `src/openers.ts` — `firstOpener()` takes first wordlike segment unfiltered.

**Symptom:** A/B sample (`ok-claude-firstword.html`, 441 sessions) shows polluted user openers: `1` (92), `A` (66), `B` (34) from numbered/lettered list items (`"1. fix this"` / `"A) approve"`); `Request` (43) from copy-pasted issue/PR templates with `Request:` prefix; `i` (75) from sentence-initial single-letter Latin (currently slips because opener path doesn't apply `tokenize.ts` `SHORT_LATIN_KEEP` rule). All survive into wordcloud + panel after F8 ships.

**Why it matters:** F8 ships first-word as cloud source. These artifacts will dominate the visible surface alongside real openers — degrades meme punch (`A` and `B` aren't tics, they're paste residue). Strict mechanical-count framing (§ Non-Negotiable #5) doesn't excuse ingesting copy-paste structure as user voice.

**Proposed fix paths (independent, can ship piecemeal):**

1. ~~**List-marker strip**~~ — shipped. `LIST_MARKER` regex in `src/openers.ts` strips `^\s*(\d+|[A-Za-z])[.):]\s+` once before scan.
2. **Role-label whitelist** — if first wordlike segment matches `/^(Request|Response|User|Assistant|System|Prompt|Reply)$/i` followed immediately by `:`, skip and take next wordlike. Conservative — only known label words, prevents false positives.
3. **Single-letter Latin drop** — opener key check applies `SHORT_LATIN_KEEP` (`y`/`n`/`k` admit) mirroring `tokenize.ts`. Drops `i`/`a`/etc. from openers.

Each is a clear rule with a unit-test fixture. Mechanical, no LLM. Remaining order: ship 2, then 3.

