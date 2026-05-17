# Pipeline Escape Hatches

Lightweight bypass paths for small changes are legitimate — not every change needs the full pipeline. Criteria for "small" must be mechanical, not interpretive, or efficiency bias erodes the pipeline at the first pressure event.

## Adopted rule

**Bypass gates are mechanical (countable, checkable without judgment), not interpretive.**

Pattern:

```
Skip full pipeline only if ALL true:
  (a) ≤ N spec sections touched
  (b) ≤ M files changed
  (c) no cross-package / cross-boundary impact
  (d) no new public surface (endpoint, component, exported API)
```

Each condition checkable without taste. Either the count is under N or it isn't. Either a boundary is crossed or it isn't.

## Test

> "Can the bypass decision be made by a script — no human taste required?"

- Yes → mechanical gate, sound.
- No → judgment gate, will collapse under pressure.

## Failure modes

- Criteria written as guidelines ("usually small means...") instead of mechanical gates → first pressure event collapses discipline.
- ALL-true list relaxed to ANY-true under deadline ("just this one") → bypass becomes the default, full pipeline atrophies.
- Mechanical gate added without escalation when it fails → contributor hits the wall, abandons the change or bypasses silently. Pair every gate with a "if denied, route to X" path.

## Boundary

Applies to: any pipeline with a lightweight-path option.

Pairs with: `pipeline-handoff.md` (ownership of artifacts the pipeline produces) — different firing moment (bypass-decision vs artifact-lifecycle), same pipeline.

Does not prescribe: specific N / M numbers, what counts as a "boundary," which pipelines need a bypass at all — repo-shaped (Tier 2).
