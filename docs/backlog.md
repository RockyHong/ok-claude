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

### GAP-015 — Google Fonts external dependency in tabloid lock breaks § NN#3 self-contained intent

**Area:** `src/render.ts` head — `<link href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Narrow&family=Inter&family=JetBrains+Mono...">`. Required by DEBT-005 tabloid lock (UI tier = Anton headline + Archivo Narrow body + JetBrains Mono CTA; Cloud tier = Inter 800 workhorse).

**Symptom:** Output HTML pulls four font families from `fonts.googleapis.com` at render time. Violates § Non-Negotiable #3 ("One shot, one file. Run → single self-contained HTML auto-opens"). Offline render falls back to system fonts (Archivo Narrow / Anton / Inter / JetBrains Mono all absent on stock Win/Mac/Linux installs without browser font cache) → degraded look (system-ui everywhere, no display face, no monospace personality, headline auto-fit math thrown by different metrics).

**Why it matters:** Self-contained = the share-loop primitive. User runs `npx ok-claude` on plane / VPN-blocked corp net / behind firewall → opens rendered HTML → sees system-font fallback → loses tabloid grammar. Compounds for F5 PNG export: `html-to-image` snapshot before fonts download = wrong metrics baked into PNG (already mitigated by `whenFontsReady()` boot gate, but only if fonts EVER load).

**Proposed fix paths:**

1. **Inline base64 woff2 in CSS** — embed all 4 family weights as `@font-face { src: url('data:font/woff2;base64,...') }`. ~150-300 KB per font × 4 = adds ~600 KB-1.2 MB to output HTML. True self-containment. Bundle step needs woff2 source tree + base64 encode at build time. Hits tsup build pipeline.
2. **Subset fonts to ASCII + common symbols** — base64 subset reduces per-font weight ~80%. ~30-60 KB × 4 = ~150-250 KB total addition. Use `glyphhanger` or `fonttools subset` at build time. Tradeoff: locks character set; CJK breaks (only relevant for Cloud tier — Latin-only fonts; CJK in cloud falls back to system CJK which is fine).
3. **Drop Google Fonts; use system-stack only** — abandon Anton (`'Impact', 'Haettenschweiler', 'Franklin Gothic Bold', sans-serif`-ish stack), Archivo Narrow (`'Arial Narrow', sans-serif`), Inter (`system-ui, -apple-system, ...`), JetBrains Mono (`ui-monospace, ...`). Loses tabloid display-face personality but eliminates dep. Reframes design lock.
4. **Ship as-is; accept online dep** — document the trade-off, add `<noscript>` fallback note, move on. Pragmatic; matches "npm distribution" reality (user already needs `npx` = network).

Pick on next session; decision likely influenced by F5 (`png-export`) timing — PNG export is canonical artifact; PNG fonts get baked at render time so online-fetch latency = export latency, OR PNG ships system-fallback if fonts hadn't loaded.

### DEBT-007 — npm package name decision (`ok-claude` vs `ok.claude`) pending before F6 publish

**Area:** `package.json` `name` field; brand wordmark in `src/render.ts` (`OK. CLAUDE` period-bound display); footer CTA copy (`npx ok-claude`); README install instructions; npm registry occupation.

**Symptom:** Brand wordmark uses period (`OK. CLAUDE` — tabloid grammar locked DEBT-005-era). npm bin / install command uses hyphen (`npx ok-claude`). Both `ok.claude` and `ok-claude` 404 on registry (verified during F8 iteration). Pre-publish, no name committed.

**Why it matters:** Ships at F6 (`npm-publish` in roadmap) — wrong call now = rename pain post-publish + broken share-loop links if early adopters install one and tool publishes as other.

**Options:**
1. **`ok-claude` only** (hyphen convention) — wordmark stays `OK. CLAUDE` for visual punch but install is `npx ok-claude`. Minor visual-to-install translation cost for viewer-to-installer. Most npm-idiomatic.
2. **`ok.claude` primary + `ok-claude` shim** — claim both. Primary = period-matching wordmark (zero-translation viewer→install). Shim package redirects. Doubles maintenance + registry footprint; npm allows periods in names.
3. **`ok-claude` only + drop period from wordmark** — `OK CLAUDE` instead of `OK. CLAUDE`. Loses period-as-tic (the brand pun's literal mechanical-comma — `ok claude, go` becomes `OK CLAUDE`, drops the prosody hit).

Resolve before F6 publish kickoff. Likely (1) — period stays visual, install stays hyphen, viewers manage.

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



