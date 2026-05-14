# Work Discipline — Tier 1 Subcategory

Universal principles for how Claude behaves at the work moment — tool-use safety, doc/info hygiene, AI-product integration patterns, cross-cutting craft rules.

Part of the [`.claude/guidelines/`](../index.md) tree. See sibling [`harness/`](../harness/index.md) for harness wiring + agent architecture rules.

## Principles

| Principle | Summary | File |
|---|---|---|
| Single source of truth | Two coupled rules: one truth (each fact lives in one place) + clear pillars (each location owns a named scope). Upstream of doc-impact-mirror. | [`single-source-of-truth.md`](single-source-of-truth.md) |
| Doc Impact mirror | Work-scope artifact lists adjacent docs that may need updates. Implementer mirrors or records "confirmed unchanged." Anti-drift at change-time. | [`doc-impact-mirror.md`](doc-impact-mirror.md) |
| Edit discipline (renames & replace-all) | `replace_all` is naive whole-file string replace; corrupts on common identifiers. LSP-first preference order, banned-terms list, pre-flight checklist, slip-through recovery. | [`edit-discipline.md`](edit-discipline.md) |
