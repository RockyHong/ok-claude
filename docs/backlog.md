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

### GAP-012 — vocab contracts vs corpus-reality recalibration

- **Area:** none directly — concept-level. May surface as edits to `scripts/vocab-contracts.ts` (gitignored, local) or a new lighter-weight follow-up audit.
- **Why it matters:** GAP-009 § C contracts encoded user self-report ("I NEVER say X / RARELY say Y / SAY Z A LOT"). Wet-run snapshots revealed self-report doesn't match corpus:
  - NEVER class (post-GAP-009 snapshot): 7 of 9 tokens (mono/null/program/gradle/android/object/src) surfaced at counts 91–266. Post-GAP-010 wet-run: mono/null/program/gradle/android/src all ABSENT from top-100 — paste-leak hypothesis confirmed. `object` not re-verified; GAP-011 still pending for any residual Unity-native engine-frame leakage.
  - RARELY class: `then` rank-shifted from #51 → #44 (count unchanged) — it's a real English connective the user uses. Contract claim that `then` is rare was always wrong.
  - FREQUENT class: `wth` count=30, `soc` count=83 across 312MB. Memes are intrinsically rare; contract premise "must hit top-100" was aspirational. Dropped during GAP-009 per session decision.
- **Proposed fix (when revisited):** re-survey the user on actual typing patterns AFTER GAP-011 lands — at that point residual counts reflect real prose, not paste leaks. Adjust contract thresholds or drop tokens that conflict with reality. Possibly stop encoding self-report at all; eyeball wordcloud output (`ok-claude-output.html`) as the success metric.
- **Surfaced during:** GAP-009 wrap-up.

