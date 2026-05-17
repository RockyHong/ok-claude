# Attention is North Star — WIP draft

---

# Attention is North Star

The single care. Every harness rule derives from this.

## What an agent is

Three layers:

- **LLM** — cold model substrate.
- **Context** — loaded payload at session start.
- **Agent** — LLM + context + goal anchor.
  Attention + execution = path A→B (anchor set → deliver).

## Human vs Agent — complementary, by construction

| | Human | Agent |
|---|---|---|
| **Substrate** | Persistent instance, accumulated experience | Ephemeral context, hot-loadable knowledge |
| **Strength** | Guts, first-principle care, blind-spot intuition | Needle-find, cognitive-load-free read, switchable focus |
| **Weakness** | Bias, can't selectively forget, unnoticed drift | No experience, attention drift on bloat, no unconscious gut |
| **Authority** | Sets goal, picks blind spots, owns first-principle | Executes within crystal goal, surfaces what human bias hides |

Different by construction. Features, not bugs.

## Harness scope

Harness = agent-side discipline. Serves human's goal, protects agent's attention. Human-side drift = user problem, out of scope here.

## SoC = attention boundary distribution

Separation of concerns = how attention gets divided cleanly across containers. Each container owns one goal-anchor. No bleed.

## Atomic = one container, one goal

A unit of work (session, subagent, skill invocation) holds one goal. One container = one anchor = one trajectory.

## NEVER DRIFT — hard guardrail

Drift = context break = SoC violation = atomic breach.

Detect → act:

- **Park** — write state + halt.
- **Pivot** — close container, open new one with crystal goal.
- **Bounce** — re-anchor to original goal.

Hold one goal per container. Mid-container goal hopping = breach — even in main session — because prior context becomes noise + pollution; attention degrades.

That's why:

- **Compact-arg matters** — anchors next session's goal.
- **Docs matter** — cold factual state, shared memory across context breaks.
- **Skill / subagent dispatch matters** — splits goals across clean containers when one can't hold both.

All serves attention.

## Boundary

Applies to: any harness organizing agent work.

Does not prescribe: drift-detection mechanics (skill territory), goal-anchor format (Tier 2), human-side discipline (out of scope). Agent shapes (skill / subagent / gateway) live in `agent-shapes.md`.
