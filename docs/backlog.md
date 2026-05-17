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

### GAP-016 — CJK font fallback: Linux-bare-tofu remains; per-OS face still bakes into PNG

**Area:** `src/render.ts` — `INTER_STACK` cloud canvas font stack.

**Current state (path 5+ landed):** stack now appends explicit CJK family names — `PingFang TC/SC`, `Hiragino Sans`, `Microsoft JhengHei/YaHei`, `Yu Gothic`, `Meiryo`, `Noto Sans CJK TC/JP` — before generic `system-ui`. Mac/Windows + Linux-with-Noto = readable CJK glyphs. Pinned in `render.test.ts § CJK content + font stack`.

**Residual gaps:**

1. **Linux-bare tofu** — distro without any Noto CJK installed still renders □□□. Rare edge (CJK typer typically has a CJK font installed).
2. **Per-OS face still bakes into PNG** — Mac PingFang vs Win JhengHei vs Linux Noto = three visually different shared PNGs from the same `npx ok-claude` run. Brand inconsistency on share network persists; only fully fixed by embedding a CJK family.

**Why still deferred:** embed paths (Noto subset ~10MB+ per locale, online subset breaks §NN#3) remain ship-math-hostile. Path 5+ closes the readability gap on 95% of installs at zero artifact cost — the meme-energy threshold.

**Pick on signal:** revisit only on actual CJK-user complaint about (a) Linux tofu in PNG or (b) cross-OS visual mismatch hurting share.

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

