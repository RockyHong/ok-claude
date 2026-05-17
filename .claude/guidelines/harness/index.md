# Harness Guidelines — Tier 1 Subcategory

Universal principles for how Claude is wired into a project — meta-instructions, gateway/subagent architecture, harness MD shape, agent design philosophy, pipeline patterns.

Part of the [`.claude/guidelines/`](../index.md) tree. See sibling [`work-discipline/`](../work-discipline/index.md) for Claude-at-work rules.

## Principles

| Principle | Summary | File |
|---|---|---|
| Attention is north star | Apex philosophy. Agent = LLM + context + goal anchor. Human/Agent complementary by construction. SoC = attention boundary distribution. Atomic = one container, one goal. NEVER DRIFT — park / pivot / bounce. | [`attention-is-north-star.md`](attention-is-north-star.md) |
| Agent shapes | Three units compose every harness. Skill = portable knowledge/procedure (universal invocation surface). Subagent = atomic attention container (dispatch by attention-fit). Gateway = horizontal orchestrator (dispatch lanes, failure modes). | [`agent-shapes.md`](agent-shapes.md) |
| Harness MD discipline | Harness MDs carry principle/rule only. Cut test, layer routing (two firing axes), no-precedent rule, positive-over-negative phrasing, agent-mirror gating, verification discipline, when-not-to-extract boundary. | [`harness-md-discipline.md`](harness-md-discipline.md) |
| Skill authoring | How to author a skill so it stays portable. Project-agnostic body, clear IO contract, exclude bias inputs, return questions on incomplete context, topic-lock deep skills. Classification: doer (executor) vs thinker (reasoner). | [`skill-authoring.md`](skill-authoring.md) |
| Pipeline state = file presence | Pipeline state reconstructs from file presence, not status fields. Session-safe test, atomic transitions, no conversation dependency. | [`pipeline-state-file-presence.md`](pipeline-state-file-presence.md) |
| Pipeline handoff | Every pipeline artifact has three roles (creator / consumer / cleaner) — undefined roles produce orphans. Verify before cleanup; align upstream with reality before deleting evidence. | [`pipeline-handoff.md`](pipeline-handoff.md) |
| Pipeline escape hatches | Bypass criteria are mechanical (countable, checkable without judgment), not interpretive. Vague gates collapse under pressure. | [`pipeline-escape-hatches.md`](pipeline-escape-hatches.md) |
| Escalation design | When blocked, surface with context — never silently deviate. Three-part surface (what / expected / options). Escalation patterns. Categories that require human authority (business / risk / preference / private context). | [`escalation-design.md`](escalation-design.md) |

## See also (work-discipline tree)

Commonly referenced from harness contexts:

- [`work-discipline/single-source-of-truth.md`](../work-discipline/single-source-of-truth.md) — info-placement discipline; upstream of doc-impact-mirror.
- [`work-discipline/doc-impact-mirror.md`](../work-discipline/doc-impact-mirror.md) — anti-drift when editing docs that ripple.
