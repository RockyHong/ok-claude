# Harness Guidelines — Tier 1 Subcategory

Universal principles for how Claude is wired into a project — meta-instructions, gateway/subagent architecture, harness MD shape, agent design philosophy, pipeline patterns.

Part of the [`.claude/guidelines/`](../index.md) tree. See sibling [`work-discipline/`](../work-discipline/index.md) for Claude-at-work rules.

## Principles

| Principle | Summary | File |
|---|---|---|
| AI is not a human org | Human-vs-AI brain table, one-person model (hats/hands/docs), subagents are context windows not people. | [`ai-not-human-org.md`](ai-not-human-org.md) |
| Hats and hands | Gateway wears hats (skills) for thinking, spawns hands (subagents) for execution. Decision test, topic-lock discipline, when-not-to-spawn boundary. | [`hats-and-hands.md`](hats-and-hands.md) |
| Harness MD discipline | Harness MDs carry principle/rule only. Cut test, layer routing (two firing axes), no-precedent rule, positive-over-negative phrasing, agent-mirror gating, verification discipline, when-not-to-extract boundary. | [`harness-md-discipline.md`](harness-md-discipline.md) |
| Gateway boundary discipline | Gateway = horizontal orchestration; hand = vertical depth. Dispatch decision sits on the axis. Failure mode: lossy second-hand edits. | [`gateway-boundary-discipline.md`](gateway-boundary-discipline.md) |
| Pipeline state = file presence | Pipeline state reconstructs from file presence, not status fields. Session-safe test, atomic transitions, no conversation dependency. | [`pipeline-state-file-presence.md`](pipeline-state-file-presence.md) |

## See also (work-discipline tree)

Commonly referenced from harness contexts:

- [`work-discipline/single-source-of-truth.md`](../work-discipline/single-source-of-truth.md) — info-placement discipline; upstream of doc-impact-mirror.
- [`work-discipline/doc-impact-mirror.md`](../work-discipline/doc-impact-mirror.md) — anti-drift when editing docs that ripple.
