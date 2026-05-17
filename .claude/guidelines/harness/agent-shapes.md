# Agent Shapes — WIP draft

---

# Agent Shapes

Three shapes compose every harness: **Skill**, **Subagent**, **Gateway**. Derive from `attention-is-north-star.md` apex.

Relational chain:

```
Skill    = portable knowledge/procedure unit
            ↓ invoked by ↓
Subagent = atomic attention container
            ↓ spawned by ↓
Gateway  = orchestrator agent, owns user thread
```

---

## Skill

Portable knowledge/procedure unit. Plug-and-play. Triggered on demand.

### Shapes

- **Knowledge** — domain or cross-domain content, loaded when relevant.
- **Procedure** — action steps or methodology, executed when invoked.
- Often both.

### Invocation surfaces — universal, no agent affinity

- **User** — explicit trigger (`/skill-name args` or natural language).
- **Gateway** — intent-matched dispatch via Skill tool.
- **Subagent** — loaded into focused context or invoked during execution.

### When IS a skill

- Reusable across contexts (not one-shot).
- Has triggerable name (callable as unit).
- Worth lifting from inline conversation (high signal, repeat use).

### When NOT a skill

- Always-fires every turn → `CLAUDE.md` / rules layer (ambient discipline).
- Cold reference lore → `guidelines/` (read-only library).
- Domain content → docs (read on demand, not callable).
- One-shot inline reasoning → just do it.

### Atomic shape preference

**Topic-locked > open mode-switched.**

- **Topic-locked** — argument + short burst + persist output to file.
  Matches NEVER DRIFT: atomic, one goal, anchor persists past container.
- **Open mode-switched** — attention shaping across many turns.
  Drifts as conversation grows; skill context fades on compact.

Prefer topic-locked unless persistent attention shaping genuinely earns the slot.

---

## Subagent

Atomic attention container. Spawned with crystal goal. Disposable. Parallel-safe.

### Shape

- **Context-clean** — fresh window, no inherited conversation noise.
- **Goal-anchored** — single crystal-clear objective at spawn.
- **Atomic** — one container, one goal, one trajectory.
- **Disposable** — discarded after delivery; no persistence.

### Why spawn

- **Context protection** — heavy reads / verbose work stay out of orchestrator.
- **Focused execution** — clean context + tight prompt beats cluttered context after many turns.
- **Parallel work** — independent goals run simultaneously.
- **Goal isolation** — when current container's goal can't cleanly hold the new goal, spawning protects attention.

### Dispatch test

> Can the current container hold this goal cleanly, or does spawning protect attention better?

- Current container holds cleanly → inline, no spawn.
- Spawn protects attention → dispatch.

Direction (vertical depth vs horizontal scan) does not decide. Attention-fit decides.

### Vertical OR horizontal — both valid

- **Vertical** — deep dive in one domain (focused technical decision).
- **Horizontal** — broad search across many files/sources (network-aware lookup).
- Common ground: context-clean + crystal goal + atomic. Not direction.

### When NOT to spawn

- Answerable from current context → don't spawn for what you already know.
- Small lookup orchestrator can do directly with Grep/Read → inline.
- One-shot reasoning with clear path → inline.

### Subagent ≠ person

Same model. Different context window. Value is not expertise — it is clean attention + isolated trajectory. Disposable focused instance, not a coworker.

---

## Gateway

Horizontal orchestrator agent. Owns the user-facing thread. Broad context awareness across the session — sees the whole work, routes between artifacts and atomic containers (subagents) and on-demand units (skills).

Itself an agent — same substrate (LLM + context + goal anchor). Role-typed by shape (horizontal, cross-cutting) and surface (user-thread owner), not seniority.

### Responsibilities

- **User-thread ownership** — single surface user talks to.
- **Dispatch decisions** — when to spawn subagent, when to invoke skill, when to edit directly.
- **Integration** — fold subagent outputs back into the thread; surface decisions to user.
- **Anchor maintenance** — re-state goal across sub-tasks; bounce on drift.

### Dispatch lanes

| Work shape | Action | Why |
|---|---|---|
| Orchestration (connecting, routing, sequencing, light edit) | Direct edit | Container holds it cleanly; no attention gain from spawning. |
| New atomic goal | Spawn subagent | Subagent dispatch test applies (see above). |
| Triggerable knowledge/procedure matches intent | Invoke skill | Skill loads on demand; plug-and-play. |
| Goal-set / blind-spot / first-principle | Surface to user | Human authority decides. |

### Failure modes

- **Second-hand vertical edits** — gateway hand-writes depth content captured from a subagent summary. Lossy: direct domain observation degrades through orchestrator paraphrase. Dispatch instead.
- **Goal hoarding** — too many goals held in one container. Drift. Park or split.
- **Drift unnoticed** — orchestrator loses anchor mid-session. Re-read plan/anchor file; bounce.
- **Skipping user surface** — gateway makes goal-level / first-principle calls silently. Human authority bypassed.

### Gateway ≠ boss

Orchestrator role, not seniority. Subagents are not subordinates — they are clean-context atomic containers. Gateway = the agent that owns the user thread; nothing more.

---

## Boundary

Applies to: any harness organizing Claude work with gateway + subagent + skill primitives.

Does not prescribe: agent names beyond these three shapes (CTO/CPO/etc roles = Tier 2), tool allocation per subagent, specific skill triggers, plugin vs MCP routing.
