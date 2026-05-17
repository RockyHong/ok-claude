# Pipeline Handoff — Creator / Consumer / Cleaner

`pipeline-state-file-presence.md` answers WHERE pipeline state lives (in files). This file answers WHO touches each artifact and WHEN it leaves the tree.

Every pipeline artifact has three roles. Undefined roles produce orphans — files that linger past their use, mislead future sessions, and corrupt state-from-file-presence reconstruction.

## The three roles

For every artifact a pipeline produces (spec, plan, scope, handoff folder, generated doc, intermediate output):

| Role | Responsibility |
|---|---|
| **Creator** | Writes the artifact. Owns initial content + structure. |
| **Consumer** | Reads the artifact to produce the next stage's work. May be multiple consumers. |
| **Cleaner** | Removes the artifact once consumed. Often the final consumer; sometimes a downstream gate. |

If any of the three is undefined for a new artifact type, the pipeline is incomplete by design. Define before introducing.

## Test

> "For this artifact, can I name the creator, the consumer(s), and the cleaner — and the exact event that triggers each transition?"

- All three named with concrete triggers → safe to introduce.
- Any unnamed → orphan risk. Resolve before adding.

## Verify before cleanup

Align output with input before deleting handoff artifacts. Deletion makes deviations invisible — if specs and implementation diverged during build, deleting the handoff folder erases the audit trail.

Sequence:

1. Merge / accept the downstream artifact.
2. Cross-check upstream artifact for deviations (`§ Observations`, deferred items, scope expansions).
3. Patch upstream to reflect reality, or record the deviation explicitly.
4. Then delete.

Skipping step 2-3 = silent drift that surfaces sessions later as "why doesn't the spec match the code?"

## Failure modes

- New artifact type added, cleaner role left implicit → folder fills with stale entries; future sessions can't tell what's live vs abandoned.
- Cleaner role assigned to a stage that may be skipped (e.g. "deleted on merge" + work merged via bypass) → artifact survives. Cleanup must trigger on a guaranteed event, not a conditional one.
- Consumer role spans many stages without an explicit "last consumer" → no one knows when cleanup is safe. Name the terminal consumer.
- Cleanup happens before verify → divergence between upstream + downstream goes unrecorded.

## Boundary

Applies to: any multi-stage workflow producing intermediate artifacts (specs, plans, handoff folders, generated outputs).

Pairs with: `pipeline-state-file-presence.md` (state lives in files) — handoff covers ownership of those files. Pairs with `pipeline-escape-hatches.md` (bypass criteria) — different firing moment, same pipeline.

Does not prescribe: artifact naming, folder layout, stage count — repo-shaped (Tier 2).
