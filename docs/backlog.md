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

### DEBT-004 — UI wording surface review (full pass, not per-feature)

**Area:** `src/render.ts` — header `<h1>`, subhead copy (`formatSubhead`), tab labels (`You` / `Claude`), side-panel `<h2>`, footer copy, empty-state strings (`No words from You yet.` etc.).

**Symptom:** Copy was authored incrementally per feature (F1 header, F2 tab split, F3 subhead with token totals, F4 panel header `Openers`). No single pass has read the surface as one voice. Risk: tonal drift, stale framings (e.g. F4 `Openers` label survives even after F8 swaps panel source), pun under-leveraged, glance-tool framing not reinforced.

**Why it matters:** Output is a one-shot share artifact — the entire visible string surface lives in `render.ts` and gets screenshotted. Every word is on the meme. Per-feature copy edits inside other PRs are noise (conflate scope, hide tonal decisions); they belong in a dedicated surface review.

**Proposed fix:** One session reads every user-visible string in `render.ts` end-to-end, drafts unified voice (glance + pun + self-roast, per `docs/overview.md` § Name + § Non-Negotiable #7), reviews against current product framing, ships single copy-only commit. No code-shape changes. Run after F8 lands so panel-label question is resolved.

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



