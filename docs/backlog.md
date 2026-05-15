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

### GAP-014 — clitic strip loses contractions in cloud + openers

**Area:** `src/denoise.ts` — `N_CLITIC` + `CLITIC` regexes (lines 26, 29).

**Symptom:** `let's` → `let`, `don't` → `do`, `we're` → `we`, `it's` → `it`, `I'll` → `I` (then dropped as single-Latin), `won't` → `wo` (then STOPWORDS-killed). Affects both wordcloud and opener panel (same denoise pass before both).

**Why it matters:** Contractions carry mood signal — `let's go`, `don't`, `I'll` are first-person directives that lose their identity in the cloud. Surfaced during F4 opener-frequency ship: opener panel showed `Let` instead of `Let's`.

**Cause:** Strip-whole strategy was a defensive fix to prevent segmenter from emitting fragment tokens (`re`, `ve`, `s`). Trade-off: lossy by design.

**Proposed fix paths:**

1. **Concat (drop apostrophe, keep letters)** — regex `$1` → `$1$2` with capture on `(s|d|m|re|ve|ll)`. `let's` → `lets`, `don't` → `dont`. Collisions: `were` (past-tense vs `we're`), `its` (poss vs `it's`), `ill` (sick vs `I'll`), `id` (ident vs `I'd`). Minor for mechanical-count tool.
2. **Trust segmenter + post-tokenize filter** — drop denoise strip; add filter dropping bare `s`/`re`/`ve`/`ll`/`d`/`m`/`t` after `Intl.Segmenter`. Preserves `let's` whole when ICU keeps it. Risk: ICU behavior drifts across Node versions (the existing strip was the defensive fix).

Pick on next session; needs test pass on both wordcloud + opener surfaces.



