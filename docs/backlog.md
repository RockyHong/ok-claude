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

### GAP-017 — opener-only cloud buries mid-message tics (perceived missing words)

**Area:** `src/openers.ts` (current first-word semantics) ↔ `src/pipeline.ts` (only opener fold drives cloud) ↔ NN-#7 meme-energy test.

**Symptom:** User self-perception "I say wth a lot" → in real corpus, `wth` has **61 any-position hits but only 15 as opener** (rank 39 of 600). Cloud surfaces it tiny, user reads it as missing. Same pattern likely for any signature word that fires *mid-message*: "wtf", "actually", "literally", etc.

**Why it matters:** Meme-energy metric is "does the screenshot make scroller laugh in self-recognition?" If the runner's actual catchphrases get buried because they typically appear after an `ok` / `wait` opener, the cloud tells a less-funny truth than the runner perceives. Hurts share funnel — runner's reaction to own output is the spark.

**Tension with current design:** Opener-only is **not** an oversight — it's deliberate. Brand pun `OK Claude` only lands if `ok` is the giant word (NN-#1 / NN-#7 anchor). Switching to any-position tokens would flood the cloud with `the` / `it` / generic prose and dilute the punch.

**Decision deferred — evaluate after F7 (`sentence-frequency` / opener bigram) ships:**
- If bigram surface ("wth ," / "wth why") raises tic-words back into cloud naturally → no action needed
- If bigram cloud still misses them → consider third-tab "signature words" surface using any-position counts with aggressive stopword filter
- If neither works → accept loss; opener cloud is the brand, can't dilute

**Evidence to re-check on revisit:** Re-run opener-rank spike against a non-harness-biased user's logs to confirm tic-word buried pattern generalizes beyond solo dogfood corpus.

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

