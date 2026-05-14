# Doc Impact Mirror

Every work-scope artifact (plan, scope, spec — whatever the pipeline names them) lists adjacent docs that may need updates from this work. Implementer updates each listed doc in the same change, or explicitly records "none — confirmed unchanged after read." Verification stage gates before merge.

Anti-drift discipline at change-time. Specs + code + reference docs evolve in parallel; without mirroring, they desync silently.

## What the section captures

For each adjacent doc that could be affected:

- Its path.
- One-line note: what might be stale, what to verify.
- Outcome after the work: "updated" / "confirmed unchanged" / "deferred — tracked in X".

## Test

> "If I changed behavior described elsewhere, did I read those docs and either update them or confirm they're still accurate?"

- All yes → safe to merge.
- Any "haven't looked" → not session-safe. Read first.

## Failure modes

- Doc Impact omitted "because nothing relevant changed" → next session can't tell whether scan happened or got skipped.
- Doc Impact lists adjacent docs but no outcome marker → reader doesn't know whether they were checked.
- Implementer touches an unlisted doc → discovers after merge that the listed-doc list was incomplete. Update the convention, not just the doc.

## Boundary

Applies to: any project with parallel doc + code evolution where multiple files describe the same behavior.

Does not prescribe: which docs are "adjacent" (repo doc tree decides), which artifact type carries the Doc Impact section (scope/plan/RFC/ticket body — pipeline's call), how verification gates (pre-commit hook, manual checklist, CI lint).

Upstream discipline: `single-source-of-truth.md` (eliminate duplication at design-time). Doc Impact mirror handles drift that SSoT can't dedupe.
