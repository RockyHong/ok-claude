# Skill Authoring

`agent-shapes.md` defines what a skill IS. This file defines how to author one well so it stays useful across consumers, contexts, and conversation lengths.

## Adopted rules

- **Project-agnostic.** Zero hardcoded project knowledge inside the skill body. Pure technique that works for any consumer. Project context is the caller's responsibility — passed in via argument or skill input, not baked into the skill.
- **Clear input/output contract.** Define what the caller must provide and what the skill returns. Vague contracts cause callers to feed wrong inputs, then blame the skill for bad output.
- **Specify what NOT to feed in.** Some inputs create rationalization bias — a reviewer skill given the author's defense will defend; an evaluation skill given the seller's pitch will favor. Explicitly exclude inputs that corrupt the skill's objectivity.
- **Incomplete context → return questions, not guesses.** If the skill lacks context for valid results, surface questions to the caller. Silent guessing produces plausible-looking wrong output that the caller trusts.
- **Topic-locked beats open mode-switch.** See `agent-shapes.md` § Skill / Atomic shape preference. Skills that load heavy context should require an argument, run a short focused burst, and persist output to a file. Open mode-switch skills degrade as conversation grows — skill context compacts while ambient context persists.

## Classification — doer vs thinker

Skill output shapes split along one axis: does the work require *judgment* or just *execution*?

| Shape | Output requires | Variance | Prompt size | Test |
|---|---|---|---|---|
| **Doer** | Run steps, format result | Low — same structure every time | Small — checklist of tool calls | "Can the prompt be written as a checklist of tool calls with string formatting?" → yes |
| **Thinker** | Interpret what files *mean*, synthesize, decide | High — shape depends on what's found | Substantial — reasoning framework, heuristics | Prompt needs words like "evaluate," "assess," "decide," "synthesize," "interpret" → yes |

Both are legitimate. Forcing a doer into thinker shape adds ceremony; forcing a thinker into doer shape collapses judgment to checklist.

Gray-zone test: if the work both reads files AND produces deterministic-format output, the reasoning requirement dominates — treat as thinker.

## Failure modes

- Skill name promises judgment, body executes a fixed checklist → caller expects analysis, gets template. Rename or reshape.
- Skill silently absorbs project knowledge over time ("just one more project-specific tweak") → no longer portable. Strip back to pure technique; project context moves to caller.
- Skill loaded into long conversation expected to mode-shape across many turns → skill context fades on compact, behavior drifts silently. Topic-lock instead.
- Skill accepts biased input without exclusion clause → rationalization output, caller can't tell it's compromised.

## Boundary

Applies to: any skill authored for cross-consumer reuse (Tier 1 lore tree, plugin-bundled, served catalogs).

Does not prescribe: skill file format, frontmatter schema, invocation syntax — repo/runtime-shaped (Tier 2). The doer/thinker distinction is a cognitive shape claim, not a tooling claim — applies regardless of whether the runtime calls them "skills," "commands," or "tools."
