# Single Source of Truth

Two coupled rules. **One truth**: each piece of information lives in exactly one location. **Clear pillars**: each pillar/file/section owns a well-defined scope so a new fact has an unambiguous home.

Without pillars, SSoT collapses — new info lands in the nearest convenient file, ownership fragments, drift returns. Without SSoT, pillars duplicate across themselves. Both are needed.

Upstream of `doc-impact-mirror.md`.

## Test

> "Does this information live in exactly one place AND does the place that owns it have a clear, named scope?"

- Yes to both → SSoT.
- One-place but unclear ownership → next contributor adds a parallel copy elsewhere.
- Clear pillars but content duplicated → drift.

## Patterns

- **Canonical doc + pointer stubs** — one full description; other docs reference. Canonical doc's scope = its title/section.
- **Index + entries** — index lists items; per-item file owns its content. Index owns "what exists"; entry owns "how it works".
- **Generated artifact + source** — source canonical for behavior; derivative regenerates. Never hand-edit derivative.
- **Named pillars** — each file/folder carries a scope statement (header, README, frontmatter) that an outsider can read to know what belongs there and what doesn't.

## When duplication is acceptable

- **Format constraints** — small TL;DR + Tier 1 pointer in a look-up doc. Keep TL;DR small and stable.
- **Different audiences** — marketing one-liner + engineering spec describe the same thing differently. Both canonical for their audience.
- **Cost of cross-ref exceeds drift risk** — a constant repeated in two adjacent lines doesn't need extraction.

## Failure modes

- N copies of the same paragraph in N docs → silent drift after first edit.
- Canonical doc updated but pointer stubs describe old behavior → stub readers miss the update.
- Generated artifact hand-edited → next regeneration wipes it.
- New fact has no obvious owner → lands in nearest file, scope grows mushy, future writers add own copies.
- Pillar scope drifts (folder grows beyond its name) → discoverability degrades; SSoT search starts missing canonical locations.

## Boundary

Applies to: any project where information is referenced in multiple contexts AND where contributors need to find or place new information without grep-then-pray.

Does not prescribe: pillar shape (folder / file / section), pointer syntax, index format, regeneration mechanism — repo-shaped (Tier 2).
