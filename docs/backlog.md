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

### DEBT-002 — phantom Windows-path dirs at repo root

- **Area:** repo root (`D:Gitok-claudescripts/`, `D:Gitok-claudetmp/`)
- **Why it matters:** accidental Windows backtick-line-continuation artifacts — a `cd D:\Git\ok-claude\scripts\` or similar mis-quoted command created dirs literally named after the joined path. Not tracked by .gitignore patterns; harmless but clutters `ls` and would land in any future `git add -A`.
- **Proposed fix:** verify both dirs are empty (or contain nothing irrecoverable), then `rmdir` (or `Remove-Item -Recurse` if non-empty after inspection). Cross-check the source command — likely PowerShell session that ran `cd D:\Git\ok-claude\scripts` with backslashes that got swallowed.
- **Surfaced during:** super-bootstrap re-run scan (2026-05-15).

### DEBT-001 — roadmap split across overview.md and backlog.md

- **Area:** `docs/overview.md` § Roadmap (just scaffolded, empty) + `docs/backlog.md` § Roadmap (F1-F7 table).
- **Why it matters:** per super-bootstrap template, forward feature list is single-pillar in `docs/overview.md` § Roadmap — `/super-bootstrap:todo` reads that section for next-pickup. Current F1-F7 table lives in `docs/backlog.md`, which is supposed to scope to BUG/DEBT/GAP only. Two-location split means todo-scanner can't find the forward list and product narrative is incomplete in overview.md.
- **Proposed fix:** move the F1-F7 table from `docs/backlog.md` § Roadmap to `docs/overview.md` § Roadmap (one-paragraph blurb + table). Delete `## Roadmap` heading + table from backlog.md. Shipped features (F1-F3) — drop their rows, they now belong to product narrative (overview.md § Module Index already documents them). Keep F4-F7 in the new location as forward queue.
- **Surfaced during:** super-bootstrap re-run sync (2026-05-15) — overview.md scaffolded empty Roadmap section but backlog.md kept legacy roadmap table.

### BUG-004 — `n't` clitic strip leaves `don`/`won`/`isn`/etc. fragments

- **Area:** `src/denoise.ts` (CLITIC regex)
- **Why it matters:** current pattern `/(\p{L})['ʼ'](?:s|t|d|m|re|ve|ll)\b/giu` matches `n't` cluster as `t` only — strips apostrophe + `t`, leaves bare `n` attached to root. `don't → don`, `won't → won`, `can't → can`, `isn't → isn`, etc. In post-GAP-009 user audit: `don` count=141 rank #72 — that's fragment-noise sitting in vocab.
- **Affected fragments observed/expected:** `don`, `won`, `can`, `isn`, `wasn`, `wouldn`, `couldn`, `shouldn`, `didn`, `doesn`, `aren`, `weren`.
- **Proposed fix:** separate N_CLITIC pattern that strips entire `n` + apostrophe + `t` cluster, run BEFORE the general CLITIC pattern (which stops handling `t`):

  ```ts
  const N_CLITIC = /(\p{L})n['ʼ']t\b/giu;            // don't → do
  const CLITIC   = /(\p{L})['ʼ'](?:s|d|m|re|ve|ll)\b/giu;  // we're → we (no t)
  ```

  Most outputs land in existing STOPWORDS (`do`/`is`/`was`/`would`/`could`/`should`/`did`/`does`/`are`/`were`) → drop cleanly. Two 2-char survivors need stopword adds: `wo` (won't), `ca` (can't).
- **Surfaced during:** GAP-009 wrap-up wet-run review (audit showed `don` in top-100 user vocab).
- **TDD shape:** 6+ new tests under denoise.test.ts → don't/won't/can't/isn't/wasn't/wouldn't → expected post-denoise text.

### GAP-011 — Unity-native stack frame variant `(Unity) StackWalker::` not matched

- **Area:** `src/denoise.ts` (MONO_JIT_FRAME regex)
- **Why it matters:** GAP-009 D2 added `MONO_JIT_FRAME = /^0x[0-9a-fA-F]+\s+\(Mono/` to catch Unity Mono JIT native frames. But Unity also emits non-Mono native frames: `0x00007ff7ccba9e7d (Unity) StackWalker::GetCurrentCallstack`, `0x... (UnityEditor) ...`, `0x... (UnityEngine) ...`. These survive denoise and feed `unity` count.
- **Proposed fix:** extend the regex to a list of engine-frame markers:

  ```ts
  const NATIVE_JIT_FRAME = /^0x[0-9a-fA-F]+\s+\((?:Mono|Unity|UnityEditor|UnityEngine|UnityPlayer)\b/;
  ```

  Rename `MONO_JIT_FRAME` → `NATIVE_JIT_FRAME` while at it. Could probably go further with a broader `0x[hex]+ \(\w+\)` form if real-data scan justifies — re-grep before widening.
- **Surfaced during:** GAP-009 wrap-up grep-raw of `unity`.
- **TDD shape:** 2-3 new fixtures under denoise.test.ts; verify `unity` count drops post-fix.

### GAP-012 — vocab contracts vs corpus-reality recalibration

- **Area:** none directly — concept-level. May surface as edits to `scripts/vocab-contracts.ts` (gitignored, local) or a new lighter-weight follow-up audit.
- **Why it matters:** GAP-009 § C contracts encoded user self-report ("I NEVER say X / RARELY say Y / SAY Z A LOT"). Wet-run snapshots revealed self-report doesn't match corpus:
  - NEVER class (post-GAP-009 snapshot): 7 of 9 tokens (mono/null/program/gradle/android/object/src) surfaced at counts 91–266. Post-GAP-010 wet-run: mono/null/program/gradle/android/src all ABSENT from top-100 — paste-leak hypothesis confirmed. `object` not re-verified; GAP-011 still pending for any residual Unity-native engine-frame leakage.
  - RARELY class: `then` rank-shifted from #51 → #44 (count unchanged) — it's a real English connective the user uses. Contract claim that `then` is rare was always wrong.
  - FREQUENT class: `wth` count=30, `soc` count=83 across 312MB. Memes are intrinsically rare; contract premise "must hit top-100" was aspirational. Dropped during GAP-009 per session decision.
- **Proposed fix (when revisited):** re-survey the user on actual typing patterns AFTER GAP-011 lands — at that point residual counts reflect real prose, not paste leaks. Adjust contract thresholds or drop tokens that conflict with reality. Possibly stop encoding self-report at all; eyeball wordcloud output (`ok-claude-output.html`) as the success metric.
- **Surfaced during:** GAP-009 wrap-up.

